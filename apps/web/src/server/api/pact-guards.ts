import { isHeldOn, todayIn, type Day } from '@/lib/pacts/day'
import { pactStore, type MemberRecord, type PactRecord } from '@/server/db/pacts'
import { ApiError } from './app-errors'
import { notFound } from './app-route'
import { calendarOf, spanOf, statusOf } from './pact-wire'

/**
 * R8, R11: the caller may check in today. 404 unless they are (or were) a member, the same as
 * a pact that doesn't exist; `not_held` when the pact isn't active today or they aren't held
 * today (a late joiner is held from tomorrow, a member who left is held no more). "Today" is
 * the server's, in the pact's timezone.
 */
export async function requireHeldToday(
	pactId: string,
	userId: string
): Promise<{ pact: PactRecord; me: MemberRecord; today: Day }> {
	const membership = await pactStore.membership(pactId, userId)
	if (!membership) throw notFound()
	const { pact, me } = membership
	const today = todayIn(pact.timezone, new Date())
	if (statusOf(pact, today) !== 'active') {
		throw new ApiError('not_held', "This pact isn't running today.")
	}
	if (!isHeldOn(calendarOf(pact), spanOf(me), today)) {
		throw new ApiError('not_held', "You're not in today's check-in for this pact.")
	}
	return { pact, me, today }
}
