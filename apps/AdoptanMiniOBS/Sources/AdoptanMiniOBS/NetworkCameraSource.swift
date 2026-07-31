@preconcurrency import AVFoundation
import CoreMedia
import Foundation
import HaishinKit
import RTCHaishinKit

/// Receives the iPhone camera over WHEP/WebRTC from MediaMTX.
///
/// The previous HLS reader accumulated latency and had to reload the playlist
/// when Safari or the network paused. WHEP receives the same H.264 stream sent
/// by the iPhone WHIP page, but keeps it on the real-time WebRTC path.
final class NetworkCameraSource: StreamOutput, @unchecked Sendable {
    private let mixer: MediaMixer
    private let stateQueue = DispatchQueue(
        label: "ai.adoptan.miniobs.network-camera-state",
        qos: .userInitiated
    )

    private var session: (any Session)?
    private var sessionStream: (any StreamConvertible)?
    private var connectionTask: Task<Void, Never>?
    private var readyStateTask: Task<Void, Never>?
    private var sourceURL: URL?
    private var generation = 0
    private var lastCallbackUptime = 0.0

    var onFrame: (() -> Void)?
    var onStatus: ((String) -> Void)?

    init(mixer: MediaMixer) {
        self.mixer = mixer
    }

    func start(url: URL, fps: Int) async {
        await stop()
        sourceURL = url
        generation += 1
        let currentGeneration = generation
        emitStatus("Connexion WebRTC à la caméra de l’iPhone…")
        scheduleConnection(generation: currentGeneration, delayNanoseconds: 0)
    }

    func stop() async {
        generation += 1
        connectionTask?.cancel()
        connectionTask = nil
        readyStateTask?.cancel()
        readyStateTask = nil

        if let sessionStream {
            await sessionStream.removeOutput(self)
        }
        if let session {
            try? await session.close()
        }
        self.session = nil
        sessionStream = nil
        sourceURL = nil
        lastCallbackUptime = 0
    }

    private func scheduleConnection(
        generation expectedGeneration: Int,
        delayNanoseconds: UInt64
    ) {
        connectionTask?.cancel()
        connectionTask = Task { [weak self] in
            if delayNanoseconds > 0 {
                try? await Task.sleep(nanoseconds: delayNanoseconds)
            }
            guard !Task.isCancelled else { return }
            await self?.connect(generation: expectedGeneration)
        }
    }

    private func connect(generation expectedGeneration: Int) async {
        guard expectedGeneration == generation, let sourceURL else { return }

        do {
            guard let newSession = try await SessionBuilderFactory.shared
                .make(sourceURL)
                .setMethod(.playback)
                .build() else {
                throw NetworkCameraError.sessionUnavailable
            }

            let stream = await newSession.stream
            await stream.addOutput(self)
            session = newSession
            sessionStream = stream
            observeReadyState(of: newSession, generation: expectedGeneration)

            try await newSession.connect { [weak self] in
                self?.connectionDidClose(generation: expectedGeneration)
            }

            guard expectedGeneration == generation else {
                await stream.removeOutput(self)
                try? await newSession.close()
                return
            }
            emitStatus("iPhone relié en WebRTC — attente de la première image…")
        } catch {
            guard expectedGeneration == generation else { return }
            emitStatus(
                "Caméra iPhone hors ligne — nouvelle tentative WebRTC automatique…"
            )
            scheduleConnection(
                generation: expectedGeneration,
                delayNanoseconds: 2_000_000_000
            )
        }
    }

    private func observeReadyState(
        of session: any Session,
        generation expectedGeneration: Int
    ) {
        readyStateTask?.cancel()
        readyStateTask = Task { [weak self] in
            for await state in await session.readyState {
                guard !Task.isCancelled else { return }
                guard let self, expectedGeneration == self.generation else { return }
                switch state {
                case .connecting:
                    self.emitStatus("Négociation WebRTC avec l’iPhone…")
                case .open:
                    self.emitStatus("WebRTC connecté — décodage de la caméra…")
                case .closing:
                    self.emitStatus("La caméra iPhone se déconnecte…")
                case .closed:
                    self.connectionDidClose(generation: expectedGeneration)
                }
            }
        }
    }

    private func connectionDidClose(generation expectedGeneration: Int) {
        stateQueue.async { [weak self] in
            guard let self, expectedGeneration == self.generation else { return }
            self.emitStatus(
                "Liaison iPhone interrompue — reconnexion dans 2 secondes…"
            )
            self.scheduleConnection(
                generation: expectedGeneration,
                delayNanoseconds: 2_000_000_000
            )
        }
    }

    nonisolated func stream(
        _ stream: some StreamConvertible,
        didOutput video: CMSampleBuffer
    ) {
        guard video.isValid, video.dataReadiness == .ready else { return }
        Task {
            await mixer.append(video, track: VideoSourceTrack.camera)
        }

        let now = ProcessInfo.processInfo.systemUptime
        stateQueue.async { [weak self] in
            guard let self else { return }
            if self.lastCallbackUptime == 0 ||
                now - self.lastCallbackUptime >= 0.5 {
                self.lastCallbackUptime = now
                DispatchQueue.main.async { [weak self] in
                    self?.onFrame?()
                }
            }
        }
    }

    nonisolated func stream(
        _ stream: some StreamConvertible,
        didOutput audio: AVAudioBuffer,
        when: AVAudioTime
    ) {
        Task {
            await mixer.append(audio, when: when, track: 2)
        }
    }

    private func emitStatus(_ status: String) {
        DispatchQueue.main.async { [weak self] in
            self?.onStatus?(status)
        }
    }
}

private enum NetworkCameraError: LocalizedError {
    case sessionUnavailable

    var errorDescription: String? {
        "Le lecteur WebRTC de la caméra iPhone n’a pas pu être créé."
    }
}
