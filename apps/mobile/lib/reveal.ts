/**
 * The finale's timing (docs/design/fun-pass-plan.md: every motion lands within 400ms and is
 * faded by 700ms). The drumroll is a run of short beats, each inside that budget, so the pause
 * reads as suspense without any single motion dragging. Reduce Motion skips the drumroll.
 */
export const REVEAL = {
	/** The whole chain has started popping in by then. */
	chainMs: 300,
	/** The most one tile waits after the one before it, on a short pact. */
	chainStepMs: 24,
	/** Drum hits before the reveal. */
	beats: 4,
	/** One hit: up and back. */
	beatMs: 280,
	/** The hit's squash, inside beatMs. */
	beatUpMs: 110
} as const

/** How long the drumroll holds before the reveal. */
export const drumrollMs = REVEAL.beats * REVEAL.beatMs
