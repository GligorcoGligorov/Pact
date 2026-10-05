/**
 * What a streak looks like (docs/design/fun-pass-plan.md). Pure rules, no motion, so a test can
 * decide them.
 */

/** How alive the flame is: out, a spark, burning, blazing. The streak decides, not the screen. */
export type FlameLevel = 0 | 1 | 2 | 3

export function flameLevel(streak: number): FlameLevel {
	if (streak <= 0) return 0
	if (streak < 3) return 1
	if (streak < 7) return 2
	return 3
}
