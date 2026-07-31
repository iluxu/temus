@preconcurrency import ScreenCaptureKit
import CoreMedia
import CoreVideo
import Foundation
import HaishinKit

final class ScreenCaptureSource: NSObject, SCStreamOutput, SCStreamDelegate {
    private let mixer: MediaMixer
    private let videoSampleQueue = DispatchQueue(
        label: "ai.adoptan.miniobs.screen-video",
        qos: .userInteractive
    )
    private let audioSampleQueue = DispatchQueue(
        label: "ai.adoptan.miniobs.screen-audio",
        qos: .userInitiated
    )
    private var stream: SCStream?
    private var includeSystemAudio = true
    private var pendingVideo: CMSampleBuffer?
    private var videoAppendInFlight = false
    private var lastFrameCallbackTime = 0.0

    var onFrame: (() -> Void)?
    var onError: ((String) -> Void)?

    init(mixer: MediaMixer) {
        self.mixer = mixer
        super.init()
    }

    func start(
        display: SCDisplay,
        outputSize: CGSize,
        fps: Int,
        includeSystemAudio: Bool,
        showCursor: Bool
    ) async throws {
        await stop()
        self.includeSystemAudio = includeSystemAudio
        lastFrameCallbackTime = 0

        let filter = SCContentFilter(
            display: display,
            excludingApplications: [],
            exceptingWindows: []
        )
        let configuration = SCStreamConfiguration()
        configuration.width = Int(outputSize.width)
        configuration.height = Int(outputSize.height)
        configuration.minimumFrameInterval = CMTime(value: 1, timescale: CMTimeScale(fps))
        // Apple's supported maximum gives the remote Mac enough breathing room
        // during short GPU/encoder stalls without stopping ScreenCaptureKit.
        configuration.queueDepth = 8
        configuration.pixelFormat = kCVPixelFormatType_32BGRA
        configuration.scalesToFit = true
        configuration.showsCursor = showCursor
        configuration.capturesAudio = includeSystemAudio
        configuration.excludesCurrentProcessAudio = true
        configuration.sampleRate = 48_000
        configuration.channelCount = 2

        let stream = SCStream(filter: filter, configuration: configuration, delegate: self)
        try stream.addStreamOutput(self, type: .screen, sampleHandlerQueue: videoSampleQueue)
        if includeSystemAudio {
            try stream.addStreamOutput(self, type: .audio, sampleHandlerQueue: audioSampleQueue)
        }
        self.stream = stream
        try await stream.startCapture()
    }

    func stop() async {
        guard let stream else {
            clearPendingVideo()
            return
        }
        self.stream = nil
        try? await stream.stopCapture()
        clearPendingVideo()
    }

    func stream(
        _ stream: SCStream,
        didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
        of outputType: SCStreamOutputType
    ) {
        guard sampleBuffer.isValid, sampleBuffer.dataReadiness == .ready else { return }

        switch outputType {
        case .screen:
            guard isCompleteFrame(sampleBuffer) else { return }
            // Always retain the newest complete frame only. An unbounded Task
            // per frame used to make the preview progressively lag and freeze.
            pendingVideo = sampleBuffer
            appendLatestVideoIfPossible()
        case .audio where includeSystemAudio:
            Task {
                await mixer.append(sampleBuffer, track: 1)
            }
        default:
            break
        }
    }

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        DispatchQueue.main.async { [weak self] in
            self?.onError?("La capture d’écran s’est arrêtée : \(error.localizedDescription)")
        }
    }

    private func isCompleteFrame(_ sampleBuffer: CMSampleBuffer) -> Bool {
        guard let attachments = CMSampleBufferGetSampleAttachmentsArray(
            sampleBuffer,
            createIfNecessary: false
        ) as? [[SCStreamFrameInfo: Any]],
        let frame = attachments.first,
        let rawStatus = frame[.status] as? Int,
        let status = SCFrameStatus(rawValue: rawStatus) else {
            return false
        }
        return status == .complete
    }

    private func appendLatestVideoIfPossible() {
        guard !videoAppendInFlight, let video = pendingVideo else { return }
        pendingVideo = nil
        videoAppendInFlight = true

        Task { [weak self] in
            guard let self else { return }
            // Preserve the direct version-1 route: the screen owns track 0.
            await self.mixer.append(video, track: VideoSourceTrack.screen)
            let now = ProcessInfo.processInfo.systemUptime
            self.videoSampleQueue.async { [weak self] in
                guard let self else { return }
                self.videoAppendInFlight = false
                if self.lastFrameCallbackTime == 0 ||
                    now - self.lastFrameCallbackTime >= 0.5 {
                    self.lastFrameCallbackTime = now
                    DispatchQueue.main.async { [weak self] in
                        self?.onFrame?()
                    }
                }
                self.appendLatestVideoIfPossible()
            }
        }
    }

    private func clearPendingVideo() {
        videoSampleQueue.async { [weak self] in
            self?.pendingVideo = nil
        }
    }
}
