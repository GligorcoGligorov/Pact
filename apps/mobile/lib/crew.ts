/**
 * A crew's identity: the colour and emoji a pact picked (docs/design/fun-pass-plan.md).
 *
 * Crew colour is identity, green is action. Use a crew tone for what belongs to the crew (its
 * hero, ring, card accent, feed stripe), never for a button or a "done" state: those stay the
 * accent and success colours.
 */
import type { CrewTone, Palette } from '@app/brand'
import { crewThemeOf, type PactColor } from '@app/contract'

/** The pact's crew tone in this palette; a colour this app doesn't know reads as the default. */
export function crewTone(colors: Palette, color: string): CrewTone {
	return colors.crew[crewThemeOf(color, '').color]
}

/** The pact's emoji, or the default for one this app doesn't know. */
export function crewEmoji(emoji: string): string {
	return crewThemeOf('', emoji).emoji
}

/** Spoken names for the swatches, so VoiceOver says "Coral", not a key. */
export const CREW_COLOR_LABELS: Record<PactColor, string> = {
	coral: 'Coral',
	tangerine: 'Tangerine',
	sun: 'Sun',
	rose: 'Rose',
	violet: 'Violet',
	ocean: 'Ocean',
	sky: 'Sky'
}
