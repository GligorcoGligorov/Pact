/**
 * The fun pass's rules that a test can decide (docs/design/fun-pass-plan.md): what each streak
 * looks like, when a milestone shows, and that celebrations stay short.
 */
import { drumrollMs, REVEAL } from '@/lib/reveal'
import { CELEBRATION, celebrationGoneMs, milestoneFor } from '@/lib/streaks'

it('a milestone shows only on the day the streak reaches 3, 7 or 14', () => {
	expect([2, 3, 4, 7, 8, 14, 15, 21].map(milestoneFor)).toEqual([
		null,
		3,
		null,
		7,
		null,
		14,
		null,
		null
	])
})

it('a celebration lands within 400ms and is gone by 700ms', () => {
	expect(CELEBRATION.landMs).toBeLessThanOrEqual(400)
	expect(celebrationGoneMs).toBeLessThanOrEqual(700)
})

it('the finale keeps the same budget: every drum hit and the chain land within 400ms', () => {
	expect(REVEAL.beatMs).toBeLessThanOrEqual(400)
	expect(REVEAL.beatUpMs).toBeLessThan(REVEAL.beatMs)
	// The last tile starts by chainMs and its pop lands inside 400ms after it.
	expect(REVEAL.chainMs + 400).toBeLessThanOrEqual(700)
	// A drumroll is a beat of suspense, not a wait.
	expect(drumrollMs).toBeLessThanOrEqual(1500)
})
