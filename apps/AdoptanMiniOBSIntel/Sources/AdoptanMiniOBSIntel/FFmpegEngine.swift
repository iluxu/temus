import AppKit
import CoreGraphics
import Darwin
import Foundation

final class FFmpegEngine: @unchecked Sendable {
    static let iPhoneRTSP =
        "rtsp://51.222.9.123:8554/studio/lucia"

    var onPreviewFrame: ((NSImage) -> Void)?
    var onStatus: ((String) -> Void)?
    var onExit: ((Int32, String, Bool) -> Void)?

    private let stateQueue = DispatchQueue(label: "ai.adoptan.miniobs.intel.ffmpeg-state")
    private let frameQueue = DispatchQueue(label: "ai.adoptan.miniobs.intel.preview-frames")
    private let screenCapture = NativeScreenCaptureSource()
    private var process: Process?
    private var standardInput: Pipe?
    private var standardOutput: Pipe?
    private var standardError: Pipe?
    private var previewBuffer = Data()
    private var diagnosticLines: [String] = []
    private var expectedStop = false
    private var stdinCarriesScreenFrames = false
    private var processGeneration = 0

    private static let previewWidth = 640
    private static let previewHeight = 360
    private static let previewFPS = 8
    private static let previewFrameBytes = previewWidth * previewHeight * 4

    init() {
        signal(SIGPIPE, SIG_IGN)
        screenCapture.onError = { [weak self] message in
            self?.screenCaptureFailed(message)
        }
    }

