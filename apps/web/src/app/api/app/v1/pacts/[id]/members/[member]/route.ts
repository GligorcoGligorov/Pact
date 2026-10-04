import { endpoints } from '@app/contract'
import { ApiError } from '@/server/api/app-errors'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { fromIsoDate } from '@/server/api/wire'
import { pactStore } from '@/server/db/pacts'
import { safetyStore } from '@/server/db/safety'
import { todayIn } from '@/lib/pacts/day'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * DELETE /api/app/v1/pacts/:id/members/:member (R7): the owner removes a member from today, the
 * way leaving works. 403 for anyone but the owner; 404 for someone not in the pact.
 */
export const DELETE = createAppRoute(endpoints.removeMember, async ({ user, params }) => {
	const membership = await pactStore.membership(params.id, user.id)
	if (!membership) throw notFound()
	const today = todayIn(membership.pact.timezone, new Date())
	const result = await safetyStore.remove(params.id, user.id, params.member, fromIsoDate(today))
	if (result === 'not_owner') throw new ApiError('forbidden', 'Only the owner can remove someone.')
	if (result === 'not_member') throw notFound()
	return { body: { ok: true as const } }
})
