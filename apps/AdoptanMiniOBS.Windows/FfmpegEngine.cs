using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Media.Imaging;

namespace AdoptanMiniOBS;

public sealed class FfmpegEngine : IAsyncDisposable
{
    public const string IPhoneHlsUrl =
        "https://api.adoptan.ai/screen-hls/studio/lucia/index.m3u8";

    private readonly string _ffmpegPath;
    private Process? _process;
    private CancellationTokenSource? _readerCancellation;
    private string _secretToRedact = "";

    public event Action<BitmapImage>? PreviewFrame;
    public event Action<string>? StatusMessage;
    public event Action<int>? ProcessExited;

    public bool IsRunning => _process is { HasExited: false };
    public bool IsLive { get; private set; }

    public FfmpegEngine()
    {
        _ffmpegPath = Path.Combine(AppContext.BaseDirectory, "ffmpeg.exe");
    }

    public bool IsInstalled => File.Exists(_ffmpegPath);

    public async Task<IReadOnlyList<string>> ListAudioDevicesAsync()
    {
        if (!IsInstalled) return [];
        var startInfo = CreateStartInfo();
        AddArguments(startInfo, [
            "-hide_banner",
            "-list_devices", "true",
            "-f", "dshow",
            "-i", "dummy"
        ]);

        using var process = Process.Start(startInfo);
        if (process is null) return [];
        var stderr = await process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        var devices = new List<string>();
        var pattern = new Regex("\"(?<name>[^\"]+)\"\\s*\\(audio\\)", RegexOptions.IgnoreCase);
        foreach (Match match in pattern.Matches(stderr))
        {
            var name = match.Groups["name"].Value.Trim();
            if (name.Length > 0 && !devices.Contains(name, StringComparer.OrdinalIgnoreCase))
                devices.Add(name);
        }
        return devices;
    }

    public async Task StartPreviewAsync(StreamConfiguration configuration)
    {
        await StopAsync();
        IsLive = false;
        _secretToRedact = "";
        await StartProcessAsync(configuration, live: false);
    }

    public async Task StartLiveAsync(StreamConfiguration configuration)
    {
        await StopAsync();
        IsLive = true;
        _secretToRedact = configuration.StreamKey;
        await StartProcessAsync(configuration, live: true);
    }

    public async Task StopAsync()
    {
        var process = _process;
        _process = null;
        _readerCancellation?.Cancel();
        _readerCancellation?.Dispose();
        _readerCancellation = null;

        if (process is null) return;
        try
        {
            if (!process.HasExited)
            {
                try
                {
                    await process.StandardInput.WriteLineAsync("q");
                    await process.StandardInput.FlushAsync();
                }
                catch
                {
                    // FFmpeg may already be closing.
                }

                var exited = process.WaitForExitAsync();
                if (await Task.WhenAny(exited, Task.Delay(2500)) != exited && !process.HasExited)
                    process.Kill(entireProcessTree: true);
            }
        }
        finally
        {
            process.Dispose();
            IsLive = false;
        }
    }

    private async Task StartProcessAsync(StreamConfiguration configuration, bool live)
    {
        if (!IsInstalled)
            throw new FileNotFoundException("ffmpeg.exe manque dans le dossier de l’application.");

        var startInfo = CreateStartInfo();
        var arguments = BuildArguments(configuration, live);
        AddArguments(startInfo, arguments);

        var process = new Process { StartInfo = startInfo, EnableRaisingEvents = true };
        process.Exited += (_, _) =>
        {
            var code = process.ExitCode;
            ProcessExited?.Invoke(code);
        };
        if (!process.Start())
            throw new InvalidOperationException("Impossible de démarrer le moteur vidéo.");

        _process = process;
        _readerCancellation = new CancellationTokenSource();
        _ = ReadMjpegAsync(process.StandardOutput.BaseStream, _readerCancellation.Token);
        _ = ReadErrorsAsync(process.StandardError, _readerCancellation.Token);
        await Task.Delay(150);

        if (process.HasExited)
            throw new InvalidOperationException(
                "La caméra iPhone n’est pas encore disponible. Connecte-la puis réessaie."
            );

        StatusMessage?.Invoke(
            live
                ? "Encodeur démarré, connexion au serveur…"
                : "Aperçu démarré. La latence iPhone normale est d’environ 1 à 3 secondes."
        );
    }

    private ProcessStartInfo CreateStartInfo() => new()
    {
        FileName = _ffmpegPath,
        UseShellExecute = false,
        RedirectStandardInput = true,
        RedirectStandardOutput = true,
        RedirectStandardError = true,
        CreateNoWindow = true,
        StandardErrorEncoding = Encoding.UTF8
    };

    private static void AddArguments(ProcessStartInfo startInfo, IEnumerable<string> arguments)
    {
        foreach (var argument in arguments)
            startInfo.ArgumentList.Add(argument);
    }

