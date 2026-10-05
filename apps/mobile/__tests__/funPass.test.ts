/**
 * The fun pass's rules that a test can decide (docs/design/fun-pass-plan.md): what each streak
 * looks like, when a milestone shows, and that celebrations stay short.
 */
import { CELEBRATION, celebrationGoneMs, flameLevel, milestoneFor } from '@/lib/streaks'

it('the flame is out at zero, a spark until 3, burning until 7, then blazing', () => {
	expect([0, 1, 2, 3, 6, 7, 30].map(flameLevel)).toEqual([0, 1, 1, 2, 2, 3, 3])
})

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
