import Foundation
import CoreGraphics
import ImageIO
import CryptoKit

struct Part {
    let name: String
    let parent: String?
    let pivot: [Int]
    let shape: CGPath?
}

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let sourceURL = root.appendingPathComponent("images/BBRich.png")
let sourceData = try Data(contentsOf: sourceURL)
guard let source = CGImageSourceCreateWithData(sourceData as CFData, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil), image.width == 1024, image.height == 1024 else {
    fatalError("Bumblebee masks require the supplied 1024x1024 images/BBRich.png")
}
let width = image.width, height = image.height
let byteCount = width * height * 4
let pixels = UnsafeMutablePointer<UInt8>.allocate(capacity: byteCount)
pixels.initialize(repeating: 0, count: byteCount)
defer { pixels.deallocate() }
let space = CGColorSpace(name: CGColorSpace.sRGB)!
let bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue
let context = CGContext(data: pixels, width: width, height: height, bitsPerComponent: 8,
    bytesPerRow: width * 4, space: space, bitmapInfo: bitmapInfo)!
context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

func polygon(_ points: [[CGFloat]]) -> CGPath {
    let path = CGMutablePath()
    path.move(to: CGPoint(x: points[0][0], y: points[0][1]))
    for point in points.dropFirst() { path.addLine(to: CGPoint(x: point[0], y: point[1])) }
    path.closeSubpath()
    return path
}

let cap = CGMutablePath()
cap.move(to: CGPoint(x: 247, y: 340))
cap.addCurve(to: CGPoint(x: 280, y: 139), control1: CGPoint(x: 253, y: 272), control2: CGPoint(x: 262, y: 194))
cap.addCurve(to: CGPoint(x: 491, y: 25), control1: CGPoint(x: 303, y: 74), control2: CGPoint(x: 407, y: 36))
cap.addCurve(to: CGPoint(x: 527, y: 23), control1: CGPoint(x: 494, y: 10), control2: CGPoint(x: 518, y: 8))
cap.addCurve(to: CGPoint(x: 725, y: 133), control1: CGPoint(x: 623, y: 37), control2: CGPoint(x: 700, y: 70))
cap.addCurve(to: CGPoint(x: 756, y: 336), control1: CGPoint(x: 743, y: 191), control2: CGPoint(x: 741, y: 291))
cap.addCurve(to: CGPoint(x: 730, y: 354), control1: CGPoint(x: 751, y: 355), control2: CGPoint(x: 744, y: 361))
cap.addCurve(to: CGPoint(x: 276, y: 351), control1: CGPoint(x: 584, y: 277), control2: CGPoint(x: 412, y: 280))
cap.addCurve(to: CGPoint(x: 247, y: 340), control1: CGPoint(x: 255, y: 365), control2: CGPoint(x: 245, y: 356))
cap.closeSubpath()

let chassis = CGMutablePath()
chassis.move(to: CGPoint(x: 288, y: 287))
chassis.addCurve(to: CGPoint(x: 734, y: 309), control1: CGPoint(x: 416, y: 247), control2: CGPoint(x: 636, y: 262))
chassis.addCurve(to: CGPoint(x: 777, y: 492), control1: CGPoint(x: 766, y: 338), control2: CGPoint(x: 781, y: 427))
chassis.addCurve(to: CGPoint(x: 768, y: 748), control1: CGPoint(x: 776, y: 576), control2: CGPoint(x: 779, y: 683))
chassis.addCurve(to: CGPoint(x: 699, y: 880), control1: CGPoint(x: 768, y: 833), control2: CGPoint(x: 751, y: 868))
chassis.addCurve(to: CGPoint(x: 315, y: 879), control1: CGPoint(x: 610, y: 891), control2: CGPoint(x: 403, y: 895))
chassis.addCurve(to: CGPoint(x: 237, y: 757), control1: CGPoint(x: 257, y: 868), control2: CGPoint(x: 235, y: 827))
chassis.addCurve(to: CGPoint(x: 235, y: 444), control1: CGPoint(x: 232, y: 678), control2: CGPoint(x: 225, y: 526))
chassis.addCurve(to: CGPoint(x: 288, y: 287), control1: CGPoint(x: 238, y: 369), control2: CGPoint(x: 255, y: 312))
chassis.closeSubpath()