    private static IReadOnlyList<string> BuildArguments(StreamConfiguration c, bool live)
    {
        var args = new List<string>
        {
            "-hide_banner",
            "-loglevel", "warning",
            "-nostats",
            "-thread_queue_size", "1024",
            "-f", "gdigrab",
            "-framerate", c.FrameRate.ToString(CultureInfo.InvariantCulture),
            "-draw_mouse", c.ShowCursor ? "1" : "0",
            "-offset_x", c.Display.Bounds.X.ToString(CultureInfo.InvariantCulture),
            "-offset_y", c.Display.Bounds.Y.ToString(CultureInfo.InvariantCulture),
            "-video_size", $"{c.Display.Bounds.Width}x{c.Display.Bounds.Height}",
            "-i", "desktop",
            "-thread_queue_size", "1024",
            "-rw_timeout", "15000000",
            "-reconnect", "1",
            "-reconnect_streamed", "1",
            "-reconnect_delay_max", "2",
            "-i", IPhoneHlsUrl
        };

        var audioInputs = new List<int> { 1 };
        var nextInput = 2;
        foreach (var device in new[] { c.Microphone, c.SystemAudio })
        {
            if (string.IsNullOrWhiteSpace(device.DeviceName)) continue;
            args.AddRange([
                "-thread_queue_size", "1024",
                "-f", "dshow",
                "-audio_buffer_size", "50",
                "-i", $"audio={device.DeviceName}"
            ]);
            audioInputs.Add(nextInput++);
        }

        var filter = BuildFilter(c, live, audioInputs);
        args.AddRange(["-filter_complex", filter]);

        if (live)
        {
            var outputUrl = JoinRtmp(c.ServerUrl, c.StreamKey);
            args.AddRange([
                "-map", "[vstream]",
                "-map", "[aout]",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-tune", "zerolatency",
                "-profile:v", "high",
                "-pix_fmt", "yuv420p",
                "-r", c.FrameRate.ToString(CultureInfo.InvariantCulture),
                "-g", (c.FrameRate * 2).ToString(CultureInfo.InvariantCulture),
                "-keyint_min", (c.FrameRate * 2).ToString(CultureInfo.InvariantCulture),
                "-sc_threshold", "0",
                "-b:v", $"{c.VideoBitrateKbps}k",
                "-minrate", $"{c.VideoBitrateKbps}k",
                "-maxrate", $"{c.VideoBitrateKbps}k",
                "-bufsize", $"{c.VideoBitrateKbps * 2}k",
                "-c:a", "aac",
                "-b:a", $"{c.AudioBitrateKbps}k",
                "-ar", "48000",
                "-ac", "2",
                "-flvflags", "no_duration_filesize",
                "-f", "flv",
                outputUrl,
                "-map", "[vpreview]",
                "-an",
                "-c:v", "mjpeg",
                "-q:v", "7",
                "-f", "image2pipe",
                "pipe:1"
            ]);
        }
        else
        {
            args.AddRange([
                "-map", "[vpreview]",
                "-an",
                "-c:v", "mjpeg",
                "-q:v", "7",
                "-f", "image2pipe",
                "pipe:1"
            ]);
        }

        return args;
    }

    private static string BuildFilter(
        StreamConfiguration c,
        bool live,
        IReadOnlyList<int> audioInputs
    )
    {
        var width = c.Resolution.Width;
        var height = c.Resolution.Height;
        var fps = c.FrameRate;
        var parts = new List<string>
        {
            $"[0:v]fps={fps},scale={width}:{height}:force_original_aspect_ratio=decrease," +
            $"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1[screen]"
        };

        var phoneEffects = new List<string> { $"fps={fps}" };
        if (c.MirrorCamera) phoneEffects.Add("hflip");
        if (c.RotateCamera) phoneEffects.AddRange(["hflip", "vflip"]);
        parts.Add($"[1:v]{string.Join(',', phoneEffects)}[phonebase]");

        switch (c.Scene.Id)
        {
            case "screen":
                parts.Add("[screen]null[vbase]");
                break;

            case "camera":
                parts.Add(
                    $"[phonebase]scale={width}:{height}:force_original_aspect_ratio=increase," +
                    $"crop={width}:{height},setsar=1[vbase]"
                );
                break;

            case "camera-screen":
            {
                var pipWidth = Math.Max(240, width * c.PipPercent / 100);
                var pipHeight = pipWidth * 9 / 16;
                var coordinates = OverlayCoordinates(c.Position.Id, 24);
                parts.Add(
                    $"[phonebase]scale={width}:{height}:force_original_aspect_ratio=increase," +
                    $"crop={width}:{height},setsar=1[cameramain]"
                );
                parts.Add(
                    $"[screen]scale={pipWidth}:{pipHeight}:force_original_aspect_ratio=decrease," +
                    $"pad={pipWidth}:{pipHeight}:(ow-iw)/2:(oh-ih)/2:black[screenpip]"
                );
                parts.Add($"[cameramain][screenpip]overlay={coordinates}:format=auto[vbase]");
                break;
            }

            case "split":
            {
                var half = width / 2;
                parts.Add(
                    $"[screen]scale={half}:{height}:force_original_aspect_ratio=decrease," +
                    $"pad={half}:{height}:(ow-iw)/2:(oh-ih)/2:black[left]"
                );
                parts.Add(
                    $"[phonebase]scale={half}:{height}:force_original_aspect_ratio=increase," +
                    $"crop={half}:{height},setsar=1[right]"
                );
                parts.Add("[left][right]hstack=inputs=2[vbase]");
                break;
            }

            default:
            {
                var pipWidth = Math.Max(240, width * c.PipPercent / 100);
                var pipHeight = pipWidth * 9 / 16;
                var coordinates = OverlayCoordinates(c.Position.Id, 24);
                parts.Add(
                    $"[phonebase]scale={pipWidth}:{pipHeight}:force_original_aspect_ratio=increase," +
                    $"crop={pipWidth}:{pipHeight},setsar=1[phonepip]"
                );
                parts.Add($"[screen][phonepip]overlay={coordinates}:format=auto[vbase]");
                break;
            }
        }

        if (live)
            parts.Add("[vbase]split=2[vstream][previewbase]");
        else
            parts.Add("[vbase]null[previewbase]");
        parts.Add("[previewbase]fps=8,scale=640:-2:flags=fast_bilinear[vpreview]");

        if (live)
        {
            var audioLabels = new List<string>();
            foreach (var input in audioInputs)
            {
                var label = $"audio{input}";
                parts.Add($"[{input}:a]aresample=async=1:first_pts=0,volume=1[{label}]");
                audioLabels.Add($"[{label}]");
            }
            parts.Add(
                $"{string.Concat(audioLabels)}amix=inputs={audioLabels.Count}:" +
                "duration=longest:dropout_transition=2,aresample=48000[aout]"
            );
        }

        return string.Join(';', parts);
    }

