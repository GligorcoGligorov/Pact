import { endpoints } from '@app/contract'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { safetyStore } from '@/server/db/safety'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/app/v1/check-ins/:id/report (R23): reports a check-in in one of the caller's pacts,
 * stored for an admin. The caller stops seeing its photo. A repeat is fine; 404 outside their
 * pacts.
 */
export const POST = createAppRoute(endpoints.reportCheckIn, async ({ user, params, body }) => {
	const reported = await safetyStore.report(user.id, params.id, body.reason, body.detail ?? null)
	if (!reported) throw notFound()
	return { body: { ok: true as const } }
})
