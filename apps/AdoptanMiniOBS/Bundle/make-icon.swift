import AppKit

guard CommandLine.arguments.count == 2 else {
    fatalError("Usage: swift make-icon.swift output.png")
}

let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)
image.lockFocus()

let background = NSBezierPath(
    roundedRect: NSRect(x: 52, y: 52, width: 920, height: 920),
    xRadius: 210,
    yRadius: 210
)
let gradient = NSGradient(colors: [
    NSColor(red: 0.32, green: 0.12, blue: 0.95, alpha: 1),
    NSColor(red: 0.93, green: 0.15, blue: 0.52, alpha: 1)
])!
gradient.draw(in: background, angle: -45)

NSColor.white.withAlphaComponent(0.16).setFill()
NSBezierPath(
    roundedRect: NSRect(x: 174, y: 245, width: 676, height: 534),
    xRadius: 105,
    yRadius: 105
).fill()

let configuration = NSImage.SymbolConfiguration(pointSize: 410, weight: .semibold)
if let symbol = NSImage(
    systemSymbolName: "dot.radiowaves.left.and.right",
    accessibilityDescription: nil
)?.withSymbolConfiguration(configuration) {
    symbol.isTemplate = true
    NSColor.white.set()
    symbol.draw(
        in: NSRect(x: 257, y: 306, width: 510, height: 410),
        from: .zero,
        operation: .sourceOver,
        fraction: 1
    )
}

image.unlockFocus()

guard let tiff = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("Unable to render icon")
}
try png.write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