    private static string OverlayCoordinates(string position, int margin) => position switch
    {
        "top-left" => $"{margin}:{margin}",
        "top-right" => $"W-w-{margin}:{margin}",
        "bottom-left" => $"{margin}:H-h-{margin}",
        _ => $"W-w-{margin}:H-h-{margin}"
    };

    private static string JoinRtmp(string server, string key) =>
        $"{server.Trim().TrimEnd('/')}/{key.Trim()}";

    private async Task ReadErrorsAsync(StreamReader reader, CancellationToken cancellationToken)
    {
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                var line = await reader.ReadLineAsync(cancellationToken);
                if (line is null) break;
                if (!string.IsNullOrEmpty(_secretToRedact))
                    line = line.Replace(_secretToRedact, "[clé masquée]", StringComparison.Ordinal);

                if (Regex.IsMatch(
                    line,
                    "error|failed|refused|unauthorized|forbidden|not found|timed out|404",
                    RegexOptions.IgnoreCase
                ))
                    StatusMessage?.Invoke(FriendlyFfmpegError(line));
            }
        }
        catch (OperationCanceledException)
        {
        }
    }

    private async Task ReadMjpegAsync(Stream stream, CancellationToken cancellationToken)
    {
        var frame = new MemoryStream(128_000);
        var inFrame = false;
        var previous = -1;
        var oneByte = new byte[1];

        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                var read = await stream.ReadAsync(oneByte, cancellationToken);
                if (read == 0) break;
                var current = oneByte[0];

                if (!inFrame)
                {
                    if (previous == 0xFF && current == 0xD8)
                    {
                        inFrame = true;
                        frame.SetLength(0);
                        frame.WriteByte(0xFF);
                        frame.WriteByte(0xD8);
                    }
                    previous = current;
                    continue;
                }

                frame.WriteByte(current);
                if (previous == 0xFF && current == 0xD9)
                {
                    var data = frame.ToArray();
                    var bitmap = new BitmapImage();
                    using var imageStream = new MemoryStream(data);
                    bitmap.BeginInit();
                    bitmap.CacheOption = BitmapCacheOption.OnLoad;
                    bitmap.StreamSource = imageStream;
                    bitmap.EndInit();
                    bitmap.Freeze();
                    PreviewFrame?.Invoke(bitmap);
                    inFrame = false;
                    frame.SetLength(0);
                }

                if (frame.Length > 4_000_000)
                {
                    inFrame = false;
                    frame.SetLength(0);
                }
                previous = current;
            }
        }
        catch (OperationCanceledException)
        {
        }
        finally
        {
            frame.Dispose();
        }
    }

    private static string FriendlyFfmpegError(string line)
    {
        if (line.Contains("404", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("not found", StringComparison.OrdinalIgnoreCase))
            return "Caméra iPhone hors ligne. Ouvre le lien sur l’iPhone et connecte la caméra.";
        if (line.Contains("unauthorized", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("forbidden", StringComparison.OrdinalIgnoreCase))
            return "Clé Kick/Twitch refusée ou liaison iPhone non autorisée.";
        if (line.Contains("refused", StringComparison.OrdinalIgnoreCase) ||
            line.Contains("timed out", StringComparison.OrdinalIgnoreCase))
            return "Connexion réseau interrompue. Vérifie le Wi‑Fi de l’iPhone et Internet.";
        return line.Length > 260 ? $"{line[..260]}…" : line;
    }

    public async ValueTask DisposeAsync() => await StopAsync();
}
