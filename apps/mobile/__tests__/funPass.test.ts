/**
 * The fun pass's rules that a test can decide (docs/design/fun-pass-plan.md): what each streak
 * looks like, when a milestone shows, and that celebrations stay short.
 */
import { flameLevel } from '@/lib/streaks'

it('the flame is out at zero, a spark until 3, burning until 7, then blazing', () => {
	expect([0, 1, 2, 3, 6, 7, 30].map(flameLevel)).toEqual([0, 1, 1, 2, 2, 3, 3])
})
