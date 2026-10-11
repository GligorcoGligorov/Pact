import type { ReactionState, Wall } from '@app/contract'
import { dayFromDate, isHeldOn, type Day } from '@/lib/pacts/day'
import { chain } from '@/lib/pacts/progress'
import type { CheckInRecord, MemberRecord, PactRecord } from '@/server/db/pacts'
import { calendarOf, spanOf } from './pact-wire'

const NO_REACTIONS: ReactionState = { counts: { fire: 0, clap: 0, laugh: 0 }, mine: [] }

/**
 * The Crew Wall (rows → wire): one row per pact day through today, newest first, one cell per
 * member who was ever held. The day statuses come from the same chain as the board (R10); a
 * row is `kept` when every member held that day is in, which for today means it already is.
 * `photoUrl` resolves a check-in to the caller's signed URL, or null when it must not show.
 */
export function wallFor(
	pact: PactRecord,
	members: readonly MemberRecord[],
	checkIns: readonly CheckInRecord[],
	today: Day,
	photoUrl: (row: CheckInRecord) => string | null,
	reactions: ReadonlyMap<string, ReactionState>,
	reportedByMe: ReadonlySet<string>
): Wall {
	const calendar = calendarOf(pact)
	const spans = members.map(spanOf)
	const days = chain({
		pact: calendar,
		members: spans,
		checkIns: checkIns.map((row) => ({
			userId: row.userId,
			day: dayFromDate(row.day),
			kind: row.kind
		})),
		today
	})
	// Columns: everyone who was held on at least one of these days.
	const columns = members.filter((m, i) =>
		days.some(({ day }) => isHeldOn(calendar, spans[i]!, day))
	)
	const byKey = new Map(checkIns.map((row) => [`${row.userId}:${dayFromDate(row.day)}`, row]))

	return {
		members: columns.map((m) => ({ user_id: m.userId, display_name: m.displayName })),
		days: [...days].reverse().map(({ day, status }) => {
			const cells = columns.map((member) => {
				const held = isHeldOn(calendar, spanOf(member), day)
				const row = byKey.get(`${member.userId}:${day}`)
				return {
					user_id: member.userId,
					held,
					check_in: row
						? {
								id: row.id,
								kind: row.kind,
								photo_url: photoUrl(row),
								verdict: row.verdict,
								ai_reason: row.aiReason,
								ai_caption: row.aiCaption,
								reactions: reactions.get(row.id) ?? NO_REACTIONS,
								reported_by_me: reportedByMe.has(row.id)
							}
						: null
				}
			})
			const heldCells = cells.filter((cell) => cell.held)
			const allIn = heldCells.length > 0 && heldCells.every((cell) => cell.check_in !== null)
			return { day, status, kept: status === 'kept' || (status === 'open' && allIn), cells }
		})
	}
}
