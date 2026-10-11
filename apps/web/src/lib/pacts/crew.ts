import type { CSSProperties } from 'react'
import { alphaOf, theme, toChannels } from '@app/brand'
import { crewThemeOf } from '@app/contract'

const PARTS = [
	'fill',
	'on-fill',
	'on-fill-muted',
	'on-fill-large',
	'on-fill-track',
	'ink',
	'line',
	'glow',
	'deep',
	'dim',
	'track'
] as const

/**
 * Points the generic --crew-* variables at one crew's tone (emitted per scheme by @app/brand's
 * brandCss), so `text-[color:var(--crew-ink)]` and friends wear that crew in either scheme.
 * Crew colour is identity, green is action: never put it on a button.
 */
export function crewStyle(color: string): CSSProperties {
	const key = crewThemeOf(color, '').color
	return Object.fromEntries(
		PARTS.map((part) => [`--crew-${part}`, `var(--crew-${key}-${part})`])
	) as CSSProperties
}

/**
 * Turns the hero (a surface that ignores the scheme) into the crew's bright colour, as the app's
 * board does: the hero's own variables, pointed at the crew tone, so `bg-hero`, `text-hero-text`
 * and the countdown inside follow without knowing about crews. The crew fill and the text on it
 * are the same in both schemes, so one palette answers for both.
 */
export function crewHeroStyle(color: string): CSSProperties {
	const tone = theme.palettes.light.crew[crewThemeOf(color, '').color]
	return {
		'--c-hero': toChannels(tone.fill),
		'--c-hero-text': toChannels(tone.onFill),
		'--c-hero-text-secondary': toChannels(tone.onFillMuted),
		'--c-hero-border': toChannels(tone.onFillTrack),
		'--c-hero-border-a': String(alphaOf(tone.onFillTrack))
	} as CSSProperties
}
