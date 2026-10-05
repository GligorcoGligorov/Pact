/**
 * What the closer has to do for one pact (R26), decided from the pact, its memberships, its
 * check-ins and how far it was closed before. Pure: the closer runs it and writes the answer.
 *
 * Closing is bookkeeping, never truth: kept and broken come from the check-ins on every read
 * (R10). `closed_through` only makes each message once, however often the closer runs.
 *
 * Messages, kept short so a closer that catches up a week doesn't send seven banners:
 *  - only the LATEST newly closed day is announced, and only when it broke (a kept day was
 *    already celebrated by crew-complete the moment it was kept);
 *  - when the end day closes, one "results are in" replaces that day's message.
 */

import { addDays, isHeldOn, pactDaysThrough, type Day } from './day'
import { chain, type PactProgressInput } from './progress'

export interface ClosePlan {
	/** The new `closed_through`: the last day that has ended, capped at the end day. */
	through: Day
	/** The pact days closed by this run, oldest first. */
	closedDays: { day: Day; status: 'kept' | 'broken' }[]
	/** The day to announce as broken, with its number in the pact (Day 3). */
	broken: { day: Day; dayNumber: number; userIds: string[] } | null
	/** The end day closed in this run: everyone still in gets the results. */
	finished: { userIds: string[] } | null
}

/** Null when there is nothing to close: a cancelled pact, the lobby, or already closed. */
export function closePlan(
	input: PactProgressInput & { closedThrough: Day | null }
): ClosePlan | null {
	const { pact } = input
	if (pact.cancelledAt) return null
	const yesterday = addDays(input.today, -1)
	const through = yesterday < pact.endDay ? yesterday : pact.endDay
	if (through < pact.startDay) return null
	if (input.closedThrough !== null && input.closedThrough >= through) return null

	const allDays = pactDaysThrough(pact, through)
	const statuses = chain({ ...input, today: addDays(through, 1) })
	const closedDays = statuses
		.filter(({ day }) => day <= through)
		.filter(({ day }) => input.closedThrough === null || day > input.closedThrough)
		.map(({ day, status }) => ({ day, status: status === 'kept' ? 'kept' : 'broken' }) as const)

	const finishedNow = through === pact.endDay
	const last = closedDays.at(-1)
	const broken =
		!finishedNow && last?.status === 'broken'
			? {
					day: last.day,
					dayNumber: allDays.indexOf(last.day) + 1,
					userIds: input.members.filter((m) => isHeldOn(pact, m, last.day)).map((m) => m.userId)
				}
			: null
	const finished = finishedNow
		? {
				userIds: input.members
					.filter((m) => m.leftDay === null || m.leftDay > pact.endDay)
					.filter((m) => m.joinedDay <= pact.endDay)
					.map((m) => m.userId)
			}
		: null
	return { through, closedDays, broken, finished }
}
