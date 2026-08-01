// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "AdoptanMiniOBSIntel",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "AdoptanMiniOBSIntel", targets: ["AdoptanMiniOBSIntel"])
    ],
    targets: [
        .executableTarget(
            name: "AdoptanMiniOBSIntel",
            linkerSettings: [
                .linkedFramework("AVFoundation"),
                .linkedFramework("CoreGraphics"),
                .linkedFramework("CoreImage"),
                .linkedFramework("CoreMedia"),
                .linkedFramework("CoreVideo"),
                .linkedFramework("ScreenCaptureKit")
            ]
        )
    ],
    swiftLanguageModes: [.v5]
)
