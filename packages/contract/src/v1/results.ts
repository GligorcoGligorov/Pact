import { z } from 'zod'
import { isoDate, uuid } from './common'
import { pactSchema } from './pacts'

// The end of a pact (R24, R25): its final results, and round 2 with the same crew.
//
// GET  pacts/:id/result   → the results, once the pact has completed (409 not_finished before)
// POST pacts/:id/rematch  → a new pact, same crew, starting tomorrow; one per finished pact
//
// The app, the public results page and its share card all word the results from here, so a
// crew sees the same awards and the same "Dan buys the coffees" everywhere.

/** Earned from real check-ins (apps/web/src/lib/pacts/results.ts). Ties share an award. */
export const AWARD_KINDS = [
	'iron_streak',
	'never_missed',
	'comeback_kid',
	'clutch_save',
	'early_bird',
	'night_owl'
] as const
export type AwardKind = (typeof AWARD_KINDS)[number]

export const AWARDS: Record<AwardKind, { emoji: string; title: string; blurb: string }> = {
	iron_streak: { emoji: '🔥', title: 'Iron streak', blurb: 'The longest run of the pact' },
	never_missed: { emoji: '💯', title: 'Never missed', blurb: 'Every single day, with proof' },
	comeback_kid: { emoji: '🦸', title: 'Comeback kid', blurb: 'Missed one, came back swinging' },
	clutch_save: { emoji: '🛟', title: 'Clutch save', blurb: 'Their saver held the chain' },
	early_bird: { emoji: '🌅', title: 'Early bird', blurb: 'In before 9am, most days' },
	night_owl: { emoji: '🦉', title: 'Night owl', blurb: 'Living dangerously after 9pm' }
}

/** An award this build knows, or null: a newer server's award never breaks an older app. */
export function awardOf(kind: string) {
	return (AWARD_KINDS as readonly string[]).includes(kind) ? AWARDS[kind as AwardKind] : null
}

export const RESULT_OUTCOMES = ['loser', 'nobody_pays'] as const

export const resultMemberSchema = z.object({
	user_id: uuid,
	display_name: z.string().nullable(),
	days_done: z.number().int(),
	days_held: z.number().int(),
	/** Their own longest run of done days. */
	best_streak: z.number().int(),
	saver_used: z.boolean(),
	is_loser: z.boolean(),
	/** AwardKind keys, as strings (see awardOf). */
	awards: z.array(z.string())
})

export const pactResultSchema = z.object({
	/** A string so a future outcome never breaks this app; RESULT_OUTCOMES today. */
	outcome: z.string(),
	losers: z.array(uuid),
	chain: z.array(z.object({ day: isoDate, status: z.enum(['kept', 'broken']) })),
	kept_days: z.number().int(),
	total_days: z.number().int(),
	/** The crew's longest run of kept days. */
	best_streak: z.number().int(),
	/** Members ever held to a day; a lobby leaver isn't on the results. */
	members: z.array(resultMemberSchema),
	awards: z.array(z.object({ kind: z.string(), user_ids: z.array(uuid) }))
})

export const pactResultResponse = z.object({
	pact: pactSchema,
	result: pactResultSchema,
	/** Round 2, once someone has started it. */
	rematch: z.object({ pact_id: uuid }).nullable()
})

export const rematchPactBody = z
	.object({
		/** Generated on the device, so a retry finds its pact. */
		id: uuid.optional()
	})
	.strict()

export const rematchPactResponse = z.object({
	pact: pactSchema,
	/** False when someone in the crew had already started round 2: this is theirs. */
	created: z.boolean()
})

export type PactResult = z.infer<typeof pactResultSchema>
export type ResultMember = z.infer<typeof resultMemberSchema>

/** "Dan", "Dan and Cleo", "Ben, Cleo and Dan". */
export function joinNames(names: readonly string[]): string {
	if (names.length <= 1) return names[0] ?? ''
	return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

const IRREGULAR_PLURALS: Record<string, string> = { does: 'do', has: 'have', is: 'are' }

/** "buys" → "buy" for two or more people. */
function pluralVerb(word: string): string {
	const lower = word.toLowerCase()
	if (IRREGULAR_PLURALS[lower]) return IRREGULAR_PLURALS[lower]
	if (/[^s]s$/i.test(word) && !/(us|is|ss)$/i.test(word)) return word.slice(0, -1)
	return word
}

/**
 * The stake, said about who owes it: "Loser buys the coffees ☕" with Dan losing reads
 * "Dan buys the coffees ☕"; two losers, "Dan and Cleo buy the coffees ☕". A stake that doesn't
 * start with "loser" reads "Dan owes: a round of pizza". Playful, never mean. "You" (the reader)
 * takes the plural verb: "You buy the coffees".
 */
export function stakeLine(loserNames: readonly string[], stake: string | null): string {
	const who = joinNames(loserNames)
	const plural = loserNames.length > 1 || loserNames[0] === 'You'
	if (!stake) return `${who} ${plural ? 'owe' : 'owes'} the crew a high five`
	const match = /^(?:the\s+)?losers?\s+(\S+)(.*)$/i.exec(stake.trim())
	if (match) {
		const [, verb = '', rest = ''] = match
		return `${who} ${plural ? pluralVerb(verb) : verb}${rest}`
	}
	return `${who} ${plural ? 'owe' : 'owes'}: ${stake.trim()}`
}
