// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "K256SDK",
    platforms: [
        .macOS(.v12),
        .iOS(.v15),
        .tvOS(.v15),
        .watchOS(.v8)
    ],
    products: [
        .library(
            name: "K256SDK",
            targets: ["K256SDK"]
        ),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "K256SDK",
            dependencies: [],
            path: "Sources/K256"
        ),
        .testTarget(
            name: "K256SDKTests",
            dependencies: ["K256SDK"]
        ),
    ]
)
