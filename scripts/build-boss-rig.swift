import Foundation
import CoreGraphics
import ImageIO
import CryptoKit

struct Layer {
    let name: String
    let parent: String?
    let pivot: [Int]
    let polygon: [[Int]]
}

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
let sourceURL = root.appendingPathComponent("images/Boss1.png")
let sourceData = try Data(contentsOf: sourceURL)
guard let source = CGImageSourceCreateWithData(sourceData as CFData, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil),
      image.width == 1024, image.height == 1024 else {
    fatalError("The rig is authored for the supplied 1024x1024 images/Boss1.png")
}
let width = image.width, height = image.height
let pixels = UnsafeMutablePointer<UInt8>.allocate(capacity: width * height * 4)
pixels.initialize(repeating: 0, count: width * height * 4)
defer { pixels.deallocate() }
let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
let bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue
let context = CGContext(data: pixels, width: width, height: height, bitsPerComponent: 8,
    bytesPerRow: width * 4, space: colorSpace, bitmapInfo: bitmapInfo)!
context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

var background = [Int]()
background.reserveCapacity(width * height)
func floodSeed(_ column: Int, _ row: Int) {
    guard column >= 0, row >= 0, column < width, row < height else { return }
    let pixel = (row * width + column) * 4
    guard pixels[pixel + 3] > 0 else { return }
    let minimum = min(pixels[pixel], pixels[pixel + 1], pixels[pixel + 2])
    let maximum = max(pixels[pixel], pixels[pixel + 1], pixels[pixel + 2])
    guard minimum >= 232 && Int(maximum) - Int(minimum) <= 20 else { return }
    pixels[pixel + 3] = 0
    background.append(row * width + column)
}
for column in 0..<width { floodSeed(column, 0); floodSeed(column, height - 1) }
for row in 0..<height { floodSeed(0, row); floodSeed(width - 1, row) }
for seed in [[329,150], [350,196], [326,230], [691,142], [713,184], [732,197], [687,226]] {
    floodSeed(seed[0], seed[1])
}
var cursor = 0
while cursor < background.count {
    let index = background[cursor]
    cursor += 1
    let column = index % width, row = index / width
    floodSeed(column - 1, row); floodSeed(column + 1, row)
    floodSeed(column, row - 1); floodSeed(column, row + 1)
}
for probe in [[396,359], [507,349], [388,475], [512,475], [604,382], [473,184], [784,248]] {
    precondition(pixels[(probe[1] * width + probe[0]) * 4 + 3] == 255, "Background mask damaged the robot")
}
precondition(pixels[(359 * width + 396) * 4] > pixels[(359 * width + 396) * 4 + 1], "Unexpected pixel orientation")

let layers: [Layer] = [
    Layer(name: "leftEye", parent: "head", pivot: [438,239], polygon: [[416,215],[461,222],[459,254],[415,255]]),
    Layer(name: "rightEye", parent: "head", pivot: [513,231], polygon: [[487,207],[540,203],[540,243],[487,251]]),
    Layer(name: "mouth", parent: "head", pivot: [482,267], polygon: [[414,245],[439,252],[492,252],[541,234],[547,252],[501,280],[442,280],[414,265]]),
    Layer(name: "head", parent: "body", pivot: [487,278], polygon: [[270,0],[812,0],[812,208],[715,208],[655,227],[633,267],[575,295],[430,307],[342,290],[306,252],[270,252]]),
    Layer(name: "leftFist", parent: "leftArm", pivot: [199,429], polygon: [[0,420],[124,413],[199,430],[242,477],[270,566],[279,626],[240,674],[218,718],[178,759],[63,763],[0,703]]),
    Layer(name: "rightFist", parent: "rightArm", pivot: [844,407], polygon: [[847,366],[928,377],[1024,397],[1024,700],[951,761],[881,791],[815,789],[770,755],[732,718],[700,678],[673,632],[675,586],[710,533],[750,489],[780,435]]),
    Layer(name: "leftBoot", parent: "leftLeg", pivot: [337,747], polygon: [[124,820],[203,733],[310,661],[401,711],[459,763],[461,951],[124,951]]),
    Layer(name: "rightBoot", parent: "rightLeg", pivot: [651,754], polygon: [[604,721],[657,670],[753,737],[865,775],[880,951],[547,951],[548,820]]),
    Layer(name: "leftArm", parent: "body", pivot: [301,291], polygon: [[119,381],[177,366],[211,307],[270,256],[338,242],[328,307],[287,361],[259,447],[254,485],[193,468]]),
    Layer(name: "rightArm", parent: "body", pivot: [737,274], polygon: [[674,208],[766,212],[840,251],[876,323],[930,367],[916,421],[838,457],[765,419],[734,350],[703,321]]),
    Layer(name: "leftLeg", parent: nil, pivot: [370,654], polygon: [[283,622],[379,612],[439,697],[398,780],[251,780],[251,696]]),
    Layer(name: "rightLeg", parent: nil, pivot: [612,650], polygon: [[575,614],[657,593],[744,658],[778,777],[596,777],[556,685]]),
    Layer(name: "torso", parent: "body", pivot: [512,620], polygon: [])
]
func contains(_ polygon: [[Int]], _ column: Int, _ row: Int) -> Bool {
    guard !polygon.isEmpty else { return true }
    let horizontal = Double(column) + 0.5, vertical = Double(row) + 0.5
    var inside = false
    var previous = polygon.last!
    for point in polygon {
        if (point[1] > row) != (previous[1] > row) {
            let crossing = Double(previous[0] - point[0]) * (vertical - Double(point[1]))
                / Double(previous[1] - point[1]) + Double(point[0])
            if horizontal < crossing { inside.toggle() }
        }
        previous = point
    }
    return inside
}
var labels = [Int](repeating: -1, count: width * height)
var foreground = 0
for row in 0..<height {
    for column in 0..<width where pixels[(row * width + column) * 4 + 3] > 0 {
        let pixel = (row * width + column) * 4
        let cyan = Int(pixels[pixel + 1]) > 80 && Int(pixels[pixel + 2]) > 100
            && Double(pixels[pixel]) < Double(pixels[pixel + 1]) * 0.78
        labels[row * width + column] = layers.indices.first { index in
            (index >= 3 || cyan) && contains(layers[index].polygon, column, row)
        }!
        foreground += 1
    }
}
precondition(foreground > 250_000 && foreground < 850_000, "Unexpected background mask coverage")

