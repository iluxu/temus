@preconcurrency import CoreMedia
import Foundation
import HaishinKit

/// Browser-camera fallback. AVFoundation reads MediaMTX's HLS output directly,
/// avoiding the WebRTC binary dependency whose published Intel slice is empty.
/// The recommended iPhone path remains native SRT through `SRTCameraSource`.
final class NetworkCameraSource: @unchecked Sendable {
    private let mixer: MediaMixer
    private let stateQueue = DispatchQueue(
        label: "ai.adoptan.miniobs.browser-camera-state",
        qos: .userInteractive
    )
    private var pendingVideo: CMSampleBuffer?
    private var videoAppendInFlight = false
    private var lastCallbackUptime = 0.0

    private lazy var hlsSource: HLSCameraFallback = {
        let source = HLSCameraFallback()
        source.onSampleBuffer = { [weak self] sampleBuffer in
            self?.receiveVideo(sampleBuffer)
        }
        source.onStatus = { [weak self] status in
            self?.emitStatus(status)
        }
        return source
    }()

    var onFrame: (() -> Void)?
    var onStatus: ((String) -> Void)?

    init(mixer: MediaMixer) {
        self.mixer = mixer
    }

    func start(hlsURL: URL, fps: Int) async {
        await stop()
        emitStatus("Connexion au lecteur vidéo Safari de secours…")
        await hlsSource.start(url: hlsURL, fps: fps)
    }

    func stop() async {
        await hlsSource.stop()
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            stateQueue.async { [weak self] in
                self?.pendingVideo = nil
                self?.lastCallbackUptime = 0
                continuation.resume()
            }
        }
    }

    private func receiveVideo(_ video: CMSampleBuffer) {
        guard video.isValid, video.dataReadiness == .ready else { return }
        stateQueue.async { [weak self] in
            guard let self else { return }
            self.pendingVideo = video
            self.appendLatestVideoIfPossible()
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
