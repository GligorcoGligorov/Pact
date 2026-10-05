import type { CSSProperties } from 'react'
import { crewThemeOf } from '@app/contract'

const PARTS = ['fill', 'on-fill', 'ink', 'dim', 'track', 'hero-ink', 'hero-wash'] as const

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
