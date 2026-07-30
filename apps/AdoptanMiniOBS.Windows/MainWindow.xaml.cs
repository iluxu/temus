using QRCoder;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Forms = System.Windows.Forms;

namespace AdoptanMiniOBS;

public partial class MainWindow : Window
{
    private const string IPhonePage = "https://adoptan.ai/iphone-camera";
    private readonly FfmpegEngine _engine = new();
    private bool _closing;
    private bool _expectedStop;

    private readonly ResolutionOption[] _resolutions =
    [
        new("960 × 540", 960, 540, 2500),
        new("1280 × 720", 1280, 720, 3500),
        new("1920 × 1080", 1920, 1080, 5500)
    ];

    private readonly SceneOption[] _scenes =
    [
        new("screen-camera", "Écran + caméra iPhone"),
        new("screen", "Écran seul"),
        new("camera", "Caméra iPhone seule"),
        new("camera-screen", "Caméra + écran"),
        new("split", "Duo côte à côte")
    ];

    private readonly PositionOption[] _positions =
    [
        new("top-left", "Haut gauche"),
        new("top-right", "Haut droite"),
        new("bottom-left", "Bas gauche"),
        new("bottom-right", "Bas droite")
    ];

    private readonly PlatformOption[] _platforms =
    [
        new("kick", "Kick", "rtmps://fa723fc1b171.global-contribute.live-video.net:443/app"),
        new("twitch", "Twitch", "rtmps://live.twitch.tv:443/app"),
        new("custom", "RTMP personnalisé", "")
    ];

    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_OnLoaded;
        Closing += MainWindow_OnClosing;

