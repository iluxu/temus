@preconcurrency import ScreenCaptureKit
import CoreMedia
import CoreVideo
import HaishinKit

final class ScreenCaptureSource: NSObject, SCStreamOutput, SCStreamDelegate {
    private let mixer: MediaMixer
    private let sampleQueue = DispatchQueue(
        label: "ai.adoptan.miniobs.screen-samples",
        qos: .userInteractive
    )
    private var stream: SCStream?
    private var includeSystemAudio = true

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

        let filter = SCContentFilter(
            display: display,
            excludingApplications: [],
            exceptingWindows: []
        )
        let configuration = SCStreamConfiguration()
        configuration.width = Int(outputSize.width)
        configuration.height = Int(outputSize.height)
        configuration.minimumFrameInterval = CMTime(value: 1, timescale: CMTimeScale(fps))
        configuration.queueDepth = 5
        configuration.pixelFormat = kCVPixelFormatType_32BGRA
        configuration.showsCursor = showCursor
        configuration.capturesAudio = includeSystemAudio
        configuration.excludesCurrentProcessAudio = true
        configuration.sampleRate = 48_000
        configuration.channelCount = 2

        let stream = SCStream(filter: filter, configuration: configuration, delegate: self)
        try stream.addStreamOutput(self, type: .screen, sampleHandlerQueue: sampleQueue)
        if includeSystemAudio {
            try stream.addStreamOutput(self, type: .audio, sampleHandlerQueue: sampleQueue)
        }
        self.stream = stream
        try await stream.startCapture()
    }

    func stop() async {
        guard let stream else { return }
        self.stream = nil
        try? await stream.stopCapture()
    }

    func stream(
        _ stream: SCStream,
        didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
        of outputType: SCStreamOutputType
    ) {
        guard sampleBuffer.isValid, sampleBuffer.dataReadiness == .ready else { return }

        switch outputType {
        case .screen:
            Task {
                await mixer.append(sampleBuffer, track: 0)
            }
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
}
