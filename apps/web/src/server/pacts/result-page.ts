import 'server-only'
import { awardOf, crewThemeOf, joinNames, pactParams, stakeLine } from '@app/contract'
import { finalResultOf } from '@/server/api/result-wire'
import { resultStore } from '@/server/db/results'
import { todayIn } from '@/lib/pacts/day'

// The public results of a finished pact (R25): what /results/[pact], its link preview and the
// share card show. A crew shares it on purpose, from the app; the id is a UUID nobody guesses.
// Names, records, awards and who owes the stake only: never a photo, a verdict or a caption.
// A pact still running, cancelled or unknown has no page.

export interface ResultPageMember {
	userId: string
	name: string
	daysDone: number
	daysHeld: number
	bestStreak: number
	saverUsed: boolean
	isLoser: boolean
	/** The award emoji they earned. */
	awards: string[]
}

export interface ResultPage {
	pactId: string
	name: string
	habit: string
	color: string
	emoji: string
	stake: string | null
	startDay: string
	endDay: string
	keptDays: number
	totalDays: number
	bestStreak: number
	chain: { day: string; status: 'kept' | 'broken' }[]
	/** "Dan buys the coffees ☕", or "Nobody pays, everybody wins 🎉". */
	headline: string
	nobodyPays: boolean
	/** Best first, as the app's scoreboard. */
	members: ResultPageMember[]
	awards: { emoji: string; title: string; names: string }[]
}

const nameOf = (name: string | null) => name?.trim() || 'A member'

export async function getResultPage(pactId: string): Promise<ResultPage | null> {
	if (!pactParams.safeParse({ id: pactId }).success) return null
	const row = await resultStore.forPublic(pactId)
	if (!row) return null
	const result = finalResultOf(row, todayIn(row.pact.timezone, new Date()))
	if (!result) return null

	const names = new Map(row.members.map((m) => [m.userId, nameOf(m.displayName)]))
	const members = result.members
		.filter((m) => m.daysHeld > 0)
		.sort(
			(a, b) =>
				b.daysDone * a.daysHeld - a.daysDone * b.daysHeld ||
				Number(a.saverUsed) - Number(b.saverUsed) ||
				b.bestStreak - a.bestStreak
		)
		.map((m) => ({
			userId: m.userId,
			name: names.get(m.userId) ?? 'A member',
			daysDone: m.daysDone,
			daysHeld: m.daysHeld,
			bestStreak: m.bestStreak,
			saverUsed: m.saverUsed,
			isLoser: m.isLoser,
			awards: m.awards.flatMap((k) => awardOf(k)?.emoji ?? [])
		}))
	const nobodyPays = result.outcome !== 'loser'
	const { color, emoji } = crewThemeOf(row.pact.color, row.pact.emoji)

	return {
		pactId: row.pact.id,
		name: row.pact.name,
		habit: row.pact.habit,
		color,
		emoji,
		stake: row.pact.stake,
		startDay: row.pact.startDay.toISOString().slice(0, 10),
		endDay: row.pact.endDay.toISOString().slice(0, 10),
		keptDays: result.keptDays,
		totalDays: result.totalDays,
		bestStreak: result.bestStreak,
		chain: result.chain,
		headline: nobodyPays
			? 'Nobody pays, everybody wins 🎉'
			: stakeLine(
					result.losers.map((id) => names.get(id) ?? 'A member'),
					row.pact.stake
				),
		nobodyPays,
		members,
		awards: result.awards.flatMap((a) => {
			const meta = awardOf(a.kind)
			if (!meta) return []
			return [
				{
					emoji: meta.emoji,
					title: meta.title,
					names: joinNames(a.userIds.map((id) => names.get(id) ?? 'A member'))
				}
			]
		})
	}
}
