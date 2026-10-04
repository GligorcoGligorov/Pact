import { endpoints } from '@app/contract'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { fromIsoDate } from '@/server/api/wire'
import { pactStore } from '@/server/db/pacts'
import { safetyStore } from '@/server/db/safety'
import { todayIn } from '@/lib/pacts/day'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/app/v1/pacts/:id/leave (R7): the caller leaves from today, the first day they're not
 * held, so leaving never breaks a day and the days before still count. An owner hands the pact
 * to the earliest member left; the last one out ends it.
 */
export const POST = createAppRoute(endpoints.leavePact, async ({ user, params }) => {
	const membership = await pactStore.membership(params.id, user.id)
	if (!membership) throw notFound()
	const today = todayIn(membership.pact.timezone, new Date())
	if ((await safetyStore.leave(params.id, user.id, fromIsoDate(today))) === 'not_member') {
		throw notFound()
	}
	return { body: { ok: true as const } }
})
