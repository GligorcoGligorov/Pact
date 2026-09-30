import { endpoints } from '@app/contract'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { statusOf } from '@/server/api/pact-wire'
import { pactStore } from '@/server/db/pacts'
import { dayFromDate, todayIn } from '@/lib/pacts/day'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/app/v1/invites/:code: what a code joins, so the app can show it before joining.
 * Codes are matched without regard to case. 404 for a code that doesn't exist.
 */
export const GET = createAppRoute(endpoints.getInvite, async ({ user, params }) => {
	const found = await pactStore.byInviteCode(params.code, user.id)
	if (!found) throw notFound()
	const { pact } = found
	return {
		body: {
			invite: {
				pact: {
					id: pact.id,
					name: pact.name,
					habit: pact.habit,
					cadence: pact.cadence,
					start_day: dayFromDate(pact.startDay),
					end_day: dayFromDate(pact.endDay),
					stake: pact.stake,
					status: statusOf(pact, todayIn(pact.timezone, new Date()))
				},
				member_count: found.memberCount,
				max_members: pact.maxMembers,
				is_member: found.isMember
			}
		}
	}
})