    var executableURL: URL? {
        if let bundled = Bundle.main.url(forResource: "ffmpeg", withExtension: nil) {
            return bundled
        }
        for candidate in ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"] {
            if FileManager.default.isExecutableFile(atPath: candidate) {
                return URL(fileURLWithPath: candidate)
            }
        }
        return nil
    }

    func listDevices() async throws -> DeviceCatalog {
        guard let executableURL else { throw EngineError.ffmpegMissing }
        let screens = try await NativeScreenCaptureSource.availableDisplays()
        guard !screens.isEmpty else { throw EngineError.noScreenDevice("") }
        let microphones: [FFmpegDevice] = try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let process = Process()
                let pipe = Pipe()
                process.executableURL = executableURL
                process.arguments = [
                    "-hide_banner", "-f", "avfoundation",
                    "-list_devices", "true", "-i", ""
                ]
                process.standardOutput = Pipe()
                process.standardError = pipe
                do {
                    try process.run()
                    let data = pipe.fileHandleForReading.readDataToEndOfFile()
                    process.waitUntilExit()
                    let text = String(data: data, encoding: .utf8) ?? ""
                    let catalog = Self.parseDeviceCatalog(text)
                    continuation.resume(returning: catalog.microphones)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
        return DeviceCatalog(screens: screens, microphones: microphones)
    }

    func start(_ configuration: FFmpegConfiguration, live: Bool) async throws {
        await stop()
        guard let executableURL else { throw EngineError.ffmpegMissing }
        let arguments = try buildArguments(configuration, live: live)
        let input = Pipe()
        let output = Pipe()
        let error = Pipe()

        try await withCheckedThrowingContinuation {
            (continuation: CheckedContinuation<Void, Error>) in
            stateQueue.async { [weak self] in
                guard let self else {
                    continuation.resume(throwing: EngineError.couldNotStart)
                    return
                }

                let process = Process()
                process.executableURL = executableURL
                process.arguments = arguments
                process.standardInput = input
                process.standardOutput = output
                process.standardError = error
                self.processGeneration += 1
                let generation = self.processGeneration
                process.terminationHandler = { [weak self] finished in
                    self?.processDidExit(
                        finished.terminationStatus,
                        generation: generation
                    )
                }

                self.expectedStop = false
                self.stdinCarriesScreenFrames = configuration.scene.needsScreen
                self.diagnosticLines.removeAll(keepingCapacity: true)
                self.standardInput = input
                self.standardOutput = output
                self.standardError = error
                self.process = process
                self.frameQueue.async { [weak self] in
                    self?.previewBuffer.removeAll(keepingCapacity: true)
                }
                self.installReaders(output: output, error: error, generation: generation)

                do {
                    try process.run()
                    continuation.resume()
                } catch {
                    self.clearProcess()
                    continuation.resume(throwing: error)
                }
            }
        }

        if configuration.scene.needsScreen {
            guard let screen = configuration.screen,
                  let displayID = CGDirectDisplayID(exactly: screen.index) else {
                await stop()
                throw EngineError.noScreenSelected
            }
            do {
                try await screenCapture.start(
                    displayID: displayID,
                    width: configuration.resolution.width,
                    height: configuration.resolution.height,
                    fps: configuration.fps,
                    showCursor: configuration.showCursor,
                    output: input.fileHandleForWriting
                )
            } catch {
                await stop()
                throw error
            }
        }
    }

    func stop() async {
        await screenCapture.stop()
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            stateQueue.async { [weak self] in
                guard let self, let process = self.process else {
                    continuation.resume()
                    return
                }
                self.expectedStop = true
                if process.isRunning {
                    if self.stdinCarriesScreenFrames {
                        self.standardInput?.fileHandleForWriting.closeFile()
                    } else {
                        try? self.standardInput?.fileHandleForWriting.write(
                            Data("q\n".utf8)
                        )
                    }
                }
                DispatchQueue.global(qos: .utility).async {
                    let deadline = Date().addingTimeInterval(2.5)
                    while process.isRunning && Date() < deadline {
                        Thread.sleep(forTimeInterval: 0.05)
                    }
                    if process.isRunning {
                        process.terminate()
                    }
                    process.waitUntilExit()
                    self.stateQueue.async {
                        if self.process === process {
                            self.clearProcess()
                        }
                        continuation.resume()
                    }
                }
            }
        }
    }

    func shutdown() {
        Task { [screenCapture] in
            await screenCapture.stop()
        }
        stateQueue.async { [weak self] in
            guard let self, let process = self.process else { return }
            self.expectedStop = true
            if process.isRunning {
                process.terminate()
            }
        }
    }

    private func installReaders(output: Pipe, error: Pipe, generation: Int) {
        output.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty else { return }
            self?.stateQueue.async { [weak self] in
                guard let self, generation == self.processGeneration else { return }
                self.frameQueue.async { [weak self] in
                    self?.consumePreviewData(data)
                }
            }
        }
        error.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
            self?.stateQueue.async { [weak self] in
                guard let self, generation == self.processGeneration else { return }
                for line in text.split(whereSeparator: \.isNewline) {
                    let cleaned = String(line)
                    self.diagnosticLines.append(cleaned)
                    if self.diagnosticLines.count > 40 {
                        self.diagnosticLines.removeFirst(self.diagnosticLines.count - 40)
                    }
                }
            }
        }
    }

    private func consumePreviewData(_ data: Data) {
        previewBuffer.append(data)
        while previewBuffer.count >= Self.previewFrameBytes {
            let frame = Data(previewBuffer.prefix(Self.previewFrameBytes))
            previewBuffer.removeFirst(Self.previewFrameBytes)

            guard let provider = CGDataProvider(data: frame as CFData) else { continue }
            let bitmapInfo = CGBitmapInfo.byteOrder32Little.union(
                CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedFirst.rawValue)
            )
            guard let image = CGImage(
                width: Self.previewWidth,
                height: Self.previewHeight,
                bitsPerComponent: 8,
                bitsPerPixel: 32,
                bytesPerRow: Self.previewWidth * 4,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: bitmapInfo,
                provider: provider,
                decode: nil,
                shouldInterpolate: true,
                intent: .defaultIntent
            ) else { continue }
            let preview = NSImage(
                cgImage: image,
                size: NSSize(width: Self.previewWidth, height: Self.previewHeight)
            )
            DispatchQueue.main.async { [weak self] in
                self?.onPreviewFrame?(preview)
            }
        }
    }

    private func screenCaptureFailed(_ message: String) {
        stateQueue.async { [weak self] in
            guard let self, !self.expectedStop else { return }
            self.diagnosticLines.append(message)
            if self.diagnosticLines.count > 40 {
                self.diagnosticLines.removeFirst(self.diagnosticLines.count - 40)
            }
            if self.process?.isRunning == true {
                self.process?.terminate()
            }
        }
    }

    private func processDidExit(_ status: Int32, generation: Int) {
        stateQueue.async { [weak self] in
            guard let self, generation == self.processGeneration else { return }
            let wasExpected = self.expectedStop
            let diagnostics = self.diagnosticLines.suffix(14).joined(separator: "\n")
            self.clearProcess()
            Task { [screenCapture = self.screenCapture] in
                await screenCapture.stop()
            }
            DispatchQueue.main.async { [weak self] in
                self?.onExit?(status, diagnostics, wasExpected)
            }
        }
    }

    private func clearProcess() {
        standardOutput?.fileHandleForReading.readabilityHandler = nil
        standardError?.fileHandleForReading.readabilityHandler = nil
        process = nil
        standardInput = nil
        standardOutput = nil
        standardError = nil
        stdinCarriesScreenFrames = false
    }

    private func buildArguments(
        _ configuration: FFmpegConfiguration,
        live: Bool
    ) throws -> [String] {
        var arguments = [
            "-hide_banner", "-loglevel", "warning", "-nostats", "-y"
        ]
        var nextInput = 0
        var screenInput: Int?
        var cameraInput: Int?
        var microphoneInput: Int?

        if configuration.scene.needsScreen {
            guard configuration.screen != nil else { throw EngineError.noScreenSelected }
            screenInput = nextInput
            nextInput += 1
            arguments += [
                "-thread_queue_size", "1024",
                "-f", "rawvideo",
                "-framerate", String(configuration.fps),
                "-pixel_format", "bgra",
                "-video_size", "\(configuration.resolution.width)x\(configuration.resolution.height)",
                "-i", "pipe:0"
            ]
        }

        if configuration.scene.needsCamera {
            cameraInput = nextInput
            nextInput += 1
            arguments += [
                "-thread_queue_size", "2048",
                "-rtsp_transport", "tcp",
                "-timeout", "15000000",
                "-fflags", "+genpts+discardcorrupt",
                "-i", Self.iPhoneRTSP
            ]
        }

        if live, let microphone = configuration.microphone {
            microphoneInput = nextInput
            nextInput += 1
            arguments += [
                "-thread_queue_size", "1024",
                "-f", "avfoundation",
                "-i", "none:\(microphone.name)"
            ]
        }

        var filters: [String] = []
        let width = configuration.resolution.width
        let height = configuration.resolution.height
        let fps = configuration.fps

        if let screenInput {
            filters.append(
                "[\(screenInput):v]fps=\(fps)," +
                "scale=\(width):\(height):force_original_aspect_ratio=decrease," +
                "pad=\(width):\(height):(ow-iw)/2:(oh-ih)/2:black,setsar=1[screen]"
            )
        }
        if let cameraInput {
            let mirror = configuration.mirrorCamera ? ",hflip" : ""
            filters.append("[\(cameraInput):v]fps=\(fps)\(mirror)[camera]")
        }

        switch configuration.scene {
        case .screenOnly:
            filters.append("[screen]format=yuv420p[vbase]")
        case .cameraOnly:
            filters.append(
                "[camera]scale=\(width):\(height):force_original_aspect_ratio=increase," +
                "crop=\(width):\(height),setsar=1,format=yuv420p[vbase]"
            )
        case .screenCamera:
            let pipWidth = max(260, width * 30 / 100)
            let pipHeight = pipWidth * 9 / 16
            filters.append(
                "[camera]scale=\(pipWidth):\(pipHeight):force_original_aspect_ratio=increase," +
                "crop=\(pipWidth):\(pipHeight),setsar=1[camerapip]"
            )
            filters.append(
                "[screen][camerapip]overlay=W-w-24:H-h-24:format=auto," +
                "format=yuv420p[vbase]"
            )
        }

        if live {
            filters.append("[vbase]split=2[vstream][vpreviewbase]")
            filters.append(
                "[vpreviewbase]fps=\(Self.previewFPS)," +
                "scale=\(Self.previewWidth):\(Self.previewHeight),format=bgra[vpreview]"
            )

            var audioSources: [String] = []
            if configuration.includeIPhoneAudio, let cameraInput {
                audioSources.append("[\(cameraInput):a]")
            }
            if let microphoneInput {
                audioSources.append("[\(microphoneInput):a]")
            }
            switch audioSources.count {
            case 0:
                filters.append("anullsrc=r=48000:cl=stereo[aout]")
            case 1:
                filters.append("\(audioSources[0])aresample=async=1:first_pts=0[aout]")
            default:
                filters.append(
                    "\(audioSources.joined())amix=inputs=\(audioSources.count):" +
                    "duration=longest:dropout_transition=2," +
                    "aresample=async=1:first_pts=0[aout]"
                )
            }
        } else {
            filters.append(
                "[vbase]fps=\(Self.previewFPS)," +
                "scale=\(Self.previewWidth):\(Self.previewHeight),format=bgra[vpreview]"
            )
        }

        arguments += ["-filter_complex", filters.joined(separator: ";")]

        if live {
            let cleanServer = configuration.serverURL
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            let cleanKey = configuration.streamKey
                .trimmingCharacters(in: .whitespacesAndNewlines)
            guard !cleanServer.isEmpty, !cleanKey.isEmpty else {
                throw EngineError.destinationMissing
            }
            arguments += [
                "-map", "[vstream]", "-map", "[aout]",
                "-c:v", "h264_videotoolbox",
                "-profile:v", "main",
                "-pix_fmt", "yuv420p",
                "-r", String(fps),
                "-g", String(fps * 2),
                "-b:v", "\(configuration.videoBitrateKbps)k",
                "-maxrate", "\(configuration.videoBitrateKbps)k",
                "-bufsize", "\(configuration.videoBitrateKbps * 2)k",
                "-c:a", "aac", "-b:a", "\(configuration.audioBitrateKbps)k",
                "-ar", "48000", "-ac", "2",
                "-flvflags", "no_duration_filesize",
                "-f", "flv", "\(cleanServer)/\(cleanKey)"
            ]
        }

        arguments += [
            "-map", "[vpreview]", "-an",
            "-c:v", "rawvideo", "-pix_fmt", "bgra",
            "-f", "rawvideo", "pipe:1"
        ]
        return arguments
    }

    private static func parseDeviceCatalog(_ output: String) -> DeviceCatalog {
        var mode: FFmpegDevice.Kind?
        var screens: [FFmpegDevice] = []
        var microphones: [FFmpegDevice] = []
        let expression = try? NSRegularExpression(pattern: #"\[(\d+)\]\s+(.+)$"#)

        for rawLine in output.split(whereSeparator: \.isNewline) {
            let line = String(rawLine)
            if line.contains("AVFoundation video devices") {
                mode = .video
                continue
            }
            if line.contains("AVFoundation audio devices") {
                mode = .audio
                continue
            }
            guard let mode, let expression else { continue }
            let range = NSRange(line.startIndex..<line.endIndex, in: line)
            guard let match = expression.firstMatch(in: line, range: range),
                  let indexRange = Range(match.range(at: 1), in: line),
                  let nameRange = Range(match.range(at: 2), in: line),
                  let index = Int(line[indexRange]) else { continue }
            let device = FFmpegDevice(
                index: index,
                name: String(line[nameRange]).trimmingCharacters(in: .whitespaces),
                kind: mode
            )
            switch mode {
            case .video:
                let normalized = device.name.lowercased()
                if normalized.contains("capture screen") || normalized.contains("screen") {
                    screens.append(device)
                }
            case .audio:
                microphones.append(device)
            }
        }
        return DeviceCatalog(screens: screens, microphones: microphones)
    }
}

private enum EngineError: LocalizedError {
    case ffmpegMissing
    case noScreenDevice(String)
    case noScreenSelected
    case destinationMissing
    case couldNotStart

    var errorDescription: String? {
        switch self {
        case .ffmpegMissing:
            "Le moteur FFmpeg universel manque dans l’application."
        case .noScreenDevice:
            "FFmpeg ne détecte aucun écran macOS."
        case .noScreenSelected:
            "Sélectionne un écran avant de lancer le test."
        case .destinationMissing:
            "Ajoute l’adresse du serveur et la clé de stream."
        case .couldNotStart:
            "Le moteur vidéo n’a pas pu démarrer."
        }
    }
}
