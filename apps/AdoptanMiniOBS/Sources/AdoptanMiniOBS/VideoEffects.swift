import CoreImage
import HaishinKit

final class MirrorEffect: VideoEffect {
    func execute(_ image: CIImage) -> CIImage {
        image.transformed(
            by: CGAffineTransform(
                translationX: image.extent.minX + image.extent.maxX,
                y: 0
            ).scaledBy(x: -1, y: 1)
        )
    }
}

final class Rotate180Effect: VideoEffect {
    func execute(_ image: CIImage) -> CIImage {
        let center = CGPoint(x: image.extent.midX, y: image.extent.midY)
        return image.transformed(
            by: CGAffineTransform(translationX: center.x, y: center.y)
                .rotated(by: .pi)
                .translatedBy(x: -center.x, y: -center.y)
        )
    }
}
