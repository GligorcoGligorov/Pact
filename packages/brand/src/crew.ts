/**
 * Crew colours: the one colour each pact picks as its identity. A crew colour
 * marks what belongs to that crew (its hero, ring, card accent, feed stripe);
 * it never means "do it" or "done", which stays the semantic success green.
 * So there is no green here, and every seed sits well away from success's hue.
 *
 * The keys are the wire values (`@app/contract`'s PACT_COLORS must match; a
 * mobile test proves it). Each seed is turned into a full tone per palette by
 * `crewTone` in palette.ts, with contrast enforced the same way as the accent.
 */

export const CREW_COLORS = ['coral', 'tangerine', 'sun', 'rose', 'violet', 'ocean', 'sky'] as const
export type CrewColor = (typeof CREW_COLORS)[number]

export const CREW_SEEDS: Record<CrewColor, string> = {
	coral: '#ff6b5e',
	tangerine: '#ff9640',
	sun: '#ffc93d',
	rose: '#f45d9c',
	violet: '#9a6bff',
	ocean: '#3f7cf5',
	sky: '#4cc3f5'
}

/** One crew colour in one palette. */
export interface CrewTone {
	/** The colour as a fill: ring arcs, the emoji badge, a selected swatch. */
	fill: string
	/** Text and icons on `fill`. */
	onFill: string
	/** Secondary text on `fill`: a step softer than `onFill`, still AA. */
	onFillMuted: string
	/** An empty ring track on `fill`. */
	onFillTrack: string
	/** The colour as text on any ground (AA). */
	ink: string
	/** The colour as a graphic line on any ground (3:1): the chain's links. */
	line: string
	/** A low-alpha wash: card accents, the feed stripe's chip. */
	dim: string
	/** The ring's empty track, tinted toward the crew. */
	track: string
}
