// Builds the presentation: slides.html → index.html, one self-contained file.
//
//   node docs/presentation/build.mjs
//
// Shots come from docs/showcase/, shrunk to JPEG with macOS `sips`; fonts from the mobile app's
// Bricolage Grotesque package. Both are inlined as base64.
//
// pact.pdf is a 1920×1080 screenshot of each slide (Playwright, system Chrome), joined with
// pdf-lib: headless Chrome's own print-to-PDF fails on this page.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const showcase = join(root, 'docs/showcase')
const fonts = join(root, 'node_modules/@expo-google-fonts/bricolage-grotesque')

const FONT_FILES = {
	400: '400Regular/BricolageGrotesque_400Regular.ttf',
	600: '600SemiBold/BricolageGrotesque_600SemiBold.ttf',
	800: '800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'
}
// Wide enough to stay sharp full screen on a retina display, small enough to keep the file light.
const PHONE_WIDTH = 900
const WIDE_WIDTH = 1800
const JPEG_QUALITY = '82'

const work = mkdtempSync(join(tmpdir(), 'pact-deck-'))
const shotCache = new Map()

function shot(name) {
	if (shotCache.has(name)) return shotCache.get(name)
	const src = join(showcase, `${name}.png`)
	const out = join(work, `${name}.jpg`)
	const [w, h] = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', src], {
		encoding: 'utf8'
	})
		.match(/\d+$/gm)
		.map(Number)
	const width = Math.min(w, h > w ? PHONE_WIDTH : WIDE_WIDTH)
	execFileSync(
		'sips',
		[
			'-s',
			'format',
			'jpeg',
			'-s',
			'formatOptions',
			JPEG_QUALITY,
			'--resampleWidth',
			String(width),
			src,
			'--out',
			out
		],
		{
			stdio: 'ignore'
		}
	)
	const uri = `data:image/jpeg;base64,${readFileSync(out).toString('base64')}`
	shotCache.set(name, uri)
	return uri
}

function font(weight) {
	const file = FONT_FILES[weight]
	if (!file) throw new Error(`No font for weight ${weight}`)
	return `data:font/ttf;base64,${readFileSync(join(fonts, file)).toString('base64')}`
}

try {
	const html = readFileSync(join(here, 'slides.html'), 'utf8')
		.replace(/shot:([\w-]+)/g, (_, name) => shot(name))
		.replace(/font:(\d+)/g, (_, weight) => font(weight))
	const index = join(here, 'index.html')
	writeFileSync(index, html)
	console.log(`index.html: ${(html.length / 1024 / 1024).toFixed(1)} MB, ${shotCache.size} shots`)
} finally {
	rmSync(work, { recursive: true, force: true })
}
