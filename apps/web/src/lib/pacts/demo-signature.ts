/**
 * Demo signatures for the seed (`npm run seed:demo`) and the landing page: SVG path data in the
 * signature box, drawn by code in one of four hands. Pure, so both can import it.
 */

export type Hand = 'cursive' | 'angular' | 'tall' | 'print'

/** Printed capitals for the printed hand, in a 30×60 box with the baseline at y = 0. */
const PRINTED: Record<string, string> = {
	D: 'M0 0 L0 -60 C40 -60 40 0 0 0',
	A: 'M0 0 L15 -60 L30 0 M6 -24 L24 -24',
	B: 'M0 0 L0 -60 C34 -60 34 -30 0 -30 C38 -30 38 0 0 0',
	C: 'M30 -54 C10 -66 0 -44 0 -30 C0 -12 12 6 30 -6',
	default: 'M0 -60 L30 -60 M15 -60 L15 0'
}

/**
 * A demo signature as SVG path data in the 300×120 signature box, in one of four hands: a
 * looping cursive, a fast angular scrawl, a tall narrow slant, or printed initials with a
 * flourish. Proportions come from the name, so the same name always signs the same way.
 */
export function demoSignature(name: string, hand: Hand): string {
	// FNV-1a, then a xorshift: names that differ by a letter still sign very differently.
	let seed = 2166136261
	for (const ch of name) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0
	const rand = () => {
		seed ^= seed << 13
		seed ^= seed >>> 17
		seed ^= seed << 5
		seed >>>= 0
		return (seed % 10_000) / 10_000
	}
	const f = (n: number) => n.toFixed(1)
	const base = 80 + rand() * 8
	let x = 16 + rand() * 12
	let d = ''

	if (hand === 'cursive') {
		// A big looped capital, then round joined letters, then an underline swept back.
		d = `M${f(x)} ${f(base)} C${f(x - 6)} ${f(base - 70)} ${f(x + 46)} ${f(base - 72)} ${f(x + 22)} ${f(base - 6)}`
		d += ` C${f(x + 14)} ${f(base + 8)} ${f(x + 4)} ${f(base - 30)} ${f(x + 34)} ${f(base - 26)}`
		x += 34
		for (let i = 0; i < name.length + 3; i++) {
			const w = 12 + rand() * 8
			d += ` C${f(x + 2)} ${f(base - 24)} ${f(x + w)} ${f(base - 24)} ${f(x + w * 0.7)} ${f(base)}`
			x += w * 0.9
		}
		d += ` Q${f(x + 30)} ${f(base + 14)} ${f(30)} ${f(base + 16)}`
	} else if (hand === 'angular') {
		// A quick scrawl of sharp peaks, uneven, ending in a long rising tail.
		d = `M${f(x)} ${f(base - 10)} L${f(x + 10)} ${f(base - 56)} L${f(x + 18)} ${f(base)}`
		x += 18
		for (let i = 0; i < name.length + 5; i++) {
			const w = 8 + rand() * 9
			const h = 14 + rand() * (i % 2 ? 34 : 18)
			d += ` L${f(x + w / 2)} ${f(base - h)} L${f(x + w)} ${f(base - 2 * rand())}`
			x += w
		}
		d += ` L${f(Math.min(x + 70, 294))} ${f(base - 44)}`
	} else if (hand === 'tall') {
		// Narrow, upright, steeply slanted strokes with tall ascenders, and a dot.
		for (let i = 0; i < name.length + 4; i++) {
			const h = i === 0 ? 86 : 22 + rand() * (i % 3 === 0 ? 48 : 18)
			const w = 7 + rand() * 5
			d += `${d ? ' ' : ''}M${f(x)} ${f(base)} Q${f(x + 12)} ${f(base - h)} ${f(x + w + 10)} ${f(base - h * 0.15)}`
			x += w + 6
		}
		d += ` M${f(x + 10)} ${f(base - 50)} L${f(x + 11)} ${f(base - 49)}`
		d += ` M${f(18)} ${f(base + 10)} Q${f(x / 2)} ${f(base + 4)} ${f(x + 16)} ${f(base + 12)}`
	} else {
		// The initial printed big and boxy, then the rest of the name as a fast flourish.
		const initial = PRINTED[name.charAt(0).toUpperCase()] ?? PRINTED.default!
		d = initial.replace(
			/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,
			(_, px: string, py: string) => `${f(Number(px) + x)} ${f(Number(py) + base)}`
		)
		x += 44
		d += ` M${f(x)} ${f(base - 16)} C${f(x + 26)} ${f(base - 48)} ${f(x + 44)} ${f(base + 6)} ${f(x + 70)} ${f(base - 20)}`
		d += ` C${f(x + 86)} ${f(base - 36)} ${f(x + 100)} ${f(base - 4)} ${f(x + 128)} ${f(base - 30)}`
		d += ` M${f(10)} ${f(base + 12)} L${f(Math.min(x + 140, 294))} ${f(base + 4)}`
	}
	return d
}
