@preconcurrency import AVFoundation
import CoreMedia
import CoreVideo
import Foundation
import HaishinKit

final class CameraCaptureSource: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    private enum CaptureError: LocalizedError {
        case cannotAddInput
        case cannotAddOutput
        case didNotStart

        var errorDescription: String? {
            switch self {
            case .cannotAddInput:
                return "macOS refuse l’entrée de cette caméra."
            case .cannotAddOutput:
                return "macOS refuse la sortie vidéo de cette caméra."
            case .didNotStart:
                return "la session vidéo native ne s’est pas lancée."
            }
        }
    }

    private let mixer: MediaMixer
    private let session = AVCaptureSession()
    private let sessionQueue = DispatchQueue(
        label: "ai.adoptan.miniobs.camera-session",
        qos: .userInitiated
    )
    private let sampleQueue = DispatchQueue(
        label: "ai.adoptan.miniobs.camera-samples",
        qos: .userInteractive
    )
    private var lastFrameCallbackTime = 0.0
    private var observers: [NSObjectProtocol] = []

    var onFrame: (() -> Void)?
    var onError: ((String) -> Void)?

    init(mixer: MediaMixer) {
        self.mixer = mixer
        super.init()
        observeSession()
    }

    deinit {
        observers.forEach(NotificationCenter.default.removeObserver)
    }

    func start(device: AVCaptureDevice, fps: Int) async throws {
        await stop()
        try await withCheckedThrowingContinuation { continuation in
            sessionQueue.async { [weak self] in
                guard let self else {
                    continuation.resume(throwing: CaptureError.didNotStart)
                    return
                }

                do {
                    self.session.beginConfiguration()
                    defer { self.session.commitConfiguration() }

                    for input in self.session.inputs {
                        self.session.removeInput(input)
                    }
                    for output in self.session.outputs {
                        self.session.removeOutput(output)
                    }

                    if self.session.canSetSessionPreset(.hd1280x720) {
                        self.session.sessionPreset = .hd1280x720
                    } else if self.session.canSetSessionPreset(.high) {
                        self.session.sessionPreset = .high
                    }

                    let input = try AVCaptureDeviceInput(device: device)
                    guard self.session.canAddInput(input) else {
                        throw CaptureError.cannotAddInput
                    }
                    self.session.addInput(input)

                    let output = AVCaptureVideoDataOutput()
                    output.alwaysDiscardsLateVideoFrames = true
                    output.videoSettings = [
                        kCVPixelBufferPixelFormatTypeKey as String:
                            Int(kCVPixelFormatType_32BGRA)
                    ]
                    output.setSampleBufferDelegate(self, queue: self.sampleQueue)
                    guard self.session.canAddOutput(output) else {
                        throw CaptureError.cannotAddOutput
                    }
                    self.session.addOutput(output)

                    if let connection = output.connection(with: .video),
                       connection.isVideoMirroringSupported {
                        connection.isVideoMirrored = false
                    }

                    do {
                        try device.lockForConfiguration()
                        defer { device.unlockForConfiguration() }
                        let requestedRate = Double(fps)
                        if device.activeFormat.videoSupportedFrameRateRanges.contains(where: {
                            $0.minFrameRate <= requestedRate && requestedRate <= $0.maxFrameRate
                        }) {
                            let duration = CMTime(value: 1, timescale: CMTimeScale(fps))
                            device.activeVideoMinFrameDuration = duration
                            device.activeVideoMaxFrameDuration = duration
                        }
                    } catch {
                        // The session can still run at the camera's native rate.
                    }
                } catch {
                    continuation.resume(throwing: error)
                    return
                }

                self.lastFrameCallbackTime = 0
                self.session.startRunning()
                if self.session.isRunning {
                    continuation.resume()
                } else {
                    continuation.resume(throwing: CaptureError.didNotStart)
                }
            }
        }
    }

    func stop() async {
        await withCheckedContinuation { continuation in
            sessionQueue.async { [weak self] in
                guard let self else {
                    continuation.resume()
                    return
                }
                if self.session.isRunning {
                    self.session.stopRunning()
                }
                continuation.resume()
            }
        }
    }

    func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        guard sampleBuffer.isValid, sampleBuffer.dataReadiness == .ready else { return }

        Task {
            await mixer.append(sampleBuffer, track: VideoSourceTrack.camera)
        }

        let now = ProcessInfo.processInfo.systemUptime
        if lastFrameCallbackTime == 0 || now - lastFrameCallbackTime >= 0.5 {
            lastFrameCallbackTime = now
            DispatchQueue.main.async { [weak self] in
                self?.onFrame?()
            }
        }
    }

    private func observeSession() {
        let center = NotificationCenter.default
        observers.append(
            center.addObserver(
                forName: AVCaptureSession.runtimeErrorNotification,
                object: session,
                queue: .main
            ) { [weak self] notification in
                let detail = (notification.userInfo?[AVCaptureSessionErrorKey] as? Error)?
                    .localizedDescription ?? "erreur inconnue"
                self?.onError?("La caméra s’est arrêtée : \(detail)")
            }
        )
        observers.append(
            center.addObserver(
                forName: AVCaptureSession.wasInterruptedNotification,
                object: session,
                queue: .main
            ) { [weak self] _ in
                self?.onError?(
                    "La caméra a été interrompue par macOS ou une autre application."
                )
            }
        )
    }
}
