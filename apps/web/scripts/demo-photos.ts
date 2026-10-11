/**
 * Downloads the demo seed's photos into apps/web/demo-photos/ (gitignored, local only), so the
 * Crew Wall looks alive: a different real photo for every member and day. They are Unsplash
 * photos served by Lorem Picsum (https://picsum.photos, the Unsplash licence), picked by hand:
 * `run/` for the run club (paths, roads, coast, tracks), `calm/` for Sunrise Yoga (morning
 * light, tea, quiet places). Run once: `npm run demo:photos`; `npm run seed:demo` uses them
 * when they are there. Safe to re-run: a photo already on disk is skipped.
 */
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEMO_PHOTO_IDS = {
	run: [
		17, 22, 57, 70, 81, 103, 155, 173, 177, 182, 186, 190, 191, 202, 203, 204, 216, 241, 254, 255,
		277, 278, 197, 229, 265, 31, 156, 196, 12, 13, 14, 16, 46, 10, 11, 47, 74, 15, 28, 29
	],
	calm: [
		30, 42, 63, 110, 109, 113, 129, 206, 213, 225, 264, 268, 270, 273, 176, 165, 107, 112, 118, 128,
		152, 159, 189, 239, 25, 82, 106, 54, 38, 37
	]
} as const

const WIDTH = 900
const HEIGHT = 1200

export const DEMO_PHOTO_DIR = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
	'demo-photos'
)

async function exists(file: string): Promise<boolean> {
	return stat(file).then(
		() => true,
		() => false
	)
}

async function main() {
	let fetched = 0
	for (const [set, ids] of Object.entries(DEMO_PHOTO_IDS)) {
		const dir = path.join(DEMO_PHOTO_DIR, set)
		await mkdir(dir, { recursive: true })
		for (const id of ids) {
			const file = path.join(dir, `${id}.jpg`)
			if (await exists(file)) continue
			const res = await fetch(`https://picsum.photos/id/${id}/${WIDTH}/${HEIGHT}.jpg`)
			if (!res.ok) throw new Error(`picsum ${id}: HTTP ${res.status}`)
			await writeFile(file, Buffer.from(await res.arrayBuffer()))
			fetched++
		}
	}
	process.stdout.write(`demo:photos: ${fetched} downloaded into ${DEMO_PHOTO_DIR}\n`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	main().catch((error: unknown) => {
		process.stderr.write(`demo:photos: ${error instanceof Error ? error.message : String(error)}\n`)
		process.exit(1)
	})
}
