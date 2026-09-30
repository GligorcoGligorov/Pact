/**
 * The daily challenge (R9): one short instruction a check-in photo has to show, so a photo
 * taken today is hard to fake with an old one. Every prompt is something anyone can do in a
 * few seconds, anywhere, and that the AI judge can see in a single photo.
 *
 * No challenge is stored per day. `challengeFor` picks one from the pact id and the day, so
 * every reader, and the judge, agrees on it with nothing written. The check-in stores the
 * text it was taken against, so editing this list never changes a past verdict.
 */

import { daysBetween, type Day } from './day'

export const CHALLENGES = [
	'Hold up three fingers',
	'Give a thumbs up',
	'Make a peace sign',
	'Hold up one finger',
	'Show an open palm',
	'Make a fist',
	'Point at the camera',
	'Cross your fingers',
	'Make an OK sign',
	'Hold up four fingers',
	'Include something blue',
	'Include something red',
	'Include something green',
	'Include something yellow',
	'Include something round',
	'Include a shoe',
	'Include a cup or a glass',
	'Include a key',
	'Include a pen or a pencil',
	'Include a spoon or a fork',
	'Include a book',
	'Include a plant or a leaf',
	'Include a coin',
	'Include your watch or the time on a screen',
	'Include a window',
	'Include a door handle',
	'Include your elbow',
	'Include your knee',
	'Take it from above',
	'Take it tilted sideways',
	'Include a written number'
] as const

// Consecutive days step through the list by this stride. It shares no factor with the
// list's length, so a pact sees every challenge once before any repeats.
export const CHALLENGE_STRIDE = 7

const EPOCH: Day = '1970-01-01'
const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

/** R9: the same challenge for every reader of this pact on this day. */
export function challengeFor(pactId: string, day: Day): string {
	const dayNumber = daysBetween(EPOCH, day)
	const index = (hash(pactId) + dayNumber * CHALLENGE_STRIDE) % CHALLENGES.length
	return CHALLENGES[index]
}

/** FNV-1a, 32-bit: stable across runtimes, so a pact's challenges never move. */
function hash(text: string): number {
	let h = FNV_OFFSET
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i)
		h = Math.imul(h, FNV_PRIME)
	}
	return h >>> 0
}