let leftEarShapes = [CGPath(ellipseIn: CGRect(x: 94, y: 348, width: 144, height: 237), transform: nil),
    CGPath(roundedRect: CGRect(x: 190, y: 344, width: 62, height: 245), cornerWidth: 19, cornerHeight: 24, transform: nil)]
let rightEarShapes = [CGPath(ellipseIn: CGRect(x: 781, y: 350, width: 138, height: 238), transform: nil),
    CGPath(roundedRect: CGRect(x: 768, y: 345, width: 67, height: 248), cornerWidth: 20, cornerHeight: 24, transform: nil)]
let leftEar = CGMutablePath(), rightEar = CGMutablePath()
leftEarShapes.forEach { leftEar.addPath($0) }; rightEarShapes.forEach { rightEar.addPath($0) }
let bands = CGMutablePath()
var bandShapes = [CGPath]()
for side in [-1, 1] {
    let path = CGMutablePath()
    path.move(to: CGPoint(x: side < 0 ? 271 : 744, y: 170))
    path.addCurve(to: CGPoint(x: side < 0 ? 179 : 832, y: 354),
        control1: CGPoint(x: side < 0 ? 218 : 789, y: 211),
        control2: CGPoint(x: side < 0 ? 182 : 829, y: 278))
    bandShapes.append(path.copy(strokingWithWidth: 16, lineCap: .round, lineJoin: .round, miterLimit: 1))
    bandShapes.append(CGPath(ellipseIn: CGRect(x: side < 0 ? 254 : 723, y: 153, width: 38, height: 49), transform: nil))
}
bandShapes.forEach { bands.addPath($0) }
let microphone = CGMutablePath()
let boom = CGMutablePath()
boom.move(to: CGPoint(x: 852, y: 559))
boom.addCurve(to: CGPoint(x: 755, y: 682), control1: CGPoint(x: 890, y: 613), control2: CGPoint(x: 825, y: 658))
let microphoneShapes = [boom.copy(strokingWithWidth: 24, lineCap: .round, lineJoin: .round, miterLimit: 1),
    CGPath(ellipseIn: CGRect(x: 704, y: 656, width: 89, height: 62), transform: nil),
    CGPath(ellipseIn: CGRect(x: 838, y: 540, width: 34, height: 47), transform: nil)]
microphoneShapes.forEach { microphone.addPath($0) }

let chainCurve = CGMutablePath()
chainCurve.move(to: CGPoint(x: 238, y: 596))
chainCurve.addCurve(to: CGPoint(x: 501, y: 720), control1: CGPoint(x: 310, y: 670), control2: CGPoint(x: 421, y: 701))
chainCurve.addCurve(to: CGPoint(x: 755, y: 598), control1: CGPoint(x: 590, y: 720), control2: CGPoint(x: 715, y: 655))
let chain = chainCurve.copy(strokingWithWidth: 53, lineCap: .round, lineJoin: .round, miterLimit: 1)
let pendant = polygon([[413,733],[453,730],[455,748],[574,746],[611,777],[611,845],[585,875],[415,875]])
let silhouette = [chassis, cap, chain] + leftEarShapes + rightEarShapes + bandShapes + microphoneShapes
let unions = ["leftEar": leftEarShapes, "rightEar": rightEarShapes, "bands": bandShapes, "microphone": microphoneShapes]
let parts = [
    Part(name: "leftEye", parent: "face", pivot: [378,441], shape: CGPath(ellipseIn: CGRect(x: 316, y: 380, width: 126, height: 125), transform: nil)),
    Part(name: "rightEye", parent: "face", pivot: [623,441], shape: CGPath(ellipseIn: CGRect(x: 560, y: 380, width: 126, height: 125), transform: nil)),
    Part(name: "mouth", parent: "face", pivot: [498,549], shape: polygon([[433,529],[464,531],[499,534],[536,531],[562,528],[557,549],[540,566],[510,579],[479,577],[452,559]])),
    Part(name: "cap", parent: "body", pivot: [507,312], shape: cap),
    Part(name: "microphone", parent: "rightEar", pivot: [854,561], shape: microphone),
    Part(name: "pendant", parent: "body", pivot: [509,737], shape: pendant),
    Part(name: "chain", parent: "body", pivot: [507,675], shape: chain),
    Part(name: "leftEar", parent: "body", pivot: [235,466], shape: leftEar),
    Part(name: "rightEar", parent: "body", pivot: [790,466], shape: rightEar),
    Part(name: "bands", parent: "body", pivot: [505,278], shape: bands),
    Part(name: "face", parent: "body", pivot: [505,470], shape: CGPath(roundedRect: CGRect(x: 270, y: 332, width: 470, height: 279), cornerWidth: 126, cornerHeight: 126, transform: nil)),
    Part(name: "shell", parent: "body", pivot: [507,712], shape: nil)
]