let torsoIndex = layers.count - 1
var visited = [Bool](repeating: false, count: labels.count)
var components = [[Int]]()
for start in labels.indices where labels[start] == torsoIndex && !visited[start] {
    var component = [start], next = 0
    visited[start] = true
    while next < component.count {
        let current = component[next]
        next += 1
        let column = current % width, row = current / width
        for (neighborColumn, neighborRow) in [(column - 1, row), (column + 1, row), (column, row - 1), (column, row + 1)] {
            if neighborColumn < 0 || neighborColumn >= width || neighborRow < 0 || neighborRow >= height { continue }
            let neighbor = neighborRow * width + neighborColumn
            if !visited[neighbor] && labels[neighbor] == torsoIndex {
                visited[neighbor] = true
                component.append(neighbor)
            }
        }
    }
    components.append(component)
}
let mainBody = components.indices.max { components[$0].count < components[$1].count }!
for index in components.indices where index != mainBody {
    let component = components[index]
    let centerColumn = component.reduce(0) { $0 + $1 % width } / component.count
    let centerRow = component.reduce(0) { $0 + $1 / width } / component.count
    let part = (3..<torsoIndex).min { left, right in
        let leftPosition = layers[left].pivot, rightPosition = layers[right].pivot
        let leftDistance = pow(Double(centerColumn - leftPosition[0]), 2) + pow(Double(centerRow - leftPosition[1]), 2)
        let rightDistance = pow(Double(centerColumn - rightPosition[0]), 2) + pow(Double(centerRow - rightPosition[1]), 2)
        return leftDistance < rightDistance
    }!
    for pixel in component { labels[pixel] = part }
}

