// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "AdoptanMiniOBS",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "AdoptanMiniOBS", targets: ["AdoptanMiniOBS"])
    ],
    dependencies: [
        .package(
            url: "https://github.com/HaishinKit/HaishinKit.swift.git",
            exact: "2.1.2"
        )
    ],
    targets: [
        .executableTarget(
            name: "AdoptanMiniOBS",
            dependencies: [
                .product(name: "HaishinKit", package: "HaishinKit.swift"),
                .product(name: "RTMPHaishinKit", package: "HaishinKit.swift")
            ],
            linkerSettings: [
                .linkedFramework("AVFoundation"),
                .linkedFramework("CoreGraphics"),
                .linkedFramework("ScreenCaptureKit"),
                .linkedFramework("Security"),
                .linkedFramework("VideoToolbox")
            ]
        )
    ],
    swiftLanguageModes: [.v5]
)
