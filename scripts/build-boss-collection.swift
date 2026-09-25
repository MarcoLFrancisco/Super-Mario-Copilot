import Foundation
import CoreGraphics
import ImageIO
import CryptoKit

struct BossDesign {
    let key: String
    let title: String
    let accent: UInt32
    let secondary: UInt32
    let metal: UInt32
    let mark: String
    let build: String
}

let designs = [
    BossDesign(key: "merge", title: "The Merge Monster", accent: 0x5ff1b0, secondary: 0x70bcff, metal: 0x354851, mark: "MERGE", build: "split"),
    BossDesign(key: "scope", title: "The Scope Creep", accent: 0x67d7ff, secondary: 0xf0ce85, metal: 0x5b737f, mark: "WORK IQ", build: "vault"),
    BossDesign(key: "foundry", title: "The Unstable Deployment", accent: 0xffa84f, secondary: 0x7bdcf2, metal: 0x3c4755, mark: "FOUNDRY", build: "reactor"),
    BossDesign(key: "planner", title: "The Infinite Planner", accent: 0x68efcc, secondary: 0xd6f6a1, metal: 0x245657, mark: "AGENTS", build: "network"),
    BossDesign(key: "meeting", title: "The Meeting Overlord", accent: 0xb9a5ff, secondary: 0x7ed9ff, metal: 0x41445f, mark: "TEAMS", build: "audio"),
    BossDesign(key: "monolith", title: "Doctor Null / Legacy Monolith", accent: 0xffd477, secondary: 0x97ecdb, metal: 0x24292f, mark: "NULL", build: "tower"),
    BossDesign(key: "firewall", title: "The Orbital Firewall", accent: 0x64cfff, secondary: 0x9bffdf, metal: 0x244f75, mark: "AZURE", build: "shield"),
    BossDesign(key: "orchestrator", title: "Rogue Orchestration Core", accent: 0xffb48a, secondary: 0x8cedd8, metal: 0x34383f, mark: "AI CORE", build: "kernel")
]
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let input = FileHandle.standardInput.readDataToEndOfFile()
guard let rig = try JSONSerialization.jsonObject(with: input) as? [String: Any],
      let dimensions = rig["atlasSize"] as? [Int], let layers = rig["layers"] as? [[String: Any]] else {
    fatalError("Pipe WIZARD_RIG JSON from images/Boss1-rig.js into this generator")
}
let sourceData = try Data(contentsOf: root.appendingPathComponent("images/Boss1-rig.png"))
let source = CGImageSourceCreateWithData(sourceData as CFData, nil)!
let image = CGImageSourceCreateImageAtIndex(source, 0, nil)!
let width = dimensions[0], height = dimensions[1], byteCount = width * height * 4
precondition(image.width == width && image.height == height)
let sourcePixels = UnsafeMutablePointer<UInt8>.allocate(capacity: byteCount)
sourcePixels.initialize(repeating: 0, count: byteCount)
defer { sourcePixels.deallocate() }
let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
let info = CGImageAlphaInfo.premultipliedLast.rawValue
let sourceContext = CGContext(data: sourcePixels, width: width, height: height, bitsPerComponent: 8,
    bytesPerRow: width * 4, space: colorSpace, bitmapInfo: info)!
sourceContext.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

