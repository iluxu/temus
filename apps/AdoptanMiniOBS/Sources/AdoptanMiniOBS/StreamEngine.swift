@preconcurrency import AVFoundation
import AppKit
import Combine
import CoreGraphics
import HaishinKit
import RTMPHaishinKit
@preconcurrency import ScreenCaptureKit
import VideoToolbox

@MainActor
final class StreamEngine: ObservableObject {
    @Published private(set) var cameras: [CaptureDeviceOption] = []
    @Published private(set) var microphones: [CaptureDeviceOption] = []
    @Published private(set) var displays: [DisplayOption] = []
    @Published private(set) var liveState: LiveState = .idle
    @Published private(set) var isCaptureReady = false
    @Published private(set) var isConfiguring = false
    @Published private(set) var cameraHasFrames = false
    @Published private(set) var cameraStatusText = "Recherche de la caméra iPhone…"
    @Published var message = "Initialisation…"

    @Published var selectedCameraID = ""
    @Published var selectedMicrophoneID = ""
    @Published var selectedDisplayID: UInt32 = 0
    @Published var scene: SceneLayout = .screenCamera
    @Published var overlayPosition: OverlayPosition = .bottomRight
    @Published var overlayScale = 0.28
    @Published var resolution: OutputResolution = .p720
    @Published var fps: OutputFPS = .fps30
    @Published var videoBitrateKbps = 3_500
    @Published var audioBitrateKbps = 160
    @Published var microphoneVolume = 1.0
    @Published var systemAudioVolume = 0.85
    @Published var includeMicrophone = true
    @Published var includeSystemAudio = true
    @Published var showCursor = true
    @Published var mirrorCamera = false
    @Published var rotateCamera180 = false
    @Published var platform: StreamPlatform = .kick
    @Published var serverURL = StreamPlatform.kick.defaultServer
    @Published var streamKey = ""

    let mixer = MediaMixer(
        captureSessionMode: .single,
        multiTrackAudioMixingEnabled: true
    )

    private lazy var screenCapture: ScreenCaptureSource = {
        let source = ScreenCaptureSource(mixer: mixer)
        source.onError = { [weak self] error in
            self?.message = error
            self?.isCaptureReady = false
        }
        return source
    }()

    private var cameraDevices: [AVCaptureDevice] = []
    private var microphoneDevices: [AVCaptureDevice] = []
    private var screenDisplays: [SCDisplay] = []
    private var session: (any Session)?
    private var activeStream: (any StreamConvertible)?
    private var readyStateTask: Task<Void, Never>?
    private var cameraMonitorTask: Task<Void, Never>?
    private var deviceObservers: [NSObjectProtocol] = []
    private var hasStartedMixer = false

    @ScreenActor private var overlayObject: VideoTrackScreenObject?
    @ScreenActor private var mirrorEffect = MirrorEffect()
    @ScreenActor private var rotateEffect = Rotate180Effect()

    init() {
        restorePreferences()
        observeDeviceChanges()
    }

    func prepare() async {
        guard !isConfiguring else { return }
        isConfiguring = true
        message = "Demande des autorisations caméra et micro…"

        await SessionBuilderFactory.shared.register(RTMPSessionFactory())

        let cameraAccess = await requestAccess(for: .video)
        let microphoneAccess = await requestAccess(for: .audio)

        guard cameraAccess else {
            message = "Autorise la caméra dans Réglages Système › Confidentialité et sécurité › Caméra."
            isConfiguring = false
            return
        }
        if !microphoneAccess {
            includeMicrophone = false
        }

        if !CGPreflightScreenCaptureAccess() {
            message = "macOS va demander l’autorisation d’enregistrer l’écran."
            _ = CGRequestScreenCaptureAccess()
        }

        await refreshSources()
        await configureCapture()
        isConfiguring = false
    }

