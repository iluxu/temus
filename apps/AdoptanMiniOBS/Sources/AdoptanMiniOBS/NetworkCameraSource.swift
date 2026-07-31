@preconcurrency import AVFoundation
import CoreMedia
import CoreVideo
import Foundation
import QuartzCore

/// Receives the iPhone camera from adoptan.ai as HLS and injects fresh video
/// frames into the camera track. This path never opens Continuity Camera.
final class NetworkCameraSource {
    private let sessionQueue = DispatchQueue(
        label: "ai.adoptan.miniobs.network-camera",
        qos: .userInteractive
    )

    private var player: AVPlayer?
    private var videoOutput: AVPlayerItemVideoOutput?
    private var frameTimer: DispatchSourceTimer?
    private var sourceURL: URL?
    private var framesPerSecond = 30
    private var formatDescription: CMVideoFormatDescription?
    private var lastFrameUptime = 0.0
    private var lastReloadUptime = 0.0
    private var lastCallbackUptime = 0.0

    var onFrame: (() -> Void)?
    var onStatus: ((String) -> Void)?
    var onSampleBuffer: ((CMSampleBuffer) -> Void)?

    func start(url: URL, fps: Int) async {
        await stop()
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            sessionQueue.async { [weak self] in
                guard let self else {
                    continuation.resume()
                    return
                }

                self.sourceURL = url
                self.framesPerSecond = max(15, min(fps, 60))
                self.configurePlayer()

                let timer = DispatchSource.makeTimerSource(queue: self.sessionQueue)
                timer.schedule(
                    deadline: .now(),
                    repeating: .milliseconds(max(16, 1_000 / self.framesPerSecond)),
                    leeway: .milliseconds(3)
                )
                timer.setEventHandler { [weak self] in
                    self?.pollFrame()
                }
                self.frameTimer = timer
                timer.resume()
                self.emitStatus(
                    "En attente de l’iPhone réseau — scanne le QR puis touche Connecter."
                )
                continuation.resume()
            }
        }
    }

    func stop() async {
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            sessionQueue.async { [weak self] in
                guard let self else {
                    continuation.resume()
                    return
                }
                self.frameTimer?.setEventHandler {}
                self.frameTimer?.cancel()
                self.frameTimer = nil
                self.player?.pause()
                self.player?.replaceCurrentItem(with: nil)
                self.player = nil
                self.videoOutput = nil
                self.sourceURL = nil
                self.formatDescription = nil
                continuation.resume()
            }
        }
    }

    private func configurePlayer() {
        guard let sourceURL else { return }

        player?.pause()
        player?.replaceCurrentItem(with: nil)

        let output = AVPlayerItemVideoOutput(pixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String:
                Int(kCVPixelFormatType_32BGRA)
        ])
        let item = AVPlayerItem(url: sourceURL)
        item.preferredForwardBufferDuration = 0
        item.add(output)

        let player = AVPlayer(playerItem: item)
        player.isMuted = true
        player.automaticallyWaitsToMinimizeStalling = false
        player.preventsDisplaySleepDuringVideoPlayback = true

        videoOutput = output
        self.player = player
        formatDescription = nil
        let now = ProcessInfo.processInfo.systemUptime
        lastFrameUptime = now
        lastReloadUptime = now
        player.playImmediately(atRate: 1)
    }

    private func pollFrame() {
        let now = ProcessInfo.processInfo.systemUptime
        guard let videoOutput else {
            reloadIfNeeded(now: now)
            return
        }

        let itemTime = videoOutput.itemTime(forHostTime: CACurrentMediaTime())
        guard videoOutput.hasNewPixelBuffer(forItemTime: itemTime),
              let pixelBuffer = videoOutput.copyPixelBuffer(
                forItemTime: itemTime,
                itemTimeForDisplay: nil
              ),
              let sampleBuffer = makeSampleBuffer(from: pixelBuffer) else {
            reloadIfNeeded(now: now)
            return
        }

        lastFrameUptime = now
        onSampleBuffer?(sampleBuffer)

        if lastCallbackUptime == 0 || now - lastCallbackUptime >= 0.5 {
            lastCallbackUptime = now
            DispatchQueue.main.async { [weak self] in
                self?.onFrame?()
            }
        }
    }

    private func reloadIfNeeded(now: TimeInterval) {
        guard now - lastFrameUptime >= 7,
              now - lastReloadUptime >= 7 else {
            return
        }
        lastReloadUptime = now
        emitStatus("Recherche de la caméra iPhone sur adoptan.ai…")
        configurePlayer()
    }

    private func makeSampleBuffer(from pixelBuffer: CVPixelBuffer) -> CMSampleBuffer? {
        if formatDescription == nil {
            var description: CMVideoFormatDescription?
            guard CMVideoFormatDescriptionCreateForImageBuffer(
                allocator: kCFAllocatorDefault,
                imageBuffer: pixelBuffer,
                formatDescriptionOut: &description
            ) == noErr else {
                return nil
            }
            formatDescription = description
        }

        guard let formatDescription else { return nil }
        let timestamp = CMClockGetTime(CMClockGetHostTimeClock())
        var timing = CMSampleTimingInfo(
            duration: CMTime(value: 1, timescale: CMTimeScale(framesPerSecond)),
            presentationTimeStamp: timestamp,
            decodeTimeStamp: .invalid
        )
        var sampleBuffer: CMSampleBuffer?
        guard CMSampleBufferCreateReadyWithImageBuffer(
            allocator: kCFAllocatorDefault,
            imageBuffer: pixelBuffer,
            formatDescription: formatDescription,
            sampleTiming: &timing,
            sampleBufferOut: &sampleBuffer
        ) == noErr else {
            return nil
        }
        return sampleBuffer
    }

    private func emitStatus(_ status: String) {
        DispatchQueue.main.async { [weak self] in
            self?.onStatus?(status)
        }
    }
}
