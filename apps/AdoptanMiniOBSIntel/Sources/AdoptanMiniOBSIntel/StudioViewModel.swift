import AppKit
import Combine
import CoreGraphics
import CoreImage.CIFilterBuiltins
import Foundation

@MainActor
final class StudioViewModel: ObservableObject {
    @Published private(set) var screens: [FFmpegDevice] = []
    @Published private(set) var microphones: [FFmpegDevice] = []
    @Published private(set) var previewImage: NSImage?
    @Published private(set) var status = "Initialisation du moteur Intel…"
    @Published private(set) var isBusy = false
    @Published private(set) var isRunning = false
    @Published private(set) var isLive = false
    @Published private(set) var stableSeconds = 0
    @Published private(set) var screenAuthorized = CGPreflightScreenCaptureAccess()

    @Published var selectedScreenID = ""
    @Published var selectedMicrophoneID = ""
    @Published var scene: StudioScene = .screenCamera
    @Published var resolution: StudioResolution = .p720
    @Published var fps = 30
    @Published var videoBitrateKbps = 3_500
    @Published var audioBitrateKbps = 160
    @Published var showCursor = true
    @Published var mirrorCamera = false
    @Published var includeIPhoneAudio = true
    @Published var platform: StudioPlatform = .kick
    @Published var serverURL = StudioPlatform.kick.server
    @Published var streamKey = ""

    private let engine = FFmpegEngine()
    private var ticker: Timer?
    private var runStartedAt: Date?
    private var requestedRun = false
    private var currentLive = false
    private var retryTask: Task<Void, Never>?

    init() {
        engine.onPreviewFrame = { [weak self] image in
            guard let self else { return }
            self.previewImage = image
            if let runStartedAt = self.runStartedAt {
                self.stableSeconds = max(0, Int(Date().timeIntervalSince(runStartedAt)))
            }
            self.status = self.currentLive
                ? "Direct actif — image stable depuis \(self.stableSeconds) s."
                : "Aperçu actif — image stable depuis \(self.stableSeconds) s."
        }
        engine.onExit = { [weak self] code, diagnostics, expected in
            self?.engineExited(code: code, diagnostics: diagnostics, expected: expected)
        }
    }

    var iPhoneCameraURL: String {
        "https://adoptan.ai/iphone-camera"
    }

    var iPhoneCameraQRCode: NSImage? {
        makeQRCode(iPhoneCameraURL)
    }

    func prepare() async {
        await refreshDevices()
    }

    func refreshDevices() async {
        isBusy = true
        status = "Détection des écrans et microphones AVFoundation…"
        do {
            let catalog = try await engine.listDevices()
            screens = catalog.screens
            microphones = catalog.microphones
            if !screens.contains(where: { $0.id == selectedScreenID }) {
                selectedScreenID = screens.first?.id ?? ""
            }
            if !microphones.contains(where: { $0.id == selectedMicrophoneID }) {
                selectedMicrophoneID = ""
            }
            screenAuthorized = CGPreflightScreenCaptureAccess()
            status = screenAuthorized
                ? "Prêt. Teste d’abord l’écran seul, puis la caméra seule."
                : "Autorise d’abord l’enregistrement de l’écran, puis relance l’application."
        } catch {
            status = "Détection impossible : \(error.localizedDescription)"
        }
        isBusy = false
    }

    func requestScreenPermission() {
        let granted = CGRequestScreenCaptureAccess()
        screenAuthorized = granted || CGPreflightScreenCaptureAccess()
        status = screenAuthorized
            ? "Autorisation reçue. Quitte complètement puis relance l’application."
            : "Autorisation non accordée. Ouvre les réglages macOS avec le bouton ci-dessous."
    }

    func openScreenSettings() {
        guard let url = URL(
            string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
        ) else { return }
        NSWorkspace.shared.open(url)
    }

    func copyIPhoneCameraURL() {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(iPhoneCameraURL, forType: .string)
        status = "Lien de la caméra iPhone copié."
    }

    func selectPlatform(_ value: StudioPlatform) {
        platform = value
        if value != .custom {
            serverURL = value.server
        }
    }

    func useStableProfile() {
        resolution = .p720
        fps = 30
        videoBitrateKbps = 3_500
        audioBitrateKbps = 160
        status = "Profil Intel stable : 720p30."
    }