    func refreshSources() async {
        cameraDevices = discoverVideoDevices()
        microphoneDevices = discoverAudioDevices()

        cameras = cameraDevices.map { device in
            return CaptureDeviceOption(
                id: device.uniqueID,
                name: device.localizedName,
                isIPhone: isIPhoneCamera(device)
            )
        }
        .sorted {
            if $0.isIPhone != $1.isIPhone { return $0.isIPhone }
            return $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }

        microphones = microphoneDevices.map {
            CaptureDeviceOption(id: $0.uniqueID, name: $0.localizedName, isIPhone: false)
        }
        .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }

        if !cameras.contains(where: { $0.id == selectedCameraID }) {
            selectedCameraID = preferredCamera()?.uniqueID
                ?? cameras.first(where: \.isIPhone)?.id
                ?? cameras.first?.id
                ?? ""
        } else if let continuityCamera = cameraDevices.first(where: isIPhoneCamera),
                  cameras.first(where: { $0.id == selectedCameraID })?.isIPhone != true {
            // The app is specifically designed around the iPhone camera. If it becomes
            // available after launch, prefer it automatically instead of keeping FaceTime HD.
            selectedCameraID = continuityCamera.uniqueID
        }
        if !microphones.contains(where: { $0.id == selectedMicrophoneID }) {
            selectedMicrophoneID = microphones.first?.id ?? ""
        }