let overlaps: [(String, String, Int)] = [
    ("leftArm", "leftFist", 55), ("rightArm", "rightFist", 65),
    ("leftLeg", "leftBoot", 50), ("rightLeg", "rightBoot", 50),
    ("torso", "leftArm", 40), ("torso", "rightArm", 45), ("torso", "head", 27)
]
func belongs(_ index: Int, _ column: Int, _ row: Int) -> Bool {
    let assigned = labels[row * width + column]
    if assigned < 0 { return false }
    if assigned == index { return true }
    if layers[index].name == "head" && assigned < 3 { return true }
    for (parent, child, radius) in overlaps where layers[index].name == parent && layers[assigned].name == child {
        let pivot = layers[assigned].pivot
        let horizontal = column - pivot[0], vertical = row - pivot[1]
        if horizontal * horizontal + vertical * vertical <= radius * radius { return true }
    }
    return false
}
var rectangles = [[Int]]()
for index in layers.indices {
    var left = width, top = height, right = 0, bottom = 0
    for row in 0..<height {
        for column in 0..<width where belongs(index, column, row) {
            left = min(left, column); top = min(top, row)
            right = max(right, column); bottom = max(bottom, row)
        }
    }
    precondition(right > left && bottom > top, "Empty rig layer: \(layers[index].name)")
    rectangles.append([left, top, right - left + 1, bottom - top + 1])
}
let atlasWidth = 1536
var atlasRects = [[Int]](), atlasColumn = 2, atlasRow = 2, rowHeight = 0
for rectangle in rectangles {
    if atlasColumn + rectangle[2] + 2 > atlasWidth {
        atlasColumn = 2; atlasRow += rowHeight + 4; rowHeight = 0
    }
    atlasRects.append([atlasColumn, atlasRow, rectangle[2], rectangle[3]])
    atlasColumn += rectangle[2] + 4
    rowHeight = max(rowHeight, rectangle[3])
}
let atlasHeight = atlasRow + rowHeight + 2
let atlasPixels = UnsafeMutablePointer<UInt8>.allocate(capacity: atlasWidth * atlasHeight * 4)
atlasPixels.initialize(repeating: 0, count: atlasWidth * atlasHeight * 4)
defer { atlasPixels.deallocate() }
for index in layers.indices {
    let original = rectangles[index], destination = atlasRects[index]
    for row in original[1]..<(original[1] + original[3]) {
        for column in original[0]..<(original[0] + original[2]) where belongs(index, column, row) {
            let sourcePixel = (row * width + column) * 4
            let targetPixel = ((destination[1] + row - original[1]) * atlasWidth + destination[0] + column - original[0]) * 4
            for channel in 0..<4 { atlasPixels[targetPixel + channel] = pixels[sourcePixel + channel] }
            if layers[index].name == "head" && labels[row * width + column] < 3 {
                atlasPixels[targetPixel] = 3; atlasPixels[targetPixel + 1] = 13; atlasPixels[targetPixel + 2] = 30
            }
        }
    }
}
let drawOrder = ["leftLeg", "rightLeg", "leftBoot", "rightBoot", "head", "leftArm", "rightArm",
    "torso", "leftEye", "rightEye", "mouth", "leftFist", "rightFist"]
var reconstructed = [UInt8](repeating: 0, count: width * height * 4)
for name in drawOrder {
    let index = layers.firstIndex { $0.name == name }!
    let original = rectangles[index], rectangle = atlasRects[index]
    for row in 0..<original[3] {
        for column in 0..<original[2] {
            let sourcePixel = ((rectangle[1] + row) * atlasWidth + rectangle[0] + column) * 4
            if atlasPixels[sourcePixel + 3] == 0 { continue }
            let targetPixel = ((original[1] + row) * width + original[0] + column) * 4
            for channel in 0..<4 { reconstructed[targetPixel + channel] = atlasPixels[sourcePixel + channel] }
        }
    }
}
for index in labels.indices where labels[index] >= 0 {
    for channel in 0..<4 {
        precondition(reconstructed[index * 4 + channel] == pixels[index * 4 + channel], "Bind pose changed source pixels")
    }
}
let atlasContext = CGContext(data: atlasPixels, width: atlasWidth, height: atlasHeight, bitsPerComponent: 8,
    bytesPerRow: atlasWidth * 4, space: colorSpace, bitmapInfo: bitmapInfo)!
let atlasURL = root.appendingPathComponent("images/Boss1-rig.png")
let destination = CGImageDestinationCreateWithURL(atlasURL as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(destination, atlasContext.makeImage()!, nil)
precondition(CGImageDestinationFinalize(destination), "Could not write sprite atlas")
let sourceHash = SHA256.hash(data: sourceData).map { String(format: "%02x", $0) }.joined()
let manifest: [String: Any] = [
    "source": "Boss1.png", "sourceHash": sourceHash, "sourceSize": [width, height],
    "atlasSize": [atlasWidth, atlasHeight], "origin": [512,936], "scale": 0.43,
    "bodyPivot": [512,665], "chest": [335,302,242,240], "drawOrder": drawOrder,
    "foregroundPixels": foreground, "removedBackgroundPixels": background.count,
    "layers": layers.indices.map { index -> [String: Any] in
        let layer = layers[index]
        return ["name": layer.name, "parent": layer.parent as Any? ?? NSNull(), "pivot": layer.pivot,
            "source": rectangles[index], "frame": atlasRects[index]]
    }
]
let metadata = try JSONSerialization.data(withJSONObject: manifest, options: [.prettyPrinted, .sortedKeys])
let module = "export const WIZARD_RIG = " + String(data: metadata, encoding: .utf8)! + ";\n"
try module.write(to: root.appendingPathComponent("images/Boss1-rig.js"), atomically: true, encoding: .utf8)
print("Built \(layers.count) articulated layers, \(atlasWidth)x\(atlasHeight) atlas; preserved \(foreground) foreground pixels exactly in the bind pose; removed \(background.count) background pixels.")