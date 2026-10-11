import 'server-only'
import { awardOf, crewThemeOf, joinNames, pactParams, stakeLine } from '@app/contract'
import { calendarOf, spanOf } from '@/server/api/pact-wire'
import { finalResultOf } from '@/server/api/result-wire'
import { resultStore } from '@/server/db/results'
import { dayFromDate, isHeldOn, todayIn } from '@/lib/pacts/day'

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
	/** The titles of the awards they earned. */
	awards: string[]
	/** The signed pact: their signature as SVG path data, if they signed. */
	signature: string | null
}

/** One day of the public wall: who was held and who was in, never what they sent. */
export interface ResultPageDay {
	day: string
	kept: boolean
	cells: { userId: string; held: boolean; in: boolean }[]
}

export interface ResultPage {
	pactId: string
	name: string
	habit: string
	color: string
	emoji: string
	stake: string | null
	cadence: 'daily' | 'weekdays'
	startDay: string
	endDay: string
	keptDays: number
	totalDays: number
	bestStreak: number
	chain: { day: string; status: 'kept' | 'broken' }[]
	/** "Dan buys the coffees.", or "Nobody pays." */
	headline: string
	nobodyPays: boolean
	/** Best first, as the app's scoreboard. */
	members: ResultPageMember[]
	awards: { title: string; names: string }[]
	/** Every day of the pact, newest first, presence only (R25). */
	wall: ResultPageDay[]
}

const nameOf = (name: string | null) => name?.trim() || 'A member'

export async function getResultPage(pactId: string): Promise<ResultPage | null> {
	if (!pactParams.safeParse({ id: pactId }).success) return null
	const row = await resultStore.forPublic(pactId)
	if (!row) return null
	const result = finalResultOf(row, todayIn(row.pact.timezone, new Date()))
	if (!result) return null

	const names = new Map(row.members.map((m) => [m.userId, nameOf(m.displayName)]))
	const signatures = new Map(row.members.map((m) => [m.userId, m.signature]))
	const calendar = calendarOf(row.pact)
	const marked = new Set(row.marks.map((m) => `${m.userId}:${dayFromDate(m.day)}`))
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
			awards: m.awards.flatMap((k) => awardOf(k)?.title ?? []),
			signature: signatures.get(m.userId) ?? null
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
		cadence: row.pact.cadence,
		startDay: row.pact.startDay.toISOString().slice(0, 10),
		endDay: row.pact.endDay.toISOString().slice(0, 10),
		keptDays: result.keptDays,
		totalDays: result.totalDays,
		bestStreak: result.bestStreak,
		chain: result.chain,
		headline: nobodyPays
			? 'Nobody pays.'
			: sentence(
					stakeLine(
						result.losers.map((id) => names.get(id) ?? 'A member'),
						row.pact.stake
					)
				),
		nobodyPays,
		members,
		awards: result.awards.flatMap((a) => {
			const meta = awardOf(a.kind)
			if (!meta) return []
			return [
				{
					title: meta.title,
					names: joinNames(a.userIds.map((id) => names.get(id) ?? 'A member'))
				}
			]
		}),
		wall: [...result.chain].reverse().map(({ day, status }) => {
			const cells = members.map((m) => {
				const span = row.members.find((r) => r.userId === m.userId)
				return {
					userId: m.userId,
					held: span ? isHeldOn(calendar, spanOf(span), day) : false,
					in: marked.has(`${m.userId}:${day}`)
				}
			})
			return { day, kept: status === 'kept', cells }
		})
	}
}

/** Ends a line with a full stop unless it already has its own punctuation. */
function sentence(line: string): string {
	return /[\p{L}\p{N}]$/u.test(line) ? `${line}.` : line
}