        do {
            let content = try await SCShareableContent.excludingDesktopWindows(
                false,
                onScreenWindowsOnly: true
            )
            screenDisplays = content.displays
            let mainDisplayID = CGMainDisplayID()
            displays = content.displays.map { display in
                DisplayOption(
                    id: display.displayID,
                    name: display.displayID == mainDisplayID
                        ? "Écran principal"
                        : "Écran \(display.displayID)",
                    width: display.width,
                    height: display.height
                )
            }
            if !displays.contains(where: { $0.id == selectedDisplayID }) {
                selectedDisplayID = displays.first(where: { $0.id == mainDisplayID })?.id
                    ?? displays.first?.id
                    ?? 0
            }
        } catch {
            displays = []
            screenDisplays = []
            message = "Capture d’écran indisponible : \(error.localizedDescription). Relance l’app après l’autorisation."
        }
    }

    func configureCapture() async {
        guard liveState != .live && liveState != .connecting else {
            message = "Arrête le direct avant de changer la résolution ou les sources."
            return
        }

        isConfiguring = true
        isCaptureReady = false
        cameraHasFrames = false
        cameraStatusText = "Configuration de la caméra…"
        cameraMonitorTask?.cancel()
        savePreferences()
        await screenCapture.stop()

        try? await mixer.attachVideo(nil, track: 1)
        try? await mixer.attachAudio(nil, track: 0)

        var videoMixerSettings = await mixer.videoMixerSettings
        videoMixerSettings.mode = .offscreen
        videoMixerSettings.mainTrack = scene == .cameraOnly || scene == .cameraScreen ? 1 : 0
        await mixer.setVideoMixerSettings(videoMixerSettings)

        let mainAudioTrack: UInt8 = includeMicrophone ? 0 : 1
        let audioSettings = AudioMixerSettings(
            sampleRate: 48_000,
            channels: 2,
            isMuted: !includeMicrophone && !includeSystemAudio,
            mainTrack: mainAudioTrack,
            tracks: [
                0: AudioMixerTrackSettings(
                    volume: Float(microphoneVolume),
                    isMuted: !includeMicrophone
                ),
                1: AudioMixerTrackSettings(
                    volume: Float(systemAudioVolume),
                    isMuted: !includeSystemAudio
                )
            ]
        )
        await mixer.setAudioMixerSettings(audioSettings)

        await configureComposition()

        if let camera = cameraDevices.first(where: { $0.uniqueID == selectedCameraID }) {
            if camera.isInUseByAnotherApplication {
                cameraStatusText = "\(camera.localizedName) est utilisée par une autre application."
            } else if camera.isSuspended {
                cameraStatusText = "\(camera.localizedName) est momentanément suspendue."
            } else {
                cameraStatusText = "\(camera.localizedName) détectée — attente de l’image…"
            }
            do {
                try await mixer.attachVideo(camera, track: 1)
            } catch {
                cameraStatusText = "Connexion caméra impossible : \(error.localizedDescription)"
                message = "Caméra indisponible : \(error.localizedDescription)"
            }
        } else {
            cameraStatusText = "Aucune caméra iPhone détectée."
        }

        if includeMicrophone,
           let microphone = microphoneDevices.first(where: { $0.uniqueID == selectedMicrophoneID }) {
            do {
                try await mixer.attachAudio(microphone, track: 0)
            } catch {
                message = "Micro indisponible : \(error.localizedDescription)"
            }
        }

        if !hasStartedMixer {
            await mixer.startRunning()
            hasStartedMixer = true
        }

        do {
            try await mixer.setFrameRate(Float64(fps.rawValue))
        } catch {
            message = "Fréquence d’image non prise en charge : \(error.localizedDescription)"
        }

        let needsScreen = scene != .cameraOnly || includeSystemAudio
        if needsScreen,
           let display = screenDisplays.first(where: { $0.displayID == selectedDisplayID }) {
            do {
                try await screenCapture.start(
                    display: display,
                    outputSize: resolution.size,
                    fps: fps.rawValue,
                    includeSystemAudio: includeSystemAudio,
                    showCursor: showCursor
                )
            } catch {
                message = "Impossible de capturer l’écran : \(error.localizedDescription)"
                isConfiguring = false
                return
            }
        }

        isCaptureReady = true
        isConfiguring = false
        monitorCameraFrames()
        if cameras.first(where: { $0.id == selectedCameraID })?.isIPhone == true {
            message = "Caméra iPhone détectée — vérification du signal vidéo…"
        } else if cameras.isEmpty {
            message = "Écran prêt, mais aucune caméra n’est détectée."
        } else {
            message = "Prêt — sélectionne l’iPhone dans Caméra s’il n’est pas déjà choisi."
        }
    }

    func applySceneLive() {
        savePreferences()
        Task {
            var settings = await mixer.videoMixerSettings
            settings.mainTrack = scene == .cameraOnly || scene == .cameraScreen ? 1 : 0
            await mixer.setVideoMixerSettings(settings)
            await configureComposition()
        }
    }

    func selectPlatform(_ newPlatform: StreamPlatform) {
        platform = newPlatform
        if newPlatform != .custom {
            serverURL = newPlatform.defaultServer
        }
        streamKey = KeychainStore.read(account: newPlatform.rawValue)
        savePreferences()
    }

    func startLive() async {
        guard liveState == .idle || isFailureState else { return }
        guard isCaptureReady else {
            liveState = .failed("La capture n’est pas prête.")
            return
        }

        let cleanServer = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let cleanKey = streamKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanServer.isEmpty, !cleanKey.isEmpty,
              let url = URL(string: "\(cleanServer)/\(cleanKey)") else {
            liveState = .failed("Ajoute l’adresse du serveur et la clé de stream.")
            return
        }

        KeychainStore.save(cleanKey, account: platform.rawValue)
        savePreferences()
        liveState = .connecting
        message = "Connexion à \(platform.rawValue)…"

        do {
            guard let newSession = try await SessionBuilderFactory.shared.make(url)
                .setMethod(.ingest)
                .build() else {
                throw MiniOBSError.sessionUnavailable
            }
            let stream = await newSession.stream
            activeStream = stream
            session = newSession

            var videoSettings = await stream.videoSettings
            videoSettings.videoSize = resolution.size
            videoSettings.bitRate = videoBitrateKbps * 1_000
            videoSettings.profileLevel = kVTProfileLevel_H264_Main_AutoLevel as String
            videoSettings.scalingMode = .letterbox
            videoSettings.bitRateMode = .constant
            videoSettings.maxKeyFrameIntervalDuration = 2
            videoSettings.allowFrameReordering = false
            videoSettings.isLowLatencyRateControlEnabled = true
            videoSettings.isHardwareAcceleratedEnabled = true
            try await stream.setVideoSettings(videoSettings)

            let audioSettings = AudioCodecSettings(
                bitRate: audioBitrateKbps * 1_000,
                downmix: true,
                sampleRate: 48_000,
                format: .aac
            )
            try await stream.setAudioSettings(audioSettings)

            await mixer.addOutput(stream)
            observeReadyState(of: newSession)
            try await newSession.connect { [weak self] in
                Task { @MainActor in
                    guard let self else { return }
                    self.liveState = .failed("Le serveur a coupé le direct.")
                    self.message = "Connexion interrompue par \(self.platform.rawValue)."
                }
            }
            liveState = .live
            message = "Direct envoyé à \(platform.rawValue)."
        } catch {
            if let activeStream {
                await mixer.removeOutput(activeStream)
            }
            activeStream = nil
            session = nil
            liveState = .failed(error.localizedDescription)
            message = "Échec du direct : \(error.localizedDescription)"
        }
    }

    func stopLive() async {
        guard session != nil || activeStream != nil else {
            liveState = .idle
            return
        }
        liveState = .stopping
        readyStateTask?.cancel()
        readyStateTask = nil
        try? await session?.close()
        if let activeStream {
            await mixer.removeOutput(activeStream)
        }
        activeStream = nil
        session = nil
        liveState = .idle
        message = "Direct arrêté proprement."
    }

    func shutdown() {
        cameraMonitorTask?.cancel()
        cameraMonitorTask = nil
        deviceObservers.forEach(NotificationCenter.default.removeObserver)
        deviceObservers.removeAll()
        Task {
            await stopLive()
            await screenCapture.stop()
            if hasStartedMixer {
                await mixer.stopRunning()
            }
        }
    }

    private var isFailureState: Bool {
        if case .failed = liveState { return true }
        return false
    }

    private func observeReadyState(of session: any Session) {
        readyStateTask?.cancel()
        readyStateTask = Task {
            for await state in await session.readyState {
                guard !Task.isCancelled else { break }
                switch state {
                case .connecting:
                    liveState = .connecting
                case .open:
                    liveState = .live
                case .closing:
                    liveState = .stopping
                case .closed:
                    if liveState != .idle && liveState != .stopping {
                        liveState = .failed("Connexion fermée.")
                    }
                }
            }
        }
    }

    private func configureComposition() async {
        let selectedScene = scene
        let selectedPosition = overlayPosition
        let selectedScale = overlayScale
        let outputSize = resolution.size
        let shouldMirror = mirrorCamera
        let shouldRotate = rotateCamera180

        await configureCompositionOnScreen(
            scene: selectedScene,
            position: selectedPosition,
            scale: selectedScale,
            outputSize: outputSize,
            mirror: shouldMirror,
            rotate: shouldRotate
        )
    }

    @ScreenActor
    private func configureCompositionOnScreen(
        scene: SceneLayout,
        position: OverlayPosition,
        scale: Double,
        outputSize: CGSize,
        mirror: Bool,
        rotate: Bool
    ) async {
        let screen = await mixer.screen
        screen.size = outputSize
        screen.backgroundColor = NSColor.black.cgColor

        if overlayObject == nil {
            let overlay = VideoTrackScreenObject()
            overlay.videoGravity = .resizeAspectFill
            try? screen.addChild(overlay)
            overlayObject = overlay
        }
        guard let overlay = overlayObject else { return }

        overlay.isVisible = scene == .screenCamera || scene == .cameraScreen
        overlay.track = scene == .cameraScreen ? 0 : 1
        overlay.cornerRadius = max(10, outputSize.height * 0.018)

        let overlayWidth = outputSize.width * max(0.18, min(scale, 0.48))
        overlay.size = CGSize(width: overlayWidth, height: overlayWidth * 9 / 16)
        let margin = max(16, outputSize.width * 0.018)
        overlay.layoutMargin = NSEdgeInsets(
            top: margin,
            left: margin,
            bottom: margin,
            right: margin
        )

        switch position {
        case .topLeft:
            overlay.horizontalAlignment = .left
            overlay.verticalAlignment = .top
        case .topRight:
            overlay.horizontalAlignment = .right
            overlay.verticalAlignment = .top
        case .bottomLeft:
            overlay.horizontalAlignment = .left
            overlay.verticalAlignment = .bottom
        case .bottomRight:
            overlay.horizontalAlignment = .right
            overlay.verticalAlignment = .bottom
        }

        _ = overlay.unregisterVideoEffect(mirrorEffect)
        _ = overlay.unregisterVideoEffect(rotateEffect)
        _ = screen.unregisterVideoEffect(mirrorEffect)
        _ = screen.unregisterVideoEffect(rotateEffect)

        let cameraIsMain = scene == .cameraOnly || scene == .cameraScreen
        if mirror {
            if cameraIsMain {
                _ = screen.registerVideoEffect(mirrorEffect)
            } else {
                _ = overlay.registerVideoEffect(mirrorEffect)
            }
        }
        if rotate {
            if cameraIsMain {
                _ = screen.registerVideoEffect(rotateEffect)
            } else {
                _ = overlay.registerVideoEffect(rotateEffect)
            }
        }
    }

    private func discoverVideoDevices() -> [AVCaptureDevice] {
        let deviceTypes: [AVCaptureDevice.DeviceType]
        if #available(macOS 14.0, *) {
            deviceTypes = [
                .builtInWideAngleCamera,
                .continuityCamera,
                .external,
                .deskViewCamera
            ]
        } else {
            deviceTypes = [
                .builtInWideAngleCamera,
                .externalUnknown
            ]
        }
        return AVCaptureDevice.DiscoverySession(
            deviceTypes: deviceTypes,
            mediaType: .video,
            position: .unspecified
        ).devices
    }

    private func discoverAudioDevices() -> [AVCaptureDevice] {
        let deviceTypes: [AVCaptureDevice.DeviceType]
        if #available(macOS 14.0, *) {
            deviceTypes = [.microphone, .external]
        } else {
            deviceTypes = [.builtInMicrophone, .externalUnknown]
        }
        return AVCaptureDevice.DiscoverySession(
            deviceTypes: deviceTypes,
            mediaType: .audio,
            position: .unspecified
        ).devices
    }

    private func preferredCamera() -> AVCaptureDevice? {
        if let iPhone = cameraDevices.first(where: isIPhoneCamera) {
            return iPhone
        }
        if let preferred = AVCaptureDevice.systemPreferredCamera,
           cameraDevices.contains(where: { $0.uniqueID == preferred.uniqueID }) {
            return preferred
        }
        return cameraDevices.first
    }

    private func isIPhoneCamera(_ device: AVCaptureDevice) -> Bool {
        if #available(macOS 14.0, *), device.isContinuityCamera {
            return true
        }
        let identity = [
            device.localizedName,
            device.manufacturer,
            device.modelID
        ]
        .joined(separator: " ")
        .lowercased()
        return identity.contains("iphone") ||
            identity.contains("continuity") ||
            identity.contains("continuité")
    }

    private func observeDeviceChanges() {
        let center = NotificationCenter.default
        for name in [
            AVCaptureDevice.wasConnectedNotification,
            AVCaptureDevice.wasDisconnectedNotification
        ] {
            let observer = center.addObserver(
                forName: name,
                object: nil,
                queue: .main
            ) { [weak self] notification in
                guard let self else { return }
                Task { @MainActor in
                    let changedDevice = notification.object as? AVCaptureDevice
                    await self.refreshSources()
                    if let changedDevice,
                       self.isIPhoneCamera(changedDevice),
                       name == AVCaptureDevice.wasConnectedNotification {
                        self.selectedCameraID = changedDevice.uniqueID
                        self.message = "iPhone détecté. Activation automatique de sa caméra…"
                        await self.configureCapture()
                    }
                }
            }
            deviceObservers.append(observer)
        }
    }

    private func monitorCameraFrames() {
        cameraMonitorTask?.cancel()
        guard !selectedCameraID.isEmpty else { return }
        let cameraName = cameras.first(where: { $0.id == selectedCameraID })?.name ?? "Caméra"
        cameraMonitorTask = Task {
            for _ in 0..<24 {
                guard !Task.isCancelled else { return }
                let inputFormats = await mixer.videoInputFormats
                if inputFormats[1] != nil {
                    cameraHasFrames = true
                    cameraStatusText = "\(cameraName) transmet bien l’image."
                    if cameras.first(where: { $0.id == selectedCameraID })?.isIPhone == true {
                        message = "Prêt — image de l’iPhone reçue."
                    }
                    return
                }
                try? await Task.sleep(nanoseconds: 250_000_000)
            }
            guard !Task.isCancelled else { return }
            cameraHasFrames = false
            cameraStatusText = "\(cameraName) est sélectionnée, mais aucun signal vidéo n’arrive."
            message = "Déverrouille l’iPhone, rapproche-le du Mac, puis clique sur Appliquer à la capture."
        }
    }

    private func requestAccess(for mediaType: AVMediaType) async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: mediaType) {
        case .authorized:
            return true
        case .notDetermined:
            return await withCheckedContinuation { continuation in
                AVCaptureDevice.requestAccess(for: mediaType) { granted in
                    continuation.resume(returning: granted)
                }
            }
        case .denied, .restricted:
            return false
        @unknown default:
            return false
        }
    }

    private func restorePreferences() {
        let defaults = UserDefaults.standard
        if let raw = defaults.string(forKey: "platform"),
           let storedPlatform = StreamPlatform(rawValue: raw) {
            platform = storedPlatform
        }
        if let storedServer = defaults.string(forKey: "serverURL"), !storedServer.isEmpty {
            serverURL = storedServer
        } else {
            serverURL = platform.defaultServer
        }
        if let raw = defaults.string(forKey: "resolution"),
           let storedResolution = OutputResolution(rawValue: raw) {
            resolution = storedResolution
        }
        if let storedFPS = OutputFPS(rawValue: defaults.integer(forKey: "fps")),
           defaults.object(forKey: "fps") != nil {
            fps = storedFPS
        }
        if defaults.object(forKey: "videoBitrateKbps") != nil {
            videoBitrateKbps = defaults.integer(forKey: "videoBitrateKbps")
        }
        streamKey = KeychainStore.read(account: platform.rawValue)
    }

    private func savePreferences() {
        let defaults = UserDefaults.standard
        defaults.set(platform.rawValue, forKey: "platform")
        defaults.set(serverURL, forKey: "serverURL")
        defaults.set(resolution.rawValue, forKey: "resolution")
        defaults.set(fps.rawValue, forKey: "fps")
        defaults.set(videoBitrateKbps, forKey: "videoBitrateKbps")
        KeychainStore.save(streamKey, account: platform.rawValue)
    }
}

extension StreamEngine: MTHKViewRepresentable.PreviewSource {
    nonisolated func connect(to view: MTHKView) {
        Task {
            await mixer.addOutput(view)
        }
    }
}

private enum MiniOBSError: LocalizedError {
    case sessionUnavailable

    var errorDescription: String? {
        "Le moteur RTMP n’a pas pu être créé."
    }
}