var owners = [Int](repeating: -1, count: width * height)
var foreground = 0
for row in 0..<height {
    for column in 0..<width {
        let offset = (row * width + column) * 4
        let point = CGPoint(x: Double(column) + 0.5, y: Double(row) + 0.5)
        guard pixels[offset + 3] > 0 && silhouette.contains(where: { $0.contains(point) }) else {
            for channel in 0..<4 { pixels[offset + channel] = 0 }
            continue
        }
        let gold = pixels[offset] > 125 && Double(pixels[offset + 1]) > Double(pixels[offset + 2]) * 1.1
        owners[row * width + column] = parts.indices.first { index in
            guard let path = parts[index].shape else { return true }
            let inside = unions[parts[index].name]?.contains(where: { $0.contains(point) }) ?? path.contains(point)
            return inside && (parts[index].name != "chain" || gold)
        }!
        foreground += 1
    }
}
precondition(foreground > 430_000 && foreground < 700_000, "Check the BBRich cutout mask")
for sample in [[510,110],[380,440],[620,440],[470,545],[484,828],[311,777],[500,713],[371,663],[662,665],[739,680]] {
    precondition(pixels[(sample[1] * width + sample[0]) * 4 + 3] > 0, "Mask removed an intended robot feature")
}

func belongs(_ index: Int, _ owner: Int) -> Bool {
    if owner < 0 { return false }
    if owner == index { return true }
    if parts[index].name == "face" && owner < 3 { return true }
    return parts[index].name == "shell" && ["face", "leftEye", "rightEye", "mouth", "chain", "pendant"].contains(parts[owner].name)
}
var rectangles = [[Int]]()
for index in parts.indices {
    var left = width, top = height, right = 0, bottom = 0
    for row in 0..<height {
        for column in 0..<width where belongs(index, owners[row * width + column]) {
            left = min(left, column); top = min(top, row)
            right = max(right, column); bottom = max(bottom, row)
        }
    }
    precondition(right > left && bottom > top, "Empty sprite part: \(parts[index].name)")
    rectangles.append([left,top,right-left+1,bottom-top+1])
}
let atlasWidth = 1536
var frames = [[Int]](), atlasX = 2, atlasY = 2, rowHeight = 0
for rectangle in rectangles {
    if atlasX + rectangle[2] + 2 > atlasWidth { atlasX = 2; atlasY += rowHeight + 4; rowHeight = 0 }
    frames.append([atlasX,atlasY,rectangle[2],rectangle[3]])
    atlasX += rectangle[2] + 4
    rowHeight = max(rowHeight, rectangle[3])
}
let atlasHeight = atlasY + rowHeight + 2
let output = UnsafeMutablePointer<UInt8>.allocate(capacity: atlasWidth * atlasHeight * 4)
output.initialize(repeating: 0, count: atlasWidth * atlasHeight * 4)
defer { output.deallocate() }
for index in parts.indices {
    let original = rectangles[index], frame = frames[index]
    for row in original[1]..<(original[1]+original[3]) {
        for column in original[0]..<(original[0]+original[2]) {
            let owner = owners[row * width + column]
            if !belongs(index, owner) { continue }
            let sourceOffset = (row * width + column) * 4
            let targetOffset = ((frame[1]+row-original[1])*atlasWidth+frame[0]+column-original[0])*4
            for channel in 0..<4 { output[targetOffset + channel] = pixels[sourceOffset + channel] }
            if index != owner {
                let light = UInt8(max(145, min(210, 205 - abs(column - 500) / 7 - max(0,row-600) / 18)))
                output[targetOffset] = light; output[targetOffset+1] = light; output[targetOffset+2] = light
                output[targetOffset+3] = 255
            }
        }
    }
}
let drawOrder = ["bands","leftEar","rightEar","shell","face","leftEye","rightEye","mouth","chain","pendant","cap","microphone"]
var reconstruction = [UInt8](repeating: 0, count: byteCount)
for name in drawOrder {
    let index = parts.firstIndex { $0.name == name }!
    let original = rectangles[index], frame = frames[index]
    for row in 0..<original[3] {
        for column in 0..<original[2] {
            let sourceOffset = ((frame[1]+row)*atlasWidth+frame[0]+column)*4
            if output[sourceOffset+3] == 0 { continue }
            let targetOffset = ((original[1]+row)*width+original[0]+column)*4
            for channel in 0..<4 { reconstruction[targetOffset+channel] = output[sourceOffset+channel] }
        }
    }
}
for index in owners.indices where owners[index] >= 0 {
    for channel in 0..<4 {
        precondition(reconstruction[index*4+channel] == pixels[index*4+channel], "Neutral pose must reconstruct the retained artwork")
    }
}
let atlasContext = CGContext(data: output, width: atlasWidth, height: atlasHeight, bitsPerComponent: 8,
    bytesPerRow: atlasWidth*4, space: space, bitmapInfo: bitmapInfo)!
