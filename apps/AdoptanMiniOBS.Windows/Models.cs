using System.Drawing;

namespace AdoptanMiniOBS;

public sealed record DisplaySource(string Name, Rectangle Bounds)
{
    public override string ToString() =>
        $"{Name} — {Bounds.Width} × {Bounds.Height}";
}

public sealed record ResolutionOption(string Label, int Width, int Height, int BitrateKbps)
{
    public override string ToString() => Label;
}

public sealed record SceneOption(string Id, string Label)
{
    public override string ToString() => Label;
}

public sealed record PositionOption(string Id, string Label)
{
    public override string ToString() => Label;
}

public sealed record PlatformOption(string Id, string Label, string Server)
{
    public override string ToString() => Label;
}

public sealed record AudioDeviceOption(string? DeviceName, string Label)
{
    public override string ToString() => Label;
}

public sealed record StreamConfiguration(
    DisplaySource Display,
    ResolutionOption Resolution,
    SceneOption Scene,
    PositionOption Position,
    int FrameRate,
    int VideoBitrateKbps,
    int AudioBitrateKbps,
    int PipPercent,
    bool ShowCursor,
    bool MirrorCamera,
    bool RotateCamera,
    AudioDeviceOption Microphone,
    AudioDeviceOption SystemAudio,
    string ServerUrl,
    string StreamKey
);
