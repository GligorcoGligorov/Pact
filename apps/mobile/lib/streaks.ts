/**
 * What a streak looks like (docs/design/fun-pass-plan.md). Pure rules, no motion, so a test can
 * decide them.
 */

/** The streaks worth a moment of their own: the habit catching, a week, two weeks. */
export const MILESTONES = [3, 7, 14] as const
export type Milestone = (typeof MILESTONES)[number]

/** The milestone a streak has just reached, or null: only on the day it lands exactly. */
export function milestoneFor(streak: number): Milestone | null {
	return (MILESTONES as readonly number[]).includes(streak) ? (streak as Milestone) : null
}

/**
 * Every celebration's clock (docs/design/fun-pass-plan.md): it lands by `landMs` and is gone by
 * `goneMs`, so a burst is a beat, never something to wait out.
 */
export const CELEBRATION = { landMs: 380, holdMs: 120, fadeMs: 180 } as const
export const celebrationGoneMs = CELEBRATION.landMs + CELEBRATION.holdMs + CELEBRATION.fadeMs
