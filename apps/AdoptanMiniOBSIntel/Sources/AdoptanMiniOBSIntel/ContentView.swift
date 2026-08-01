import AppKit
import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var studio: StudioViewModel

    var body: some View {
        HSplitView {
            controls
                .frame(minWidth: 350, idealWidth: 390, maxWidth: 440)
            preview
                .frame(minWidth: 680)
        }
        .task { await studio.prepare() }
        .onReceive(NotificationCenter.default.publisher(for: NSApplication.willTerminateNotification)) { _ in
            studio.shutdown()
        }
    }

    private var controls: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Adoptan Mini OBS — Intel Clean")
                        .font(.title2.bold())
                    Text("Nouveau moteur FFmpeg · aucune Caméra de continuité")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                GroupBox("1 · Autorisation macOS neuve") {
                    VStack(alignment: .leading, spacing: 9) {
                        Label(
                            studio.screenAuthorized ? "Écran autorisé" : "Écran non autorisé",
                            systemImage: studio.screenAuthorized ? "checkmark.circle.fill" : "exclamationmark.triangle.fill"
                        )
                        .foregroundStyle(studio.screenAuthorized ? .green : .orange)
                        HStack {
                            Button("Autoriser l’écran") { studio.requestScreenPermission() }
                            Button("Ouvrir les réglages") { studio.openScreenSettings() }
                        }
                        Text("Après la première autorisation, quitte complètement l’app puis relance-la.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.top, 4)
                }

                GroupBox("2 · Sources") {
                    VStack(alignment: .leading, spacing: 10) {
                        Picker("Écran", selection: $studio.selectedScreenID) {
                            if studio.screens.isEmpty { Text("Aucun écran").tag("") }
                            ForEach(studio.screens) { Text($0.name).tag($0.id) }
                        }
                        Picker("Micro Mac", selection: $studio.selectedMicrophoneID) {
                            Text("Aucun").tag("")
                            ForEach(studio.microphones) { Text($0.name).tag($0.id) }
                        }
                        Button("Actualiser les appareils") {
                            Task { await studio.refreshDevices() }
                        }
                        .buttonStyle(.link)
                    }
                    .padding(.top, 4)
                }

                GroupBox("3 · Caméra iPhone Moblin") {
                    VStack(alignment: .leading, spacing: 8) {
                        if let qr = studio.moblinQRCode {
                            HStack {
                                Spacer()
                                Image(nsImage: qr)
                                    .interpolation(.none)
                                    .resizable()
                                    .frame(width: 170, height: 170)
                                    .padding(7)
                                    .background(.white)
                                Spacer()
                            }
                        }
                        Text("Moblin envoie en SRT au serveur. L’app lit ensuite le relais HLS testé, sans le décodeur SRT défectueux.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Button("Copier l’adresse Moblin") { studio.copyMoblinURL() }
                            .buttonStyle(.link)
                    }
                    .padding(.top, 4)
                }

                GroupBox("4 · Tests obligatoires") {
                    VStack(spacing: 9) {
                        testButton("Tester l’écran seul", icon: "display") {
                            await studio.testScreen()
                        }
                        testButton("Tester la caméra seule", icon: "iphone") {
                            await studio.testCamera()
                        }
                        testButton("Tester écran + caméra", icon: "rectangle.inset.filled.and.person.filled") {
                            await studio.testCombined()
                        }
                        if studio.isRunning && !studio.isLive {
                            Button {
                                Task { await studio.stop() }
                            } label: {
                                Label("Arrêter le test", systemImage: "stop.fill")
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    .padding(.top, 4)
                }

                GroupBox("5 · Qualité et scène") {
                    VStack(alignment: .leading, spacing: 10) {
                        Picker("Scène", selection: $studio.scene) {
                            ForEach(StudioScene.allCases) { Text($0.rawValue).tag($0) }
                        }
                        Picker("Résolution", selection: $studio.resolution) {
                            ForEach(StudioResolution.allCases) { Text($0.rawValue).tag($0) }
                        }
                        Picker("Images/s", selection: $studio.fps) {
                            Text("24").tag(24)
                            Text("30").tag(30)
                        }
                        Toggle("Afficher le curseur", isOn: $studio.showCursor)
                        Toggle("Miroir caméra", isOn: $studio.mirrorCamera)
                        Toggle("Son de l’iPhone", isOn: $studio.includeIPhoneAudio)
                        Button("Profil Intel stable 720p30") { studio.useStableProfile() }
                            .buttonStyle(.link)
                    }
                    .padding(.top, 4)
                }

                GroupBox("6 · Direct") {
                    VStack(alignment: .leading, spacing: 10) {
                        Picker("Plateforme", selection: $studio.platform) {
                            ForEach(StudioPlatform.allCases) { Text($0.rawValue).tag($0) }
                        }
                        .onChange(of: studio.platform) { studio.selectPlatform($0) }
                        TextField("Serveur RTMP", text: $studio.serverURL)
                        SecureField("Clé de stream", text: $studio.streamKey)
                        HStack {
                            Text("Débit vidéo")
                            Slider(
                                value: Binding(
                                    get: { Double(studio.videoBitrateKbps) },
                                    set: { studio.videoBitrateKbps = Int($0) }
                                ),
                                in: 1_800...6_000,
                                step: 100
                            )
                            Text("\(studio.videoBitrateKbps)k")
                                .font(.caption.monospacedDigit())
                        }
                        Button(studio.isLive ? "ARRÊTER LE DIRECT" : "LANCER LE DIRECT") {
                            Task { await studio.toggleLive() }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(studio.isLive ? .red : .purple)
                        .controlSize(.large)
                        .frame(maxWidth: .infinity)
                    }
                    .padding(.top, 4)
                }
            }
            .padding(16)
        }
        .background(Color(nsColor: .controlBackgroundColor))
    }

    private var preview: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Aperçu du programme")
                        .font(.headline)
                    Text(studio.status)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }
                Spacer()
                if studio.isRunning {
                    Text("STABLE \(studio.stableSeconds) s")
                        .font(.caption.bold().monospacedDigit())
                        .padding(.horizontal, 11)
                        .padding(.vertical, 6)
                        .background(studio.isLive ? Color.red : Color.green)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
            }
            .padding(18)
            .background(Color(nsColor: .controlBackgroundColor))

            GeometryReader { geometry in
                ZStack {
                    Color.black
                    if let image = studio.previewImage {
                        Image(nsImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } else {
                        VStack(spacing: 12) {
                            if studio.isBusy { ProgressView().controlSize(.large) }
                            Image(systemName: "display.trianglebadge.exclamationmark")
                                .font(.system(size: 45))
                            Text("Lance un des trois tests à gauche")
                                .font(.headline)
                        }
                        .foregroundStyle(.white.opacity(0.82))
                    }
                }
                .frame(
                    width: min(geometry.size.width, geometry.size.height * 16 / 9),
                    height: min(geometry.size.height, geometry.size.width * 9 / 16)
                )
                .position(x: geometry.size.width / 2, y: geometry.size.height / 2)
            }
            .padding(22)
            .background(Color(nsColor: .underPageBackgroundColor))
        }
    }

    private func testButton(
        _ title: String,
        icon: String,
        action: @escaping () async -> Void
    ) -> some View {
        Button {
            Task { await action() }
        } label: {
            Label(title, systemImage: icon)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .buttonStyle(.borderedProminent)
        .disabled(studio.isBusy || studio.isLive)
    }
}