        _engine.PreviewFrame += frame => Dispatcher.InvokeAsync(() =>
        {
            PreviewImage.Source = frame;
            PreviewPlaceholder.Visibility = Visibility.Collapsed;
        });
        _engine.StatusMessage += message => Dispatcher.InvokeAsync(() => SetMessage(message));
        _engine.ProcessExited += code => Dispatcher.InvokeAsync(() => OnEngineExited(code));
    }

    private async void MainWindow_OnLoaded(object sender, RoutedEventArgs e)
    {
        DisplayCombo.ItemsSource = Forms.Screen.AllScreens
            .Select((screen, index) =>
                new DisplaySource(
                    screen.Primary ? "Écran principal" : $"Écran {index + 1}",
                    screen.Bounds
                )
            )
            .ToArray();
        DisplayCombo.SelectedIndex = 0;

        ResolutionCombo.ItemsSource = _resolutions;
        ResolutionCombo.SelectedIndex = 1;
        SceneCombo.ItemsSource = _scenes;
        SceneCombo.SelectedIndex = 0;
        PositionCombo.ItemsSource = _positions;
        PositionCombo.SelectedIndex = 3;
        FrameRateCombo.ItemsSource = new[] { 24, 30, 60 };
        FrameRateCombo.SelectedItem = 30;
        AudioBitrateCombo.ItemsSource = new[] { 96, 128, 160, 192 };
        AudioBitrateCombo.SelectedItem = 160;
        PlatformCombo.ItemsSource = _platforms;
        PlatformCombo.SelectedIndex = 0;

        if (!_engine.IsInstalled)
        {
            SetMessage("ffmpeg.exe manque. Retélécharge l’archive complète de la release.", error: true);
            PreviewButton.IsEnabled = false;
            LiveButton.IsEnabled = false;
            return;
        }

        await RefreshAudioDevicesAsync();
        SetMessage("Colle la clé privée, scanne le QR et connecte la caméra iPhone.");
        UpdateQualitySummary();
    }

    private async Task RefreshAudioDevicesAsync()
    {
        SetMessage("Recherche des périphériques audio Windows…");
        var devices = await _engine.ListAudioDevicesAsync();
        var items = new List<AudioDeviceOption> { new(null, "Aucun — audio iPhone uniquement") };
        items.AddRange(devices.Select(name => new AudioDeviceOption(name, name)));
        MicrophoneCombo.ItemsSource = items;
        SystemAudioCombo.ItemsSource = items;
        MicrophoneCombo.SelectedIndex = 0;
        SystemAudioCombo.SelectedIndex = 0;
        SetMessage(
            devices.Count == 0
                ? "Aucun périphérique DirectShow trouvé. Le micro de l’iPhone reste disponible."
                : $"{devices.Count} périphérique(s) audio détecté(s)."
        );
    }

    private void IPhoneKeyBox_OnPasswordChanged(object sender, RoutedEventArgs e)
    {
        var link = BuildPhoneLink();
        if (link is null)
        {
            QrImage.Source = null;
            return;
        }

        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(link, QRCodeGenerator.ECCLevel.Q);
        var png = new PngByteQRCode(data).GetGraphic(12);
        using var stream = new MemoryStream(png);
        var image = new BitmapImage();
        image.BeginInit();
        image.CacheOption = BitmapCacheOption.OnLoad;
        image.StreamSource = stream;
        image.EndInit();
        image.Freeze();
        QrImage.Source = image;
    }

    private void CopyPhoneLinkButton_OnClick(object sender, RoutedEventArgs e)
    {
        var link = BuildPhoneLink();
        if (link is null)
        {
            SetMessage("Colle d’abord la clé privée adoptan.ai.", error: true);
            return;
        }
        System.Windows.Clipboard.SetText(link);
        SetMessage("Lien iPhone copié. Envoie-le ou ouvre-le avec l’appareil photo de l’iPhone.");
    }

    private void OpenPhoneLinkButton_OnClick(object sender, RoutedEventArgs e)
    {
        var link = BuildPhoneLink();
        if (link is null)
        {
            SetMessage("Colle d’abord la clé privée adoptan.ai.", error: true);
            return;
        }
        Process.Start(new ProcessStartInfo(link) { UseShellExecute = true });
    }

    private string? BuildPhoneLink()
    {
        var key = IPhoneKeyBox.Password.Trim();
        return key.Length == 0 ? null : $"{IPhonePage}?key={Uri.EscapeDataString(key)}";
    }

    private async void RefreshAudioButton_OnClick(object sender, RoutedEventArgs e) =>
        await RefreshAudioDevicesAsync();

    private void PipSizeSlider_OnValueChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
    {
        if (PipSizeLabel is not null)
            PipSizeLabel.Text = $"{Math.Round(e.NewValue)} %";
    }

    private void VideoBitrateSlider_OnValueChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
    {
        if (VideoBitrateLabel is not null)
            VideoBitrateLabel.Content = $"Vidéo : {Math.Round(e.NewValue)} kb/s";
        UpdateQualitySummary();
    }

    private void ResolutionCombo_OnSelectionChanged(
        object sender,
        System.Windows.Controls.SelectionChangedEventArgs e
    )
    {
        if (ResolutionCombo.SelectedItem is ResolutionOption resolution &&
            VideoBitrateSlider is not null)
            VideoBitrateSlider.Value = resolution.BitrateKbps;
        UpdateQualitySummary();
    }

    private void PlatformCombo_OnSelectionChanged(
        object sender,
        System.Windows.Controls.SelectionChangedEventArgs e
    )
    {
        if (PlatformCombo.SelectedItem is PlatformOption platform &&
            ServerUrlBox is not null &&
            platform.Id != "custom")
            ServerUrlBox.Text = platform.Server;
    }

    private void StableProfileButton_OnClick(object sender, RoutedEventArgs e)
    {
        ResolutionCombo.SelectedIndex = 1;
        FrameRateCombo.SelectedItem = 30;
        VideoBitrateSlider.Value = 3500;
        AudioBitrateCombo.SelectedItem = 160;
        SetMessage("Profil stable 720p30 appliqué.");
        UpdateQualitySummary();
    }

    private async void PreviewButton_OnClick(object sender, RoutedEventArgs e)
    {
        try
        {
            if (_engine.IsRunning && !_engine.IsLive)
            {
                _expectedStop = true;
                await _engine.StopAsync();
                _expectedStop = false;
                SetIdleUi("Aperçu arrêté.");
                return;
            }

            var configuration = ReadConfiguration(requireDestination: false);
            SetBusyUi("APERÇU", "#F3B74B");
            PreviewButton.Content = "Arrêter l’aperçu";
            await _engine.StartPreviewAsync(configuration);
        }
        catch (Exception exception)
        {
            SetIdleUi(exception.Message, error: true);
        }
    }

    private async void LiveButton_OnClick(object sender, RoutedEventArgs e)
    {
        try
        {
            if (_engine.IsLive)
            {
                _expectedStop = true;
                await _engine.StopAsync();
                _expectedStop = false;
                SetIdleUi("Direct arrêté proprement.");
                return;
            }

            var configuration = ReadConfiguration(requireDestination: true);
            SetBusyUi("CONNEXION", "#F3B74B");
            LiveButton.Content = "Arrêter le direct";
            PreviewButton.IsEnabled = false;
            LiveBadge.Visibility = Visibility.Visible;
            await _engine.StartLiveAsync(configuration);
            SetStatus("EN DIRECT", "#EF355F");
            SetMessage("Le programme est envoyé au serveur. Surveille l’aperçu et Kick/Twitch.");
        }
        catch (Exception exception)
        {
            SetIdleUi(exception.Message, error: true);
        }
    }

    private StreamConfiguration ReadConfiguration(bool requireDestination)
    {
        if (DisplayCombo.SelectedItem is not DisplaySource display ||
            ResolutionCombo.SelectedItem is not ResolutionOption resolution ||
            SceneCombo.SelectedItem is not SceneOption scene ||
            PositionCombo.SelectedItem is not PositionOption position ||
            FrameRateCombo.SelectedItem is not int frameRate ||
            AudioBitrateCombo.SelectedItem is not int audioBitrate ||
            MicrophoneCombo.SelectedItem is not AudioDeviceOption microphone ||
            SystemAudioCombo.SelectedItem is not AudioDeviceOption systemAudio)
            throw new InvalidOperationException("Un réglage de capture est incomplet.");

        var server = ServerUrlBox.Text.Trim();
        var streamKey = StreamKeyBox.Password.Trim();
        if (requireDestination &&
            (!(server.StartsWith("rtmp://", StringComparison.OrdinalIgnoreCase) ||
               server.StartsWith("rtmps://", StringComparison.OrdinalIgnoreCase)) ||
             streamKey.Length == 0))
            throw new InvalidOperationException("Ajoute le serveur RTMP et la clé de stream.");

        return new StreamConfiguration(
            display,
            resolution,
            scene,
            position,
            frameRate,
            (int)Math.Round(VideoBitrateSlider.Value),
            audioBitrate,
            (int)Math.Round(PipSizeSlider.Value),
            ShowCursorCheck.IsChecked == true,
            MirrorCameraCheck.IsChecked == true,
            RotateCameraCheck.IsChecked == true,
            microphone,
            systemAudio,
            server,
            streamKey
        );
    }

    private void OnEngineExited(int code)
    {
        if (_expectedStop || _closing) return;
        SetIdleUi(
            code == 0
                ? "Le moteur vidéo s’est arrêté."
                : "La source iPhone ou la connexion s’est coupée. Reconnecte l’iPhone puis relance.",
            error: code != 0
        );
    }

    private void SetBusyUi(string label, string color)
    {
        SetStatus(label, color);
        PreviewPlaceholder.Visibility = Visibility.Collapsed;
    }

    private void SetIdleUi(string message, bool error = false)
    {
        PreviewButton.Content = "Démarrer l’aperçu";
        PreviewButton.IsEnabled = true;
        LiveButton.Content = "Lancer le direct";
        LiveButton.IsEnabled = true;
        LiveBadge.Visibility = Visibility.Collapsed;
        SetStatus(error ? "ERREUR" : "PRÊT", error ? "#EF355F" : "#777184");
        SetMessage(message, error);
    }

    private void SetMessage(string message, bool error = false)
    {
        StatusText.Text = message;
        StatusText.Foreground = new SolidColorBrush(
            (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(
                error ? "#FF8FA6" : "#A39EB5"
            )
        );
    }

    private void SetStatus(string label, string color)
    {
        StatusLabel.Text = label;
        var brush = new SolidColorBrush(
            (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(color)
        );
        StatusDot.Fill = brush;
        StatusPill.Background = new SolidColorBrush(System.Windows.Media.Color.FromArgb(
            44,
            brush.Color.R,
            brush.Color.G,
            brush.Color.B
        ));
    }

    private void UpdateQualitySummary()
    {
        if (QualitySummary is null) return;
        var resolution = ResolutionCombo?.SelectedItem as ResolutionOption ?? _resolutions[1];
        var fps = FrameRateCombo?.SelectedItem is int value ? value : 30;
        var bitrate = VideoBitrateSlider is null ? 3500 : (int)Math.Round(VideoBitrateSlider.Value);
        QualitySummary.Text =
            $"{resolution.Width} × {resolution.Height} · {fps} i/s · {bitrate} kb/s · H.264/AAC";
    }

    private async void MainWindow_OnClosing(
        object? sender,
        System.ComponentModel.CancelEventArgs e
    )
    {
        if (_closing) return;
        e.Cancel = true;
        _closing = true;
        await _engine.DisposeAsync();
        Close();
    }
}
