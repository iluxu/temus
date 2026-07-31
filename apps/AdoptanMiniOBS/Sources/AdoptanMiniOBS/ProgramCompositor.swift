@preconcurrency import AVFoundation
import CoreImage
import CoreMedia
import CoreVideo
import Foundation
import HaishinKit
import Metal

/// Builds one final video frame from the latest native camera and screen frames.
/// HaishinKit receives only this program track, so its multi-track renderer can
/// no longer turn one of the sources black or freeze the other source.
final class ProgramCompositor {
    struct Settings {
        let scene: SceneLayout
        let overlayPosition: OverlayPosition
        let overlayScale: Double
        let outputSize: CGSize
        let fps: Int
        let mirrorCamera: Bool
        let rotateCamera180: Bool
    }

    private let mixer: MediaMixer
    private let renderQueue = DispatchQueue(
        label: "ai.adoptan.miniobs.program-compositor",
        qos: .userInteractive
    )
    private let context: CIContext
    private let colorSpace = CGColorSpaceCreateDeviceRGB()

    private var settings: Settings
    private var frameTimer: DispatchSourceTimer?
    private var cameraBuffer: CVPixelBuffer?
    private var screenBuffer: CVPixelBuffer?
    private var pixelBufferPool: CVPixelBufferPool?
    private var outputFormat: CMVideoFormatDescription?

    init(mixer: MediaMixer, settings: Settings) {
        self.mixer = mixer
        self.settings = settings
        if let device = MTLCreateSystemDefaultDevice() {
            context = CIContext(
                mtlDevice: device,
                options: [.cacheIntermediates: false, .name: "Adoptan Program"]
            )
        } else {
            context = CIContext(options: [.cacheIntermediates: false])
        }
    }