func components(_ value: UInt32) -> [Double] {
    [Double((value >> 16) & 255), Double((value >> 8) & 255), Double(value & 255)]
}
func ink(_ value: UInt32, _ alpha: CGFloat = 1) -> CGColor {
    let channels = components(value)
    return CGColor(red: channels[0] / 255, green: channels[1] / 255, blue: channels[2] / 255, alpha: alpha)
}
func outline(_ context: CGContext, _ points: [[CGFloat]], _ color: UInt32, _ thickness: CGFloat) {
    context.beginPath(); context.move(to: CGPoint(x: points[0][0], y: points[0][1]))
    for point in points.dropFirst() { context.addLine(to: CGPoint(x: point[0], y: point[1])) }
    context.setStrokeColor(ink(color)); context.setLineWidth(thickness); context.setLineCap(.round); context.strokePath()
}
func plate(_ context: CGContext, _ rectangle: CGRect, _ base: UInt32, _ accent: UInt32, _ radius: CGFloat = 12) {
    let path = CGPath(roundedRect: rectangle, cornerWidth: radius, cornerHeight: radius, transform: nil)
    context.saveGState(); context.addPath(path); context.clip()
    let gradient = CGGradient(colorsSpace: colorSpace,
        colors: [ink(0xf8fcff), ink(0x94a9bb), ink(base), ink(0x152b40), ink(0x96b4c8)] as CFArray,
        locations: [0, 0.08, 0.25, 0.86, 1])!
    context.drawLinearGradient(gradient, start: rectangle.origin,
        end: CGPoint(x: rectangle.maxX, y: rectangle.maxY), options: [])
    context.restoreGState(); context.addPath(path); context.setStrokeColor(ink(0x0a1525)); context.setLineWidth(5); context.strokePath()
    context.addPath(CGPath(roundedRect: rectangle.insetBy(dx: 4, dy: 4), cornerWidth: radius - 3, cornerHeight: radius - 3, transform: nil))
    context.setStrokeColor(ink(accent, 0.65)); context.setLineWidth(2); context.strokePath()
    for horizontal in [rectangle.minX + 11, rectangle.maxX - 11] {
        for vertical in [rectangle.minY + 11, rectangle.maxY - 11] {
            context.setFillColor(ink(0x182634)); context.fillEllipse(in: CGRect(x: horizontal - 3, y: vertical - 3, width: 6, height: 6))
            outline(context, [[horizontal - 1,vertical - 1],[horizontal + 1,vertical + 1]], 0xcee1ef, 1)
        }
    }
}
func ring(_ context: CGContext, _ center: CGPoint, _ radius: CGFloat, _ accent: UInt32) {
    let outer = CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
    context.setFillColor(ink(0x14222e)); context.fillEllipse(in: outer)
    context.setStrokeColor(ink(0xb3c6d5)); context.setLineWidth(7); context.strokeEllipse(in: outer.insetBy(dx: 3, dy: 3))
    context.setStrokeColor(ink(accent)); context.setLineWidth(3); context.strokeEllipse(in: outer.insetBy(dx: 10, dy: 10))
    let light = CGGradient(colorsSpace: colorSpace, colors: [ink(0xf3ffff), ink(accent), ink(0x06101d)] as CFArray,
        locations: [0, 0.18, 1])!
    context.saveGState(); context.addEllipse(in: outer.insetBy(dx: 16, dy: 16)); context.clip()
    context.drawRadialGradient(light, startCenter: center, startRadius: 0, endCenter: center,
        endRadius: radius - 13, options: [])
    context.restoreGState()
}

