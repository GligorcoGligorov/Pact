import { endpoints } from '@app/contract'
import { createAppRoute } from '@/server/api/app-route'
import { safetyStore } from '@/server/db/safety'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/app/v1/blocks: the people the caller has blocked, newest first, for Settings. */
export const GET = createAppRoute(endpoints.listBlocks, async ({ user }) => {
	const blocked = await safetyStore.blockedBy(user.id)
	return {
		body: { blocked: blocked.map((b) => ({ user_id: b.userId, display_name: b.displayName })) }
	}
})
