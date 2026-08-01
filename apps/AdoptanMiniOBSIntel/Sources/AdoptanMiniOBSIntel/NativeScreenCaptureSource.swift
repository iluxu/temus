@preconcurrency import ScreenCaptureKit
import CoreGraphics
import CoreMedia
import CoreVideo
import Foundation

final class NativeScreenCaptureSource: NSObject, SCStreamOutput, SCStreamDelegate, @unchecked Sendable {
    private let sampleQueue = DispatchQueue(
        label: "ai.adoptan.miniobs.intel.screen-frames",
        qos: .userInteractive
    )
    private let writeQueue = DispatchQueue(
        label: "ai.adoptan.miniobs.intel.screen-pipe",
        qos: .userInteractive
    )
    private let stateLock = NSLock()

    private var stream: SCStream?
    private var output: FileHandle?
    private var outputWidth = 0
    private var outputHeight = 0
    private var didReportWriteFailure = false
    private var writePending = false
    private var captureGeneration = 0

    var onError: ((String) -> Void)?

    static func availableDisplays() async throws -> [FFmpegDevice] {
        let content = try await SCShareableContent.excludingDesktopWindows(
            false,
            onScreenWindowsOnly: true
        )
        return content.displays
            .sorted { $0.displayID < $1.displayID }
            .enumerated()
            .map { position, display in
                FFmpegDevice(
                    index: Int(display.displayID),
                    name: "Écran \(position + 1) — \(display.width) × \(display.height)",
                    kind: .video
                )
            }
    }

    func start(
        displayID: CGDirectDisplayID,
        width: Int,
        height: Int,
        fps: Int,
        showCursor: Bool,
        output: FileHandle
    ) async throws {
        await stop()

        let content = try await SCShareableContent.excludingDesktopWindows(
            false,
            onScreenWindowsOnly: true
        )
        guard let display = content.displays.first(where: { $0.displayID == displayID }) else {
            throw NativeScreenError.displayUnavailable
        }

        let filter = SCContentFilter(
            display: display,
            excludingApplications: [],
            exceptingWindows: []
        )
        let configuration = SCStreamConfiguration()
        configuration.width = width
        configuration.height = height
        configuration.minimumFrameInterval = CMTime(
            value: 1,
            timescale: CMTimeScale(fps)
        )
        configuration.queueDepth = 4
        configuration.pixelFormat = kCVPixelFormatType_32BGRA
        configuration.showsCursor = showCursor
        configuration.capturesAudio = false

        let stream = SCStream(filter: filter, configuration: configuration, delegate: self)
        try stream.addStreamOutput(self, type: .screen, sampleHandlerQueue: sampleQueue)

        stateLock.lock()
        captureGeneration += 1
        self.stream = stream
        self.output = output
        outputWidth = width
        outputHeight = height
        didReportWriteFailure = false
        writePending = false
        stateLock.unlock()

        do {
            try await stream.startCapture()
        } catch {
            stateLock.lock()
            self.stream = nil
            self.output = nil
            stateLock.unlock()
            throw error
        }
    }

    func stop() async {
        stateLock.lock()
        let activeStream = stream
        captureGeneration += 1
        stream = nil
        output = nil
        writePending = false
        stateLock.unlock()

        if let activeStream {
            try? await activeStream.stopCapture()
        }
    }

    func stream(
        _ stream: SCStream,
        didOutputSampleBuffer sampleBuffer: CMSampleBuffer,
        of outputType: SCStreamOutputType
    ) {
        guard outputType == .screen,
              sampleBuffer.isValid,
              sampleBuffer.dataReadiness == .ready,
              let pixelBuffer = sampleBuffer.imageBuffer else { return }

        stateLock.lock()
        let destination = output
        let width = outputWidth
        let height = outputHeight
        let generation = captureGeneration
        let canWrite = destination != nil && !writePending
        if canWrite {
            writePending = true
        }
        stateLock.unlock()
        guard canWrite, let destination, width > 0, height > 0 else { return }

        CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }

        guard CVPixelBufferGetPixelFormatType(pixelBuffer) == kCVPixelFormatType_32BGRA,
              let source = CVPixelBufferGetBaseAddress(pixelBuffer) else {
            finishWrite(generation: generation)
            return
        }

        let sourceWidth = CVPixelBufferGetWidth(pixelBuffer)
        let sourceHeight = CVPixelBufferGetHeight(pixelBuffer)
        let sourceBytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
        let destinationBytesPerRow = width * 4
        let copiedBytesPerRow = min(sourceWidth, width) * 4
        let copiedHeight = min(sourceHeight, height)

        var frame = Data(count: destinationBytesPerRow * height)
        frame.withUnsafeMutableBytes { destinationBuffer in
            guard let destinationBase = destinationBuffer.baseAddress else { return }
            for row in 0..<copiedHeight {
                memcpy(
                    destinationBase.advanced(by: row * destinationBytesPerRow),
                    source.advanced(by: row * sourceBytesPerRow),
                    copiedBytesPerRow
                )
            }
        }

        writeQueue.async { [weak self] in
            do {
                try destination.write(contentsOf: frame)
                self?.finishWrite(generation: generation)
            } catch {
                self?.reportWriteFailure(error, generation: generation)
            }
        }
    }

    func stream(_ stream: SCStream, didStopWithError error: Error) {
        DispatchQueue.main.async { [weak self] in
            self?.onError?("ScreenCaptureKit : \(error.localizedDescription)")
        }
    }

    private func finishWrite(generation: Int) {
        stateLock.lock()
        if generation == captureGeneration {
            writePending = false
        }
        stateLock.unlock()
    }

    private func reportWriteFailure(_ error: Error, generation: Int) {
        stateLock.lock()
        let isCurrent = generation == captureGeneration
        let shouldReport = isCurrent && !didReportWriteFailure && output != nil
        guard isCurrent else {
            stateLock.unlock()
            return
        }
        didReportWriteFailure = true
        writePending = false
        output = nil
        stateLock.unlock()
        guard shouldReport else { return }
        DispatchQueue.main.async { [weak self] in
            self?.onError?("Transfert de l’écran interrompu : \(error.localizedDescription)")
        }
    }
}

private enum NativeScreenError: LocalizedError {
    case displayUnavailable

    var errorDescription: String? {
        "L’écran choisi n’est plus disponible. Actualise les appareils."
    }
}