var manifest = [String: Any]()
for design in designs {
    let pixels = UnsafeMutablePointer<UInt8>.allocate(capacity: byteCount)
    pixels.initialize(from: sourcePixels, count: byteCount)
    let accent = components(design.accent), metal = components(design.metal)
    for offset in stride(from: 0, to: byteCount, by: 4) where pixels[offset + 3] > 0 {
        let red = Double(pixels[offset]), green = Double(pixels[offset + 1]), blue = Double(pixels[offset + 2])
        let luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
        let blueArmor = blue > red * 1.25 && blue > green * 1.05
        let cyanEnergy = blue > 125 && green > red * 1.35
        let neutralArmor = abs(red - green) < 24 && abs(green - blue) < 32 && luminance > 65
        for channel in 0..<3 {
            let original = Double(pixels[offset + channel])
            var value = original
            if cyanEnergy {
                value = accent[channel] * (0.45 + luminance / 330)
                if luminance > 185 { value = value * 0.6 + luminance * 0.4 }
            } else if blueArmor {
                value = luminance * (0.58 + metal[channel] / 145)
            } else if neutralArmor {
                let dark = design.build == "tower" || design.build == "kernel"
                value = luminance * (dark ? 0.52 : 0.96) + metal[channel] * (dark ? 0.25 : 0.08)
            }
            pixels[offset + channel] = UInt8(max(0, min(255, value)))
        }
    }
    let context = CGContext(data: pixels, width: width, height: height, bitsPerComponent: 8,
        bytesPerRow: width * 4, space: colorSpace, bitmapInfo: info)!
    context.translateBy(x: 0, y: CGFloat(height)); context.scaleBy(x: 1, y: -1)
    for layer in layers {
        let name = layer["name"] as! String
        let frame = layer["frame"] as! [Int], original = layer["source"] as! [Int]
        context.saveGState()
        context.clip(to: CGRect(x: frame[0], y: frame[1], width: frame[2], height: frame[3]))
        context.translateBy(x: CGFloat(frame[0] - original[0]), y: CGFloat(frame[1] - original[1]))
        if name == "torso" {
            plate(context, CGRect(x: 337, y: 303, width: 245, height: 239), design.metal, design.accent, 19)
            let center = CGPoint(x: 459, y: 416)
            switch design.build {
            case "split":
                plate(context, CGRect(x: 353, y: 321, width: 93, height: 202), 0x2d3e48, design.accent)
                plate(context, CGRect(x: 462, y: 321, width: 103, height: 202), 0xc0ced7, design.secondary)
                for side: CGFloat in [-1, 1] {
                    let horizontal = 459 + side * 61
                    outline(context, [[horizontal,349],[horizontal,387],[459,423],[459,487]], side < 0 ? design.accent : design.secondary, 7)
                    for vertical: CGFloat in [350,384] { ring(context, CGPoint(x: horizontal, y: vertical), 13, side < 0 ? design.accent : design.secondary) }
                }
                ring(context, CGPoint(x: 459, y: 484), 21, design.accent)
            case "vault":
                for row in 0..<3 {
                    let vertical = 324 + CGFloat(row) * 61
                    plate(context, CGRect(x: 352, y: vertical, width: 214, height: 51), 0x637b8a, design.accent, 7)
                    for rule in 0..<3 { outline(context, [[407,vertical + 14 + CGFloat(rule)*8],[538 - CGFloat(rule)*16,vertical + 14 + CGFloat(rule)*8]], 0xc9dce4, 3) }
                    let shades: [UInt32] = [0x55afea,0x75c99b,0xe4b778]
                    plate(context, CGRect(x: 364, y: vertical + 11, width: 27, height: 29), shades[row], 0xc9f4ff, 3)
                }
            case "reactor":
                ring(context, center, 87, design.accent)
                for spoke in 0..<12 {
                    let angle = CGFloat(spoke) * .pi / 6
                    outline(context, [[center.x + cos(angle)*53,center.y + sin(angle)*53],
                        [center.x + cos(angle)*74,center.y + sin(angle)*74]], 0x314754, 8)
                }
                for side: CGFloat in [-1, 1] { for slot in 0..<6 {
                    let vertical = 350 + CGFloat(slot)*24
                    outline(context, [[459 + side*104,vertical],[459 + side*93,vertical+8]], design.secondary, 3)
                } }
            case "network":
                let hubs: [[CGFloat]] = [[459,343],[384,387],[384,467],[459,493],[535,467],[535,387]]
                for hub in hubs { outline(context, [[459,418],hub], design.accent, 4) }
                for hub in hubs { ring(context, CGPoint(x: hub[0], y: hub[1]), 20, design.secondary) }
                ring(context, center, 34, design.accent)
            case "audio":
                for side: CGFloat in [-1, 1] { for row in 0..<2 {
                    ring(context, CGPoint(x: 459 + side*67, y: 370 + CGFloat(row)*102), 36, design.accent)
                } }
                for index in 0..<7 {
                    let horizontal = 432 + CGFloat(index)*9
                    let extent = CGFloat([11,24,17,37,20,27,12][index])
                    outline(context, [[horizontal,419-extent],[horizontal,419+extent]], design.secondary, 5)
                }
            case "shield":
                let path = CGMutablePath()
                path.move(to: CGPoint(x: 459, y: 330)); path.addLine(to: CGPoint(x: 537, y: 357))
                path.addLine(to: CGPoint(x: 526, y: 455)); path.addQuadCurve(to: CGPoint(x: 459, y: 511), control: CGPoint(x: 496, y: 491))
                path.addQuadCurve(to: CGPoint(x: 392, y: 455), control: CGPoint(x: 422, y: 489))
                path.addLine(to: CGPoint(x: 381, y: 357)); path.closeSubpath()
                context.addPath(path); context.setFillColor(ink(0x1b4164)); context.fillPath()
                context.addPath(path); context.setStrokeColor(ink(design.accent)); context.setLineWidth(7); context.strokePath()
                outline(context, [[421,451],[455,369],[476,369],[452,422],[490,422],[501,451],[421,451]], 0xc0f4ff, 10)
            case "tower":
                for row in 0..<7 {
                    let vertical = 325 + CGFloat(row)*27
                    plate(context, CGRect(x: 355, y: vertical, width: 211, height: 21), 0x28333c, 0x6e838c, 4)
                    for column in 0..<4 { context.setFillColor(ink(column == 0 ? design.accent : design.secondary, column == 0 ? 1 : 0.5))
                        context.fill(CGRect(x: 367 + column*12, y: Int(vertical)+8, width: 6, height: 4)) }
                    outline(context, [[439,vertical+9],[548,vertical+9]], 0x506778, 2)
                }
            default:
                for side: CGFloat in [-1, 1] { for row in 0..<3 {
                    let vertical = 343 + CGFloat(row)*63
                    outline(context, [[459,417],[459+side*59,vertical],[459+side*94,vertical]], design.secondary, 4)
                    ring(context, CGPoint(x: 459+side*94, y: vertical), 13, design.accent)
                } }
                plate(context, CGRect(x: 419, y: 370, width: 80, height: 91), 0x22363e, design.accent)
                for lane in 0..<5 { outline(context, [[434,388+CGFloat(lane)*13],[484,388+CGFloat(lane)*13]], design.accent, 4) }
            }
            for (index, shade) in [0xf25022,0x7fba00,0x00a4ef,0xffb900].enumerated() {
                context.setFillColor(ink(UInt32(shade)))
                context.fill(CGRect(x: 626 + index % 2 * 12, y: 352 + index / 2 * 12, width: 9, height: 9))
            }
        }
        if name == "leftFist" || name == "rightFist" {
            let horizontal: CGFloat = name == "leftFist" ? 118 : 852
            let vertical: CGFloat = name == "leftFist" ? 552 : 548
            if ["reactor", "kernel", "shield"].contains(design.build) {
                ring(context, CGPoint(x: horizontal, y: vertical), design.build == "reactor" ? 39 : 29, design.accent)
            } else if design.build == "audio" {
                for row in 0..<5 { outline(context, [[horizontal-21,vertical+CGFloat(row)*9],[horizontal+21,vertical+CGFloat(row)*9]], design.accent, 3) }
            } else {
                outline(context, [[horizontal-29,vertical],[horizontal-10,vertical-15],[horizontal+18,vertical-15],[horizontal+33,vertical+10]], design.accent, 4)
            }
        }
        context.restoreGState()
    }
    for offset in stride(from: 0, to: byteCount, by: 4) {
        if sourcePixels[offset + 3] == 0 {
            for channel in 0..<4 { pixels[offset + channel] = 0 }
        }
    }
    let file = "Boss-\(design.key).png"
    let output = CGImageDestinationCreateWithURL(root.appendingPathComponent("images/\(file)") as CFURL, "public.png" as CFString, 1, nil)!
    CGImageDestinationAddImage(output, context.makeImage()!, nil)
    precondition(CGImageDestinationFinalize(output))
    manifest[design.key] = ["file": file, "title": design.title, "accent": String(format: "#%06x", design.accent),
        "secondary": String(format: "#%06x", design.secondary), "build": design.build, "mark": design.mark]
    pixels.deallocate()
    print("Built \(file): \(design.title)")
}
let sourceHash = SHA256.hash(data: sourceData).map { String(format: "%02x", $0) }.joined()
let metadata: [String: Any] = ["sourceHash": sourceHash, "atlasSize": dimensions, "designs": manifest]
let json = try JSONSerialization.data(withJSONObject: metadata, options: [.prettyPrinted, .sortedKeys])
let module = "export const BOSS_COLLECTION = " + String(data: json, encoding: .utf8)! + ";\n"
try module.write(to: root.appendingPathComponent("images/Boss-collection.js"), atomically: true, encoding: .utf8)

