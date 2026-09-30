import { endpoints } from '@app/contract'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { toWireCheckIn } from '@/server/api/pact-wire'
import { pactStore } from '@/server/db/pacts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/app/v1/check-ins/:id: one check-in, for the app to poll until its verdict is no
 * longer `pending` (R13). Only members of its pact can read it; anyone else gets the same 404
 * as a check-in that doesn't exist.
 */
export const GET = createAppRoute(endpoints.getCheckIn, async ({ user, params }) => {
	const checkIn = await pactStore.checkIn(params.id, user.id)
	if (!checkIn) throw notFound()
	return { body: { check_in: toWireCheckIn(checkIn) } }
})
