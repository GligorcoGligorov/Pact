import { endpoints } from '@app/contract'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { boardFor, statusOf, toWireMember, toWirePact } from '@/server/api/pact-wire'
import { fromIsoDate } from '@/server/api/wire'
import { pactStore } from '@/server/db/pacts'
import { todayIn } from '@/lib/pacts/day'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/app/v1/pacts/:id: the pact, every member, and today's board while it is active
 * (R18), all computed from the rows on this read (R10). 404 unless the caller is or was a
 * member, the same as a pact that doesn't exist.
 */
export const GET = createAppRoute(endpoints.getPact, async ({ user, params }) => {
	const membership = await pactStore.membership(params.id, user.id)
	if (!membership) throw notFound()
	const today = todayIn(membership.pact.timezone, new Date())

	const detail = await pactStore.detail(params.id, user.id, fromIsoDate(today))
	if (!detail) throw notFound()
	const { pact, members, checkIns } = detail

	return {
		body: {
			pact: toWirePact(pact, membership.me.role, today),
			members: members.map(toWireMember),
			today:
				statusOf(pact, today) === 'active'
					? boardFor(pact, members, checkIns, today, user.id)
					: null
		}
	}
})
