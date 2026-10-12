import { demoSignature, type Hand } from '@/lib/pacts/demo-signature'

/** The landing's demo pact: the run club from `npm run seed:demo`. */
export const DEMO_PACT = {
	name: '6am Run Club',
	habit: 'Run for 20 minutes',
	days: 21,
	stake: 'Loser buys the coffees'
} as const

/**
 * The run club's pledge, `pledgeLine(null, …)` in the contract, cut where the terms are, so the
 * habit, the length and the stake can be marked as they type. A test pins it to the contract.
 */
export const PLEDGE: { text: string; isTerm?: boolean }[] = [
	{ text: 'We promise: ' },
	{ text: 'run for 20 minutes', isTerm: true },
	{ text: ', every day for ' },
	{ text: '21 days', isTerm: true },
	{ text: '. If we break it, whoever slips ' },
	{ text: 'buys the coffees', isTerm: true },
	{ text: '.' }
]

const HANDS: [string, Hand][] = [
	['Ana', 'cursive'],
	['Ben', 'angular'],
	['Cleo', 'tall'],
	['Dan', 'print']
]

/** The crew's four signatures, in the same hands the seed signs them with. */
export const SIGNATURES = HANDS.map(([name, hand]) => ({ name, path: demoSignature(name, hand) }))
