@preconcurrency import AVFoundation
@preconcurrency import CoreMedia
import Foundation
import HaishinKit

/// Reads the remote iPhone as an MPEG-TS stream transported by SRT. SRT repairs
/// packet loss before HaishinKit decodes H.264/AAC, which is much more tolerant
/// of Wi-Fi and mobile-network jitter than the browser camera path.
final class SRTCameraSource: StreamOutput, @unchecked Sendable {
    private let mixer: MediaMixer
    private let stateQueue = DispatchQueue(
        label: "ai.adoptan.miniobs.srt-camera-state",
        qos: .userInteractive
    )

    private var session: (any Session)?
    private var sessionStream: (any StreamConvertible)?
    private var connectionTask: Task<Void, Never>?
    private var readyStateTask: Task<Void, Never>?
    private var sourceURL: URL?
    private var generation = 0
    private var reconnectScheduled = false
    private var pendingVideo: CMSampleBuffer?
    private var videoAppendInFlight = false
    private var lastCallbackUptime = 0.0

    var onFrame: (() -> Void)?
    var onStatus: ((String) -> Void)?

    init(mixer: MediaMixer) {
        self.mixer = mixer
    }

    func start(url: URL) async {
        await stop()
        sourceURL = url
        generation += 1
        reconnectScheduled = false
        let currentGeneration = generation
        emitStatus("Connexion SRT à la caméra de l’iPhone…")
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

        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            stateQueue.async { [weak self] in
                self?.pendingVideo = nil
                self?.videoAppendInFlight = false
                self?.reconnectScheduled = false
                self?.lastCallbackUptime = 0
                continuation.resume()
            }
        }
    }

    private func scheduleConnection(
        generation expectedGeneration: Int,
        delayNanoseconds: UInt64
    ) {
        connectionTask?.cancel()
        reconnectScheduled = true
        connectionTask = Task { [weak self] in
            if delayNanoseconds > 0 {
                try? await Task.sleep(nanoseconds: delayNanoseconds)
            }
            guard !Task.isCancelled, let self else { return }
            self.reconnectScheduled = false
            await self.connect(generation: expectedGeneration)
        }
    }

    private func connect(generation expectedGeneration: Int) async {
        guard expectedGeneration == generation, let sourceURL else { return }

        do {
            guard let newSession = try await SessionBuilderFactory.shared
                .make(sourceURL)
                .setMethod(.playback)
                .build() else {
                throw SRTCameraError.sessionUnavailable
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
            emitStatus("SRT connecté — décodage de la caméra iPhone…")
        } catch {
            guard expectedGeneration == generation else { return }
            emitStatus("Caméra SRT hors ligne — nouvelle tentative dans 2 secondes…")
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
                guard !Task.isCancelled, let self,
                      expectedGeneration == self.generation else { return }
                switch state {
                case .connecting:
                    self.emitStatus("Connexion SRT à l’iPhone…")
                case .open:
                    self.emitStatus("SRT relié — attente de la première image…")
                case .closing:
                    self.emitStatus("La caméra SRT se déconnecte…")
                case .closed:
                    self.connectionDidClose(generation: expectedGeneration)
                }
            }
        }
    }

    private func connectionDidClose(generation expectedGeneration: Int) {
        stateQueue.async { [weak self] in
            guard let self, expectedGeneration == self.generation,
                  !self.reconnectScheduled else { return }
            self.emitStatus("Liaison SRT interrompue — reconnexion automatique…")
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
        stateQueue.async { [weak self] in
            guard let self else { return }
            // Keep at most one waiting frame. If decoding briefly outruns the
            // mixer, stale frames are replaced instead of building up latency.
            self.pendingVideo = video
            self.appendLatestVideoIfPossible()
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

    private func appendLatestVideoIfPossible() {
        guard !videoAppendInFlight, let video = pendingVideo else { return }
        pendingVideo = nil
        videoAppendInFlight = true

        Task { [weak self] in
            guard let self else { return }
            await self.mixer.append(video, track: VideoSourceTrack.camera)
            let now = ProcessInfo.processInfo.systemUptime
            self.stateQueue.async { [weak self] in
                guard let self else { return }
                self.videoAppendInFlight = false
                if self.lastCallbackUptime == 0 || now - self.lastCallbackUptime >= 0.5 {
                    self.lastCallbackUptime = now
                    DispatchQueue.main.async { [weak self] in
                        self?.onFrame?()
                    }
                }
                self.appendLatestVideoIfPossible()
            }
        }
    }

    private func emitStatus(_ status: String) {
        DispatchQueue.main.async { [weak self] in
            self?.onStatus?(status)
        }
    }
}

private enum SRTCameraError: LocalizedError {
    case sessionUnavailable

    var errorDescription: String? {
        "Le lecteur SRT de la caméra iPhone n’a pas pu être créé."
    }
}
