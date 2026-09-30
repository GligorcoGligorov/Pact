// Draws the judge eval's 8 synthetic fakes (apps/web/src/server/ai/judge.eval.mts) into
// apps/web/eval-photos/synthetic/, with their labels.json. Every one is a check-in the judge
// should call "suspicious": two screenshots, two photos of a screen, two of the wrong object,
// two with the habit but not the challenge. No real photo and no person in any of them.
//
//   swift apps/web/scripts/eval-synthetic-photos.swift
//
// The output folder is gitignored.
import AppKit

let out = URL(fileURLWithPath: CommandLine.arguments.count > 1
	? CommandLine.arguments[1]
	: "apps/web/eval-photos/synthetic")
try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)

let W = 900, H = 1200

func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat = 1) -> NSColor {
	NSColor(calibratedRed: r / 255, green: g / 255, blue: b / 255, alpha: a)
}

func text(_ s: String, _ x: CGFloat, _ y: CGFloat, size: CGFloat, weight: NSFont.Weight = .regular, color c: NSColor = .white) {
	let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: size, weight: weight), .foregroundColor: c]
	(s as NSString).draw(at: NSPoint(x: x, y: y), withAttributes: attrs)
}

func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ c: NSColor, radius: CGFloat = 0) {
	c.setFill()
	NSBezierPath(roundedRect: NSRect(x: x, y: y, width: w, height: h), xRadius: radius, yRadius: radius).fill()
}

func oval(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ c: NSColor) {
	c.setFill()
	NSBezierPath(ovalIn: NSRect(x: x, y: y, width: w, height: h)).fill()
}

/// Camera-ish grain over the whole frame, so a drawn scene isn't a flat vector.
func grain(_ amount: CGFloat) {
	var rng = SystemRandomNumberGenerator()
	for _ in 0..<(W * H / 40) {
		let v = CGFloat(Int.random(in: 0...255, using: &rng))
		color(v, v, v, amount).setFill()
		NSRect(x: Int.random(in: 0..<W), y: Int.random(in: 0..<H), width: 2, height: 2).fill()
	}
}

func render(_ name: String, _ draw: () -> Void) throws {
	let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8,
		samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
	NSGraphicsContext.saveGraphicsState()
	NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
	draw()
	NSGraphicsContext.restoreGraphicsState()
	let jpeg = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.82])!
	try jpeg.write(to: out.appendingPathComponent(name))
}

// ── Screenshots ──────────────────────────────────────────────────────────────

func phoneChrome(_ bg: NSColor) {
	rect(0, 0, CGFloat(W), CGFloat(H), bg)
	text("9:41", 60, CGFloat(H) - 70, size: 34, weight: .semibold)
	rect(CGFloat(W) - 150, CGFloat(H) - 62, 70, 30, .white, radius: 8)
}

try render("screenshot-run-app.jpg") {
	phoneChrome(color(18, 18, 22))
	text("Morning Run", 60, 980, size: 58, weight: .bold)
	text("Today · 07:12", 60, 930, size: 30, color: color(160, 160, 170))
	rect(60, 480, 780, 400, color(40, 60, 50), radius: 24)
	let path = NSBezierPath()
	path.move(to: NSPoint(x: 120, y: 540))
	path.curve(to: NSPoint(x: 780, y: 820), controlPoint1: NSPoint(x: 300, y: 900), controlPoint2: NSPoint(x: 600, y: 420))
	path.lineWidth = 10
	color(255, 90, 60).setStroke()
	path.stroke()
	text("3.02 km", 60, 330, size: 96, weight: .heavy)
	text("Pace 5'41\" /km   ·   17:11", 60, 270, size: 34, color: color(200, 200, 210))
	rect(60, 110, 780, 100, color(255, 90, 60), radius: 50)
	text("Share activity", 330, 140, size: 38, weight: .semibold)
}

try render("screenshot-water-tracker.jpg") {
	phoneChrome(color(236, 244, 252))
	text("Hydration", 60, 1000, size: 60, weight: .bold, color: color(20, 40, 70))
	text("Goal reached", 60, 950, size: 32, color: color(60, 110, 170))
	for i in 0..<8 {
		let x = CGFloat(80 + (i % 4) * 190), y = CGFloat(560 + (i / 4) * 230)
		rect(x, y, 130, 190, color(40, 120, 220, 0.85), radius: 18)
	}
	text("8 / 8 glasses", 60, 380, size: 84, weight: .heavy, color: color(20, 40, 70))
	text("2.0 L today", 60, 320, size: 36, color: color(60, 110, 170))
}

// ── Photos of a screen ───────────────────────────────────────────────────────

/// A monitor seen at an angle: dark room, bezel, the picture skewed, scanlines and glare.
func photoOfScreen(_ picture: () -> Void) {
	rect(0, 0, CGFloat(W), CGFloat(H), color(28, 26, 30))
	let ctx = NSGraphicsContext.current!.cgContext
	ctx.saveGState()
	ctx.translateBy(x: 450, y: 600)
	ctx.rotate(by: 0.08)
	ctx.concatenate(CGAffineTransform(a: 1, b: 0.06, c: -0.1, d: 1, tx: 0, ty: 0))
	ctx.translateBy(x: -450, y: -600)
	rect(90, 250, 720, 720, color(12, 12, 14), radius: 12)
	NSBezierPath(rect: NSRect(x: 115, y: 275, width: 670, height: 670)).addClip()
	picture()
	for y in stride(from: 275, to: 945, by: 5) {
		color(0, 0, 0, 0.22).setFill()
		NSRect(x: 115, y: y, width: 670, height: 2).fill()
	}
	ctx.restoreGState()
	oval(420, 640, 360, 200, color(255, 255, 255, 0.10))
	grain(0.06)
}