    func testScreen() async {
        scene = .screenOnly
        await startPreview()
    }

    func testCamera() async {
        scene = .cameraOnly
        await startPreview()
    }

    func testCombined() async {
        scene = .screenCamera
        await startPreview()
    }

    func startPreview() async {
        guard validateScreenPermission() else { return }
        await start(live: false)
    }

    func toggleLive() async {
        if isLive {
            await stop()
            return
        }
        guard validateScreenPermission() else { return }
        await start(live: true)
    }

    func stop() async {
        requestedRun = false
        retryTask?.cancel()
        retryTask = nil
        isBusy = true
        await engine.stop()
        isBusy = false
        isRunning = false
        isLive = false
        currentLive = false
        stableSeconds = 0
        runStartedAt = nil
        ticker?.invalidate()
        ticker = nil
        status = "Capture arrêtée proprement."
    }

    func shutdown() {
        requestedRun = false
        retryTask?.cancel()
        ticker?.invalidate()
        engine.shutdown()
    }

    private func validateScreenPermission() -> Bool {
        screenAuthorized = CGPreflightScreenCaptureAccess()
        if scene.needsScreen && !screenAuthorized {
            status = "Le partage d’écran n’est pas autorisé. Clique sur Autoriser l’écran."
            return false
        }
        return true
    }

    private func start(live: Bool) async {
        retryTask?.cancel()
        isBusy = true
        requestedRun = true
        currentLive = live
        status = scene.needsCamera
            ? "Connexion directe à la caméra Safari de l’iPhone…"
            : "Démarrage de la capture d’écran Intel…"
        do {
            try await engine.start(makeConfiguration(), live: live)
            isRunning = true
            isLive = live
            runStartedAt = Date()
            stableSeconds = 0
            startTicker()
        } catch {
            requestedRun = false
            isRunning = false
            isLive = false
            status = "Démarrage impossible : \(error.localizedDescription)"
        }
        isBusy = false
    }

    private func makeConfiguration() -> FFmpegConfiguration {
        FFmpegConfiguration(
            scene: scene,
            screen: screens.first(where: { $0.id == selectedScreenID }),
            microphone: microphones.first(where: { $0.id == selectedMicrophoneID }),
            resolution: resolution,
            fps: fps,
            videoBitrateKbps: videoBitrateKbps,
            audioBitrateKbps: audioBitrateKbps,
            showCursor: showCursor,
            mirrorCamera: mirrorCamera,
            includeIPhoneAudio: includeIPhoneAudio,
            serverURL: serverURL,
            streamKey: streamKey
        )
    }

    private func startTicker() {
        ticker?.invalidate()
        ticker = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, let started = self.runStartedAt else { return }
                self.stableSeconds = max(0, Int(Date().timeIntervalSince(started)))
            }
        }
    }

    private func engineExited(code: Int32, diagnostics: String, expected: Bool) {
        isRunning = false
        isLive = false
        ticker?.invalidate()
        ticker = nil
        guard !expected, requestedRun else { return }

        let normalized = diagnostics.lowercased()
        if normalized.contains("not authorized") || normalized.contains("permission") {
            requestedRun = false
            status = "macOS bloque l’écran. Autorise cette nouvelle application puis relance-la."
            return
        }
        if scene.needsCamera {
            let mode = currentLive ? "Le direct va reprendre" : "Nouvel essai"
            status = "Caméra iPhone absente — \(mode) automatiquement dans 3 secondes…"
            retryTask?.cancel()
            retryTask = Task { [weak self] in
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                guard !Task.isCancelled, let self, self.requestedRun else { return }
                await self.start(live: self.currentLive)
            }
            return
        }
        requestedRun = false
        let detail = diagnostics.split(whereSeparator: \.isNewline).last.map(String.init) ?? ""
        status = "Le moteur s’est arrêté (code \(code)). \(detail)"
    }

    private func makeQRCode(_ content: String) -> NSImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(content.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage?.transformed(
            by: CGAffineTransform(scaleX: 6, y: 6)
        ) else { return nil }
        let representation = NSCIImageRep(ciImage: output)
        let image = NSImage(size: representation.size)
        image.addRepresentation(representation)
        return image
    }
}
