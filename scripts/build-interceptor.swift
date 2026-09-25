import Foundation
import CoreGraphics
import ImageIO

let size = 1024
let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: size * 4,
    space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
context.translateBy(x: 0, y: CGFloat(size))
context.scaleBy(x: 1, y: -1)
context.setLineJoin(.round)

func color(_ hex: UInt32, _ alpha: CGFloat = 1) -> CGColor {
    CGColor(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255,
        blue: CGFloat(hex & 255) / 255, alpha: alpha)
}
func shape(_ points: [[CGFloat]], _ colors: [UInt32], _ edge: UInt32 = 0x102942, _ thickness: CGFloat = 7) {
    let path = CGMutablePath()
    path.move(to: CGPoint(x: points[0][0], y: points[0][1]))
    for point in points.dropFirst() { path.addLine(to: CGPoint(x: point[0], y: point[1])) }
    path.closeSubpath()
    context.saveGState()
    context.addPath(path); context.clip()
    let gradient = CGGradient(colorsSpace: colorSpace, colors: colors.map { color($0) } as CFArray, locations: nil)!
    context.drawLinearGradient(gradient, start: CGPoint(x: 245, y: 165), end: CGPoint(x: 720, y: 860), options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
    context.restoreGState()
    context.addPath(path); context.setStrokeColor(color(edge)); context.setLineWidth(thickness); context.strokePath()
}
func line(_ points: [[CGFloat]], _ ink: UInt32, _ thickness: CGFloat) {
    context.beginPath(); context.move(to: CGPoint(x: points[0][0], y: points[0][1]))
    for point in points.dropFirst() { context.addLine(to: CGPoint(x: point[0], y: point[1])) }
    context.setStrokeColor(color(ink)); context.setLineWidth(thickness); context.strokePath()
}
func panel(_ rectangle: CGRect, _ fill: UInt32, _ border: UInt32, _ radius: CGFloat = 5) {
    let path = CGPath(roundedRect: rectangle, cornerWidth: radius, cornerHeight: radius, transform: nil)
    context.addPath(path); context.setFillColor(color(fill)); context.fillPath()
    context.addPath(path); context.setStrokeColor(color(border)); context.setLineWidth(4); context.strokePath()
}

shape([[349,653],[293,850],[367,923],[431,898],[450,730]], [0x7c91a4,0x203c55,0x101e33])
shape([[675,653],[731,850],[657,923],[593,898],[574,730]], [0x7c91a4,0x203c55,0x101e33])
for side: CGFloat in [-1, 1] {
    let horizontal = 512 + side * 157
    panel(CGRect(x: horizontal - 32, y: 861, width: 64, height: 56), 0x071b34, 0x789aae, 12)
    line([[horizontal - 24,903],[horizontal + 24,903]], 0x23bcff, 9)
    line([[horizontal - 19,892],[horizontal + 19,892]], 0x98eaff, 5)
}
shape([[400,351],[311,388],[219,617],[80,791],[83,832],[353,768],[436,585]], [0xf0f6fb,0xb7c9d8,0x47627e])
shape([[624,351],[713,388],[805,617],[944,791],[941,832],[671,768],[588,585]], [0xf0f6fb,0xb7c9d8,0x47627e])
shape([[313,467],[268,631],[151,768],[339,713],[382,564]], [0x36577e,0x112d50,0x071b35], 0x688da9, 4)
shape([[711,467],[756,631],[873,768],[685,713],[642,564]], [0x36577e,0x112d50,0x071b35], 0x688da9, 4)
line([[309,543],[280,646],[210,731]], 0x40cfea, 8)
line([[715,543],[744,646],[814,731]], 0x40cfea, 8)
line([[103,793],[325,733]], 0xf4fbff, 5)
line([[921,793],[699,733]], 0xf4fbff, 5)

shape([[512,62],[458,178],[428,328],[387,477],[401,709],[447,851],[512,902],[577,851],[623,709],[637,477],[596,328],[566,178]],
    [0xffffff,0xdfebf5,0x879eae,0x284561])
shape([[512,94],[477,211],[469,329],[485,349],[512,306],[539,349],[555,329],[547,211]], [0xddefff,0x4c7494,0x142f51], 0x8bb1c9, 4)
line([[512,101],[512,291]], 0xeffbff, 7)
shape([[512,310],[458,391],[447,538],[464,628],[512,662],[560,628],[577,538],[566,391]], [0x7dd8f2,0x1d4b71,0x041a2f], 0x13293e, 9)
shape([[511,334],[471,401],[466,525],[482,588],[511,611],[542,586],[556,525],[549,401]], [0x9eecff,0x1e85ae,0x0d324e], 0x8ad8e6, 4)
line([[482,407],[479,500],[488,531]], 0xccfaff, 9)
line([[531,365],[546,425],[550,476]], 0xffffff, 3)
shape([[475,641],[449,702],[464,812],[512,851],[560,812],[575,702],[549,641],[512,675]], [0x314e6c,0x182f49], 0xd1e3f0, 5)
for index in 0..<5 {
    let vertical = 707 + CGFloat(index) * 20
    line([[478,vertical],[546,vertical]], 0x092137, 10)
    line([[480,vertical - 3],[544,vertical - 3]], 0x8ba1b2, 3)
}
for side: CGFloat in [-1, 1] {
    let horizontal = 512 + side * 118
    shape([[horizontal - 23,403],[horizontal - 19,278],[horizontal + 19,278],[horizontal + 23,403]],
        [0xf3f7f8,0x7593a9,0x29435c], 0x1a334b, 5)
    panel(CGRect(x: horizontal - 13, y: 264, width: 26, height: 28), 0x23404e, 0x5be8ff, 4)
    line([[horizontal,310],[horizontal,380]], 0xb7e8fa, 4)
    for index in 0..<5 {
        let vertical = 449 + CGFloat(index) * 45
        line([[horizontal - 12,vertical],[horizontal + 6,vertical + 11]], 0x6889a2, 3)
        context.setFillColor(color(0x1b3850))
        context.fillEllipse(in: CGRect(x: horizontal - 4, y: vertical + 14, width: 6, height: 6))
    }
    line([[512 + side * 72,343],[512 + side * 88,422],[512 + side * 94,572],[512 + side * 64,660]], 0xffffff, 4)
}
for (index, shade) in [0xf25022,0x7fba00,0x00a4ef,0xffb900].enumerated() {
    let column = CGFloat(index % 2), row = CGFloat(index / 2)
    panel(CGRect(x: 487 + column * 28, y: 214 + row * 26, width: 21, height: 19), UInt32(shade), 0xe4f6ff, 2)
}
let target = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("images/Interceptor.png")
let destination = CGImageDestinationCreateWithURL(target as CFURL, "public.png" as CFString, 1, nil)!
CGImageDestinationAddImage(destination, context.makeImage()!, nil)
precondition(CGImageDestinationFinalize(destination), "Unable to write interceptor artwork")
print("Generated 1024x1024 transparent images/Interceptor.png")