if CommandLine.arguments.contains("--preview") {
    let preview = CGContext(data: nil, width: 1050, height: 1080, bitsPerComponent: 8,
        bytesPerRow: 1050 * 4, space: colorSpace, bitmapInfo: info)!
    preview.setFillColor(ink(0x0c1b23)); preview.fill(CGRect(x: 0, y: 0, width: 1050, height: 1080))
    let order = rig["drawOrder"] as! [String]
    for (index, design) in designs.enumerated() {
        let imageURL = root.appendingPathComponent("images/Boss-\(design.key).png")
        let source = CGImageSourceCreateWithURL(imageURL as CFURL, nil)!
        let atlas = CGImageSourceCreateImageAtIndex(source, 0, nil)!
        let column = index % 3, row = index / 3
        let scale: CGFloat = 0.31
        let baseX = CGFloat(column * 350 + 175), baseY = CGFloat(1080 - row * 360 - 330)
        for name in order {
            let layer = layers.first { $0["name"] as! String == name }!
            let frame = layer["frame"] as! [Int], original = layer["source"] as! [Int]
            let crop = atlas.cropping(to: CGRect(x: frame[0], y: frame[1], width: frame[2], height: frame[3]))!
            preview.draw(crop, in: CGRect(x: baseX + CGFloat(original[0] - 512) * scale,
                y: baseY + CGFloat(936 - original[1] - original[3]) * scale,
                width: CGFloat(original[2]) * scale, height: CGFloat(original[3]) * scale))
        }
        preview.setFillColor(ink(design.accent)); preview.fill(CGRect(x: column * 350 + 35, y: 1080 - row * 360 - 350, width: 280, height: 2))
    }
    let url = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("cloud-quest-boss-preview.png")
    let destination = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1, nil)!
    CGImageDestinationAddImage(destination, preview.makeImage()!, nil)
    precondition(CGImageDestinationFinalize(destination))
    print("Artwork preview: \(url.path)")
}