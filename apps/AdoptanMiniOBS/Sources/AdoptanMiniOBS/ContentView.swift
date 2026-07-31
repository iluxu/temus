import HaishinKit
import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var engine: StreamEngine
    @State private var showAdvanced = false
    @State private var revealStreamKey = false

    var body: some View {
        HSplitView {
            controls
                .frame(minWidth: 330, idealWidth: 360, maxWidth: 410)

            VStack(spacing: 0) {
                header
                preview
                liveBar
            }
            .frame(minWidth: 680)
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .task {
            await engine.prepare()
        }
    }

    private var controls: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                brand
                sourceSection
                sceneSection
                destinationSection
                qualitySection
                audioSection
                cameraSection

                Button {
                    Task { await engine.configureCapture() }
                } label: {
                    Label(
                        engine.isConfiguring ? "Configuration…" : "Appliquer à la capture",
                        systemImage: "slider.horizontal.3"
                    )
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(engine.isConfiguring || engine.liveState == .live || engine.liveState == .connecting)
            }
            .padding(16)
        }
        .background(Color(nsColor: .controlBackgroundColor))
    }

    private var brand: some View {
        HStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(
                        LinearGradient(
                            colors: [Color(red: 0.54, green: 0.23, blue: 1), .pink],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                Image(systemName: "dot.radiowaves.left.and.right")
                    .font(.system(size: 21, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .frame(width: 42, height: 42)

            VStack(alignment: .leading, spacing: 1) {
                Text("Adoptan Mini OBS")
                    .font(.headline)
                Text("Caméra iPhone · Écran · RTMP")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.bottom, 2)
    }

    private var sourceSection: some View {
        SettingsCard(title: "Sources", icon: "video.fill") {
            Picker("Écran", selection: $engine.selectedDisplayID) {
                if engine.displays.isEmpty {
                    Text("Aucun écran").tag(UInt32(0))
                }
                ForEach(engine.displays) { display in
                    Text("\(display.name) — \(display.detail)")
                        .tag(display.id)
                }
            }

            HStack(alignment: .top, spacing: 7) {
                Circle()
                    .fill(engine.screenHasFrames ? Color.green : Color.orange)
                    .frame(width: 8, height: 8)
                    .padding(.top, 4)
                Text(engine.screenStatusText)
                    .font(.caption)
                    .foregroundStyle(engine.screenHasFrames ? Color.green : Color.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if !engine.screenHasFrames {
                Button {
                    engine.openScreenCaptureSettings()
                } label: {
                    Label(
                        "Autoriser le partage d’écran",
                        systemImage: "rectangle.inset.filled.and.person.filled"
                    )
                }
                .buttonStyle(.link)
            }

            Divider()

            Picker("Mode caméra", selection: $engine.cameraInputMode) {
                ForEach(CameraInputMode.allCases) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .onChange(of: engine.cameraInputMode) { _ in
                guard engine.isCaptureReady, !engine.isConfiguring else { return }
                Task { await engine.configureCapture() }
            }

            if engine.cameraInputMode == .iphoneNetwork {
                SecureField("Clé privée adoptan.ai", text: $engine.iphoneCameraKey)
                    .textFieldStyle(.roundedBorder)
                    .onSubmit {
                        engine.saveIPhoneCameraKey()
                        Task { await engine.configureCapture() }
                    }

                if let qrCode = engine.iphoneCameraQRCode {
                    HStack {
                        Spacer()
                        Image(nsImage: qrCode)
                            .interpolation(.none)
                            .resizable()
                            .frame(width: 150, height: 150)
                            .background(Color.white)
                            .padding(8)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        Spacer()
                    }
                    Text("Scanne ce QR avec l’iPhone. Safari enverra directement la caméra au Mac Scaleway par WebRTC.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    Text("Colle la clé privée adoptan.ai pour générer le QR sécurisé.")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }

                Button {
                    engine.copyIPhoneCameraLink()
                } label: {
                    Label("Copier le lien iPhone", systemImage: "doc.on.doc")
                }
                .buttonStyle(.link)
                .disabled(
                    engine.iphoneCameraKey
                        .trimmingCharacters(in: .whitespacesAndNewlines)
                        .isEmpty
                )
            } else {
                Picker("Caméra", selection: $engine.selectedCameraID) {
                    if engine.cameras.isEmpty {
                        Text("Aucune caméra").tag("")
                    }
                    ForEach(engine.cameras) { camera in
                        Text(camera.isIPhone ? "📱 \(camera.name)" : camera.name)
                            .tag(camera.id)
                    }
                }
                .onChange(of: engine.selectedCameraID) { _ in
                    guard engine.isCaptureReady, !engine.isConfiguring else { return }
                    Task { await engine.configureCapture() }
                }
            }

            HStack(alignment: .top, spacing: 7) {
                Circle()
                    .fill(engine.cameraHasFrames ? Color.green : Color.orange)
                    .frame(width: 8, height: 8)
                    .padding(.top, 4)
                Text(engine.cameraStatusText)
                    .font(.caption)
                    .foregroundStyle(engine.cameraHasFrames ? Color.green : Color.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Divider()

            Picker("Micro", selection: $engine.selectedMicrophoneID) {
                if engine.microphones.isEmpty {
                    Text("Aucun micro").tag("")
                }
                ForEach(engine.microphones) { microphone in
                    Text(
                        microphone.isIPhone
                            ? "📱 \(microphone.name) — non recommandé"
                            : microphone.name
                    )
                    .tag(microphone.id)
                }
            }

            Text(engine.audioStatusText)
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            Button {
                Task { await engine.refreshSources() }
            } label: {
                Label("Actualiser les appareils", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.link)
        }
    }

    private var sceneSection: some View {
        SettingsCard(title: "Scène", icon: "rectangle.3.group.fill") {
            Picker("Disposition", selection: $engine.scene) {
                ForEach(SceneLayout.allCases) { layout in
                    Text(layout.rawValue).tag(layout)
                }
            }
            .onChange(of: engine.scene) { _ in
                engine.applySceneLive()
            }

            if engine.scene == .screenCamera || engine.scene == .cameraScreen {
                Picker("Position", selection: $engine.overlayPosition) {
                    ForEach(OverlayPosition.allCases) { position in
                        Text(position.rawValue).tag(position)
                    }
                }
                .onChange(of: engine.overlayPosition) { _ in
                    engine.applySceneLive()
                }

                HStack {
                    Text("Taille incrustation")
                    Slider(value: $engine.overlayScale, in: 0.18...0.48)
                        .onChange(of: engine.overlayScale) { _ in
                            engine.applySceneLive()
                        }
                    Text("\(Int(engine.overlayScale * 100)) %")
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                        .frame(width: 40, alignment: .trailing)
                }
            }
        }
    }

    private var destinationSection: some View {
        SettingsCard(title: "Diffusion", icon: "antenna.radiowaves.left.and.right") {
            Picker("Plateforme", selection: $engine.platform) {
                ForEach(StreamPlatform.allCases) { platform in
                    Text(platform.rawValue).tag(platform)
                }
            }
            .onChange(of: engine.platform) { platform in
                engine.selectPlatform(platform)
            }

            TextField("Serveur RTMPS", text: $engine.serverURL)
                .textFieldStyle(.roundedBorder)

            HStack {
                Group {
                    if revealStreamKey {
                        TextField("Clé de stream", text: $engine.streamKey)
                    } else {
                        SecureField("Clé de stream", text: $engine.streamKey)
                    }
                }
                .textFieldStyle(.roundedBorder)

                Button {
                    revealStreamKey.toggle()
                } label: {
                    Image(systemName: revealStreamKey ? "eye.slash" : "eye")
                }
                .help(revealStreamKey ? "Masquer la clé" : "Afficher la clé")
            }

            Text("La clé est enregistrée dans le Trousseau macOS, jamais dans l’application.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var qualitySection: some View {
        SettingsCard(title: "Qualité", icon: "dial.high.fill") {
            Picker("Résolution", selection: $engine.resolution) {
                ForEach(OutputResolution.allCases) { resolution in
                    Text(resolution.rawValue).tag(resolution)
                }
            }
            .onChange(of: engine.resolution) { resolution in
                engine.videoBitrateKbps = resolution.recommendedBitrateKbps
            }

            Picker("Images/s", selection: $engine.fps) {
                ForEach(OutputFPS.allCases) { fps in
                    Text(fps.title).tag(fps)
                }
            }

            Stepper(
                "Vidéo : \(engine.videoBitrateKbps) kb/s",
                value: $engine.videoBitrateKbps,
                in: 1_500...8_000,
                step: 250
            )

            DisclosureGroup("Réglages avancés", isExpanded: $showAdvanced) {
                VStack(alignment: .leading, spacing: 10) {
                    Picker("Audio", selection: $engine.audioBitrateKbps) {
                        Text("96 kb/s").tag(96)
                        Text("128 kb/s").tag(128)
                        Text("160 kb/s").tag(160)
                        Text("192 kb/s").tag(192)
                    }
                    Toggle("Afficher le curseur", isOn: $engine.showCursor)
                    Text("Encodeur H.264 matériel · CBR · AAC 48 kHz · image-clé toutes les 2 s")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.top, 8)
            }

            Button("Profil stable 720p30") {
                engine.resolution = .p720
                engine.fps = .fps30
                engine.videoBitrateKbps = 3_500
                engine.audioBitrateKbps = 160
            }
            .buttonStyle(.link)
        }
    }

    private var audioSection: some View {
        SettingsCard(title: "Mixeur audio", icon: "speaker.wave.2.fill") {
            Toggle("Microphone", isOn: $engine.includeMicrophone)
            if engine.includeMicrophone {
                VolumeRow(title: "Volume micro", value: $engine.microphoneVolume)
            }

            Toggle("Son du Mac", isOn: $engine.includeSystemAudio)
            if engine.includeSystemAudio {
                VolumeRow(title: "Volume Mac", value: $engine.systemAudioVolume)
            }

            Toggle("Micro de l’iPhone distant", isOn: $engine.includeIPhoneAudio)
            if engine.includeIPhoneAudio {
                VolumeRow(
                    title: "Volume iPhone",
                    value: $engine.iphoneAudioVolume
                )
            }
        }
    }

    private var cameraSection: some View {
        SettingsCard(title: "Caméra iPhone", icon: "iphone") {
            Toggle("Effet miroir", isOn: $engine.mirrorCamera)
                .onChange(of: engine.mirrorCamera) { _ in
                    engine.applySceneLive()
                }
            Toggle("Retourner à 180°", isOn: $engine.rotateCamera180)
                .onChange(of: engine.rotateCamera180) { _ in
                    engine.applySceneLive()
                }
            Text(
                engine.cameraInputMode == .iphoneNetwork
                    ? "Mode Scaleway : l’iPhone envoie la vidéo à distance par WebRTC, sans Caméra de continuité."
                    : "Le mode macOS nécessite Caméra de continuité pour utiliser directement l’iPhone."
            )
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Aperçu du programme")
                    .font(.headline)
                Text(engine.message)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            Spacer()
            StatusPill(state: engine.liveState, captureReady: engine.isCaptureReady)
        }
        .padding(.horizontal, 18)
        .frame(height: 66)
        .background(Color(nsColor: .controlBackgroundColor))
    }

    private var preview: some View {
        GeometryReader { geometry in
            ZStack {
                Color.black
                MTHKViewRepresentable(previewSource: engine, videoGravity: .resizeAspect)

                if !engine.isCaptureReady {
                    VStack(spacing: 12) {
                        ProgressView()
                            .controlSize(.large)
                        Text(engine.isConfiguring ? "Préparation des sources…" : "Capture en attente")
                            .foregroundStyle(.white.opacity(0.85))
                    }
                }
            }
            .frame(
                width: min(geometry.size.width, geometry.size.height * 16 / 9),
                height: min(geometry.size.height, geometry.size.width * 9 / 16)
            )
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .shadow(color: .black.opacity(0.3), radius: 18)
            .position(x: geometry.size.width / 2, y: geometry.size.height / 2)
        }
        .padding(22)
        .background(Color(nsColor: .underPageBackgroundColor))
    }

    private var liveBar: some View {
        HStack(spacing: 14) {
            if case .failed(let error) = engine.liveState {
                Label(error, systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
                    .lineLimit(2)
            } else {
                Label(
                    "\(engine.resolution.rawValue) · \(engine.fps.rawValue) i/s · \(engine.videoBitrateKbps) kb/s",
                    systemImage: "waveform.path.ecg"
                )
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer()

            if engine.liveState == .live || engine.liveState == .connecting {
                Button(role: .destructive) {
                    Task { await engine.stopLive() }
                } label: {
                    Label("Arrêter le direct", systemImage: "stop.fill")
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            } else {
                Button {
                    Task { await engine.startLive() }
                } label: {
                    Label("Lancer le direct", systemImage: "record.circle")
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
                .controlSize(.large)
                .disabled(!engine.isCaptureReady || engine.isConfiguring)
            }
        }
        .padding(.horizontal, 18)
        .frame(minHeight: 66)
        .background(Color(nsColor: .controlBackgroundColor))
    }
}

private struct SettingsCard<Content: View>: View {
    let title: String
    let icon: String
    @ViewBuilder let content: Content

    var body: some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 10) {
                content
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 2)
        } label: {
            Label(title, systemImage: icon)
                .font(.subheadline.weight(.semibold))
        }
    }
}

private struct VolumeRow: View {
    let title: String
    @Binding var value: Double

    var body: some View {
        HStack {
            Text(title)
            Slider(value: $value, in: 0...1.5)
            Text("\(Int(value * 100)) %")
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)
                .frame(width: 44, alignment: .trailing)
        }
    }
}

private struct StatusPill: View {
    let state: LiveState
    let captureReady: Bool

    private var color: Color {
        switch state {
        case .live: return .red
        case .connecting, .stopping: return .orange
        case .failed: return .red
        case .idle: return captureReady ? .green : .gray
        }
    }

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text(state.title)
                .font(.caption.weight(.semibold))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(color.opacity(0.14), in: Capsule())
        .foregroundStyle(color)
    }
}