    func start(settings: Settings) async {
        await stop()
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            renderQueue.async { [weak self] in
                guard let self else {
                    continuation.resume()
                    return
                }
                self.settings = settings
                self.rebuildPixelBufferPool()

                let timer = DispatchSource.makeTimerSource(queue: self.renderQueue)
                timer.schedule(
                    deadline: .now(),
                    repeating: .milliseconds(max(16, 1_000 / max(1, settings.fps))),
                    leeway: .milliseconds(2)
                )
                timer.setEventHandler { [weak self] in
                    self?.renderProgramFrame()
                }
                self.frameTimer = timer
                timer.resume()
                continuation.resume()
            }
        }
    }

    func stop() async {
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            renderQueue.async { [weak self] in
                guard let self else {
                    continuation.resume()
                    return
                }
                self.frameTimer?.setEventHandler {}
                self.frameTimer?.cancel()
                self.frameTimer = nil
                self.cameraBuffer = nil
                self.screenBuffer = nil
                continuation.resume()
            }
        }
    }

    func update(settings: Settings) {
        renderQueue.async { [weak self] in
            guard let self else { return }
            let sizeChanged = self.settings.outputSize != settings.outputSize
            let fpsChanged = self.settings.fps != settings.fps
            self.settings = settings
            if sizeChanged {
                self.rebuildPixelBufferPool()
            }
            if fpsChanged, let timer = self.frameTimer {
                timer.schedule(
                    deadline: .now(),
                    repeating: .milliseconds(max(16, 1_000 / max(1, settings.fps))),
                    leeway: .milliseconds(2)
                )
            }
        }
    }

    func appendCamera(_ sampleBuffer: CMSampleBuffer) {
        guard let imageBuffer = sampleBuffer.imageBuffer else { return }
        renderQueue.async { [weak self] in
            self?.cameraBuffer = imageBuffer
        }
    }

    func appendScreen(_ sampleBuffer: CMSampleBuffer) {
        guard let imageBuffer = sampleBuffer.imageBuffer else { return }
        renderQueue.async { [weak self] in
            self?.screenBuffer = imageBuffer
        }
    }

    private func rebuildPixelBufferPool() {
        let attributes: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String:
                Int(kCVPixelFormatType_32BGRA),
            kCVPixelBufferWidthKey as String:
                Int(settings.outputSize.width),
            kCVPixelBufferHeightKey as String:
                Int(settings.outputSize.height),
            kCVPixelBufferMetalCompatibilityKey as String: true,
            kCVPixelBufferIOSurfacePropertiesKey as String: [:]
        ]
        var pool: CVPixelBufferPool?
        CVPixelBufferPoolCreate(
            kCFAllocatorDefault,
            nil,
            attributes as CFDictionary,
            &pool
        )
        pixelBufferPool = pool
        outputFormat = nil
    }

    private func renderProgramFrame() {
        guard let pixelBufferPool else { return }
        var outputBuffer: CVPixelBuffer?
        guard CVPixelBufferPoolCreatePixelBuffer(
            kCFAllocatorDefault,
            pixelBufferPool,
            &outputBuffer
        ) == kCVReturnSuccess,
        let outputBuffer else {
            return
        }

        let outputRect = CGRect(origin: .zero, size: settings.outputSize)
        let black = CIImage(color: .black).cropped(to: outputRect)
        let camera = cameraBuffer.map {
            applyCameraEffects(to: CIImage(cvPixelBuffer: $0))
        }
        let screen = screenBuffer.map {
            normalized(CIImage(cvPixelBuffer: $0))
        }

        var program = black
        switch settings.scene {
        case .screenOnly:
            if let screen {
                program = fit(screen, into: outputRect, fill: false).composited(over: black)
            }

        case .cameraOnly:
            if let camera {
                program = fit(camera, into: outputRect, fill: true).composited(over: black)
            }

        case .screenCamera:
            if let screen {
                program = fit(screen, into: outputRect, fill: false).composited(over: black)
            }
            if let camera {
                let overlayRect = makeOverlayRect(in: outputRect)
                program = fit(camera, into: overlayRect, fill: true).composited(over: program)
            }

        case .cameraScreen:
            if let camera {
                program = fit(camera, into: outputRect, fill: true).composited(over: black)
            }
            if let screen {
                let overlayRect = makeOverlayRect(in: outputRect)
                program = fit(screen, into: overlayRect, fill: false).composited(over: program)
            }
        }

        context.render(
            program.cropped(to: outputRect),
            to: outputBuffer,
            bounds: outputRect,
            colorSpace: colorSpace
        )

        if outputFormat == nil {
            var description: CMVideoFormatDescription?
            CMVideoFormatDescriptionCreateForImageBuffer(
                allocator: kCFAllocatorDefault,
                imageBuffer: outputBuffer,
                formatDescriptionOut: &description
            )
            outputFormat = description
        }
        guard let outputFormat else { return }

        var timing = CMSampleTimingInfo(
            duration: CMTime(value: 1, timescale: CMTimeScale(max(1, settings.fps))),
            presentationTimeStamp: CMClockGetTime(CMClockGetHostTimeClock()),
            decodeTimeStamp: .invalid
        )
        var sampleBuffer: CMSampleBuffer?
        guard CMSampleBufferCreateReadyWithImageBuffer(
            allocator: kCFAllocatorDefault,
            imageBuffer: outputBuffer,
            formatDescription: outputFormat,
            sampleTiming: &timing,
            sampleBufferOut: &sampleBuffer
        ) == noErr,
        let sampleBuffer else {
            return
        }

        Task {
            await mixer.append(sampleBuffer, track: VideoSourceTrack.program)
        }
    }

    private func applyCameraEffects(to input: CIImage) -> CIImage {
        var image = normalized(input)
        if settings.rotateCamera180 {
            image = image.transformed(
                by: CGAffineTransform(
                    translationX: image.extent.width,
                    y: image.extent.height
                ).rotated(by: .pi)
            )
            image = normalized(image)
        }
        if settings.mirrorCamera {
            image = image.transformed(
                by: CGAffineTransform(
                    translationX: image.extent.width,
                    y: 0
                ).scaledBy(x: -1, y: 1)
            )
            image = normalized(image)
        }
        return image
    }

    private func normalized(_ image: CIImage) -> CIImage {
        image.transformed(
            by: CGAffineTransform(
                translationX: -image.extent.origin.x,
                y: -image.extent.origin.y
            )
        )
    }

    private func fit(_ input: CIImage, into destination: CGRect, fill: Bool) -> CIImage {
        let image = normalized(input)
        guard image.extent.width > 0, image.extent.height > 0 else {
            return CIImage(color: .clear).cropped(to: destination)
        }
        let scaleX = destination.width / image.extent.width
        let scaleY = destination.height / image.extent.height
        let scale = fill ? max(scaleX, scaleY) : min(scaleX, scaleY)
        let scaled = image.transformed(
            by: CGAffineTransform(scaleX: scale, y: scale)
        )
        let translated = scaled.transformed(
            by: CGAffineTransform(
                translationX: destination.midX - scaled.extent.midX,
                y: destination.midY - scaled.extent.midY
            )
        )
        return translated.cropped(to: destination)
    }

    private func makeOverlayRect(in outputRect: CGRect) -> CGRect {
        let width = outputRect.width * max(0.18, min(settings.overlayScale, 0.48))
        let height = width * 9 / 16
        let margin = max(16, outputRect.width * 0.018)

        let originX: CGFloat
        switch settings.overlayPosition {
        case .topLeft, .bottomLeft:
            originX = margin
        case .topRight, .bottomRight:
            originX = outputRect.width - width - margin
        }

        let originY: CGFloat
        switch settings.overlayPosition {
        case .bottomLeft, .bottomRight:
            originY = margin
        case .topLeft, .topRight:
            originY = outputRect.height - height - margin
        }

        return CGRect(x: originX, y: originY, width: width, height: height)
    }
}
