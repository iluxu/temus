import CoreGraphics
import Foundation

enum VideoSourceTrack {
    // Restore the routing from the first working screen-share release:
    // ScreenCaptureKit owns the primary track and the camera is only an overlay.
    static let screen: UInt8 = 0
    static let camera: UInt8 = 1
}

enum CameraInputMode: String, CaseIterable, Identifiable {
    case iphoneNetwork = "iPhone par QR — sans Continuité"
    case macOSDevice = "Caméra macOS / Continuité"

    var id: Self { self }
}

enum StreamPlatform: String, CaseIterable, Identifiable {
    case kick = "Kick"
    case twitch = "Twitch"
    case custom = "RTMP personnalisé"

    var id: Self { self }

    var defaultServer: String {
        switch self {
        case .kick:
            return "rtmps://fa723fc1b171.global-contribute.live-video.net:443/app"
        case .twitch:
            return "rtmps://live.twitch.tv:443/app"
        case .custom:
            return ""
        }
    }
}

enum SceneLayout: String, CaseIterable, Identifiable {
    case screenCamera = "Écran + caméra"
    case screenOnly = "Écran seul"
    case cameraOnly = "Caméra seule"
    case cameraScreen = "Caméra + écran"

    var id: Self { self }
}

enum OverlayPosition: String, CaseIterable, Identifiable {
    case topLeft = "Haut gauche"
    case topRight = "Haut droite"
    case bottomLeft = "Bas gauche"
    case bottomRight = "Bas droite"

    var id: Self { self }
}

enum OutputResolution: String, CaseIterable, Identifiable {
    case p540 = "960 × 540"
    case p720 = "1280 × 720"
    case p1080 = "1920 × 1080"

    var id: Self { self }

    var size: CGSize {
        switch self {
        case .p540:
            return CGSize(width: 960, height: 540)
        case .p720:
            return CGSize(width: 1280, height: 720)
        case .p1080:
            return CGSize(width: 1920, height: 1080)
        }
    }

    var recommendedBitrateKbps: Int {
        switch self {
        case .p540: return 2_500
        case .p720: return 3_500
        case .p1080: return 5_500
        }
    }
}

enum OutputFPS: Int, CaseIterable, Identifiable {
    case fps24 = 24
    case fps30 = 30
    case fps60 = 60

    var id: Self { self }
    var title: String { "\(rawValue) i/s" }
}

struct CaptureDeviceOption: Identifiable, Hashable {
    let id: String
    let name: String
    let isIPhone: Bool
}

struct DisplayOption: Identifiable, Hashable {
    let id: UInt32
    let name: String
    let width: Int
    let height: Int

    var detail: String {
        "\(width) × \(height)"
    }
}

enum LiveState: Equatable {
    case idle
    case connecting
    case live
    case stopping
    case failed(String)

    var title: String {
        switch self {
        case .idle: return "Prêt"
        case .connecting: return "Connexion…"
        case .live: return "EN DIRECT"
        case .stopping: return "Arrêt…"
        case .failed: return "Erreur"
        }
    }
}
