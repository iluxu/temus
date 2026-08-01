import Foundation

struct FFmpegDevice: Identifiable, Hashable {
    enum Kind: Hashable {
        case video
        case audio
    }

    let index: Int
    let name: String
    let kind: Kind

    var id: String { "\(kind)-\(index)-\(name)" }
}

struct DeviceCatalog {
    var screens: [FFmpegDevice]
    var microphones: [FFmpegDevice]
}

enum StudioScene: String, CaseIterable, Identifiable {
    case screenOnly = "Écran seul"
    case cameraOnly = "Caméra iPhone seule"
    case screenCamera = "Écran + caméra iPhone"

    var id: Self { self }
    var needsScreen: Bool { self != .cameraOnly }
    var needsCamera: Bool { self != .screenOnly }
}

enum StudioResolution: String, CaseIterable, Identifiable {
    case p540 = "960 × 540"
    case p720 = "1280 × 720"
    case p1080 = "1920 × 1080"

    var id: Self { self }

    var width: Int {
        switch self {
        case .p540: 960
        case .p720: 1_280
        case .p1080: 1_920
        }
    }

    var height: Int {
        switch self {
        case .p540: 540
        case .p720: 720
        case .p1080: 1_080
        }
    }

    var recommendedBitrate: Int {
        switch self {
        case .p540: 2_200
        case .p720: 3_500
        case .p1080: 5_500
        }
    }
}

enum StudioPlatform: String, CaseIterable, Identifiable {
    case kick = "Kick"
    case twitch = "Twitch"
    case custom = "RTMP personnalisé"

    var id: Self { self }

    var server: String {
        switch self {
        case .kick:
            "rtmps://fa723fc1b171.global-contribute.live-video.net:443/app"
        case .twitch:
            "rtmps://live.twitch.tv:443/app"
        case .custom:
            ""
        }
    }
}

struct FFmpegConfiguration {
    let scene: StudioScene
    let screen: FFmpegDevice?
    let microphone: FFmpegDevice?
    let resolution: StudioResolution
    let fps: Int
    let videoBitrateKbps: Int
    let audioBitrateKbps: Int
    let showCursor: Bool
    let mirrorCamera: Bool
    let includeIPhoneAudio: Bool
    let serverURL: String
    let streamKey: String
}