try render("screen-photo-salad.jpg") {
	photoOfScreen {
		rect(115, 275, 670, 670, color(240, 232, 218))
		oval(220, 380, 460, 380, .white)
		for (x, y, s) in [(300, 520, 120), (420, 560, 140), (360, 460, 110), (500, 480, 120), (460, 620, 90)] {
			oval(CGFloat(x), CGFloat(y), CGFloat(s), CGFloat(s) * 0.7, color(70, 150, 60))
		}
		oval(380, 520, 60, 60, color(220, 50, 40))
		oval(520, 560, 50, 50, color(220, 50, 40))
	}
}

try render("screen-photo-book.jpg") {
	photoOfScreen {
		rect(115, 275, 670, 670, color(250, 248, 240))
		text("Chapter 4", 180, 860, size: 40, weight: .bold, color: color(30, 30, 30))
		for line in 0..<14 {
			rect(180, CGFloat(800 - line * 36), CGFloat(520 - (line % 3) * 60), 12, color(90, 90, 90))
		}
	}
}

// ── The wrong object ─────────────────────────────────────────────────────────

func tableScene() {
	rect(0, 0, CGFloat(W), CGFloat(H), color(196, 164, 120))
	for y in stride(from: 0, to: H, by: 60) {
		color(170, 138, 98, 0.5).setFill()
		NSRect(x: 0, y: y, width: W, height: 8).fill()
	}
}

try render("wrong-object-mug.jpg") {
	tableScene()
	oval(250, 330, 400, 120, color(120, 90, 60, 0.5))
	rect(290, 390, 320, 380, color(245, 245, 240), radius: 30)
	oval(290, 730, 320, 80, color(90, 55, 30))
	let handle = NSBezierPath(ovalIn: NSRect(x: 560, y: 480, width: 160, height: 200))
	handle.lineWidth = 36
	color(245, 245, 240).setStroke()
	handle.stroke()
	grain(0.08)
}

try render("wrong-object-pizza.jpg") {
	tableScene()
	oval(150, 300, 600, 600, color(214, 160, 80))
	oval(190, 340, 520, 520, color(200, 60, 40))
	for (x, y) in [(300, 500), (480, 620), (380, 700), (560, 450), (330, 380)] {
		oval(CGFloat(x), CGFloat(y), 90, 90, color(150, 40, 40))
	}
	grain(0.08)
}

// ── The habit, but not the challenge ─────────────────────────────────────────

try render("missing-challenge-book.jpg") {
	tableScene()
	rect(160, 330, 290, 520, color(252, 248, 236), radius: 6)
	rect(450, 330, 290, 520, color(252, 248, 236), radius: 6)
	for line in 0..<16 {
		rect(190, CGFloat(790 - line * 28), 230, 8, color(120, 110, 100))
		rect(480, CGFloat(790 - line * 28), 230, 8, color(120, 110, 100))
	}
	grain(0.07)
}

try render("missing-challenge-water.jpg") {
	rect(0, 0, CGFloat(W), CGFloat(H), color(230, 226, 220))
	rect(0, 0, CGFloat(W), 420, color(200, 190, 178))
	rect(330, 380, 240, 480, color(255, 255, 255, 0.35), radius: 20)
	rect(345, 395, 210, 330, color(190, 220, 235, 0.8), radius: 14)
	oval(345, 700, 210, 50, color(215, 235, 245))
	grain(0.07)
}

// ── Labels ───────────────────────────────────────────────────────────────────

let labels: [[String: String]] = [
	["file": "screenshot-run-app.jpg", "habit": "Run 3 km before 9", "challenge": "Hold up three fingers", "expected": "suspicious", "why": "a screenshot of a running app, no challenge"],
	["file": "screenshot-water-tracker.jpg", "habit": "Drink 8 glasses of water", "challenge": "Include something blue", "expected": "suspicious", "why": "a screenshot of a tracker app, not a photo"],
	["file": "screen-photo-salad.jpg", "habit": "Eat a salad for lunch", "challenge": "Show a spoon", "expected": "suspicious", "why": "a photo of a monitor showing a salad, no spoon"],
	["file": "screen-photo-book.jpg", "habit": "Read 20 pages", "challenge": "Include something red", "expected": "suspicious", "why": "a photo of a screen showing a page, nothing red"],
	["file": "wrong-object-mug.jpg", "habit": "Read 20 pages", "challenge": "Hold up three fingers", "expected": "suspicious", "why": "a coffee mug, no book, no fingers"],
	["file": "wrong-object-pizza.jpg", "habit": "Eat a salad for lunch", "challenge": "Include a fork", "expected": "suspicious", "why": "a pizza, not a salad, no fork"],
	["file": "missing-challenge-book.jpg", "habit": "Read 20 pages", "challenge": "Include something blue", "expected": "suspicious", "why": "an open book, but nothing blue"],
	["file": "missing-challenge-water.jpg", "habit": "Drink 8 glasses of water", "challenge": "Hold up three fingers", "expected": "suspicious", "why": "a glass of water, but no fingers"]
]
let json = try JSONSerialization.data(withJSONObject: labels, options: [.prettyPrinted, .sortedKeys])
try json.write(to: out.appendingPathComponent("labels.json"))
print("wrote \(labels.count) photos and labels.json to \(out.path)")
