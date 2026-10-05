/**
 * A crew's colour is a wire key (@app/contract) that the brand turns into a tone (@app/brand).
 * The two lists must be the same, and a key or emoji this app doesn't know yet (a newer server)
 * falls back to the default rather than crashing a screen.
 */
import { CREW_COLORS, theme } from '@app/brand'
import { DEFAULT_CREW_THEME, PACT_COLORS } from '@app/contract'
import { crewEmoji, crewTone } from '@/lib/crew'

const colors = theme.palettes[theme.primaryScheme]

it('the contract and the brand name the same crew colours', () => {
	expect([...PACT_COLORS].sort()).toEqual([...CREW_COLORS].sort())
})

it('a known colour gets its tone, an unknown one the default', () => {
	expect(crewTone(colors, 'violet')).toBe(colors.crew.violet)
	expect(crewTone(colors, 'chartreuse')).toBe(colors.crew[DEFAULT_CREW_THEME.color])
})

it('an unknown emoji reads as the default', () => {
	expect(crewEmoji('🧘')).toBe('🧘')
	expect(crewEmoji('🍕')).toBe(DEFAULT_CREW_THEME.emoji)
})
