import { endpoints } from '@app/contract'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { safetyStore } from '@/server/db/safety'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/app/v1/blocks/:user (App Review 1.2): blocks someone the caller shares a pact with.
 * Each stops seeing the other's check-ins, and nudges between them are refused. 404 for anyone
 * else, so the route can't be used to find people.
 */
export const POST = createAppRoute(endpoints.blockUser, async ({ user, params }) => {
	if (!(await safetyStore.block(user.id, params.user))) throw notFound()
	return { body: { ok: true as const } }
})

/** DELETE: unblocks. Unblocking someone who isn't blocked is fine. */
export const DELETE = createAppRoute(endpoints.unblockUser, async ({ user, params }) => {
	await safetyStore.unblock(user.id, params.user)
	return { body: { ok: true as const } }
})
