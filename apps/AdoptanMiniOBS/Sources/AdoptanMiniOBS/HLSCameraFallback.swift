@preconcurrency import AVFoundation
import CoreMedia
import CoreVideo
import Foundation
import QuartzCore

/// Uses AVFoundation's production HLS decoder for the Safari fallback. It
/// stays close to the live edge and rebuilds the player quickly after a
/// Safari or network interruption.
final class HLSCameraFallback: @unchecked Sendable {
    private let queue = DispatchQueue(
        label: "ai.adoptan.miniobs.network-camera-hls",
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

    var onSampleBuffer: ((CMSampleBuffer) -> Void)?
    var onStatus: ((String) -> Void)?

    func start(url: URL, fps: Int) async {
        await stop()
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            queue.async { [weak self] in
                guard let self else {
                    continuation.resume()
                    return
                }

                self.sourceURL = url
                self.framesPerSecond = max(15, min(fps, 60))
                self.configurePlayer()

                let timer = DispatchSource.makeTimerSource(queue: self.queue)
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
                continuation.resume()
            }
        }
    }

    func stop() async {
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            queue.async { [weak self] in
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
                self.lastFrameUptime = 0
                self.lastReloadUptime = 0
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
        item.preferredPeakBitRate = 4_000_000
        item.preferredMaximumResolution = CGSize(width: 1_280, height: 720)
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
    }

    private func reloadIfNeeded(now: TimeInterval) {
        guard now - lastFrameUptime >= 2.5,
              now - lastReloadUptime >= 2.5 else {
            return
        }
        lastReloadUptime = now
        emitStatus("Flux Safari sans image — reconnexion du lecteur vidéo…")
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
