import { endpoints } from '@app/contract'
import { createAppRoute } from '@/server/api/app-route'
import { decodeCursor, nextCursor } from '@/server/api/cursor'
import { dayFromDate } from '@/lib/pacts/day'
import { crewFeedStore } from '@/server/db/crew-feed'
import { safetyStore } from '@/server/db/safety'
import { proofPhotoUrls } from '@/server/storage/proofs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 20

/**
 * GET /api/app/v1/feed (R22): the check-ins of every pact the caller is in, newest first, each
 * with a signed photo URL that lasts an hour, the AI's verdict, reason and caption, and the
 * crew's reactions.
 */
export const GET = createAppRoute(endpoints.listFeed, async ({ user, query }) => {
	const page = await crewFeedStore.page(
		user.id,
		{ limit: query.limit ?? DEFAULT_LIMIT, after: decodeCursor('feed', query.cursor) },
		await safetyStore.blockedEitherWay(user.id)
	)
	// R23: a photo the caller reported is never shown to them again.
	const reported = await safetyStore.reportedBy(
		user.id,
		page.rows.map((row) => row.id)
	)
	const urls = await proofPhotoUrls(
		page.rows.flatMap((row) => (row.photoPath && !reported.has(row.id) ? [row.photoPath] : []))
	)
	return {
		body: {
			entries: page.rows.map((row) => ({
				id: row.id,
				pact_id: row.pactId,
				pact_name: row.member.pact.name,
				habit: row.member.pact.habit,
				user_id: row.userId,
				display_name: row.member.profile.displayName,
				day: dayFromDate(row.day),
				kind: row.kind,
				challenge: row.challenge,
				photo_url: row.photoPath ? (urls.get(row.photoPath) ?? null) : null,
				reported_by_me: reported.has(row.id),
				note: row.note,
				verdict: row.verdict,
				ai_reason: row.aiReason,
				ai_caption: row.aiCaption,
				created_at: row.createdAt.toISOString(),
				reactions: page.tallies.get(row.id) ?? { counts: { fire: 0, clap: 0, laugh: 0 }, mine: [] }
			})),
			next_cursor: nextCursor('feed', page.nextAfter)
		}
	}
})