let atlasURL = root.appendingPathComponent("images/Bumblebee-rig.png")
let destination = CGImageDestinationCreateWithURL(atlasURL as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(destination, atlasContext.makeImage()!, nil)
precondition(CGImageDestinationFinalize(destination))
let metadata: [String: Any] = [
    "source": "BBRich.png", "sourceHash": SHA256.hash(data: sourceData).map { String(format: "%02x", $0) }.joined(),
    "sourceSize": [width,height], "atlasSize": [atlasWidth,atlasHeight], "foregroundPixels": foreground,
    "bodyPivot": [507,704], "origin": [507,887], "height": 875, "drawOrder": drawOrder,
    "layers": parts.indices.map { index -> [String: Any] in
        ["name": parts[index].name, "parent": parts[index].parent as Any? ?? NSNull(),
         "pivot": parts[index].pivot, "source": rectangles[index], "frame": frames[index]]
    }
]
let json = try JSONSerialization.data(withJSONObject: metadata, options: [.prettyPrinted,.sortedKeys])
try ("export const BUMBLEBEE_RIG = " + String(data: json, encoding: .utf8)! + ";\n")
    .write(to: root.appendingPathComponent("images/Bumblebee-rig.js"), atomically: true, encoding: .utf8)
print("Built \(parts.count) Bumblebee parts in a \(atlasWidth)x\(atlasHeight) transparent atlas; \(foreground) source pixels preserved in the neutral pose.")

if CommandLine.arguments.contains("--preview") {
    let url = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("cloud-quest-bumblebee.png")
    let destination = CGImageDestinationCreateWithURL(url as CFURL, "public.png" as CFString, 1, nil)!
    CGImageDestinationAddImage(destination, context.makeImage()!, nil)
    precondition(CGImageDestinationFinalize(destination))
    print("Neutral artwork preview: \(url.path)")
}