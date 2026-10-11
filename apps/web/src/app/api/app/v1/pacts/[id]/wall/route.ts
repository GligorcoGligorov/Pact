import { endpoints } from '@app/contract'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { wallFor } from '@/server/api/wall-wire'
import { crewFeedStore } from '@/server/db/crew-feed'
import { pactStore } from '@/server/db/pacts'
import { safetyStore } from '@/server/db/safety'
import { proofPhotoUrls } from '@/server/storage/proofs'
import { todayIn } from '@/lib/pacts/day'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/app/v1/pacts/:id/wall: the Crew Wall, every pact day so far (newest first) by every
 * member held, with each check-in's signed photo URL (an hour), caption, verdict and reactions.
 * A photo by someone blocked either way, or one the caller reported (R23), comes back without
 * its URL. 404 unless the caller is or was a member, the same as a pact that doesn't exist.
 */
export const GET = createAppRoute(endpoints.getPactWall, async ({ user, params }) => {
	const row = await pactStore.wall(params.id, user.id)
	if (!row) throw notFound()
	const today = todayIn(row.pact.timezone, new Date())

	const ids = row.checkIns.map((checkIn) => checkIn.id)
	const [blocked, reported, reactions] = await Promise.all([
		safetyStore.blockedEitherWay(user.id),
		safetyStore.reportedBy(user.id, ids),
		crewFeedStore.tallies(ids, user.id)
	])
	const shown = row.checkIns.filter(
		(checkIn) => checkIn.photoPath && !blocked.has(checkIn.userId) && !reported.has(checkIn.id)
	)
	const urls = await proofPhotoUrls(shown.map((checkIn) => checkIn.photoPath!))
	const visible = new Set(shown.map((checkIn) => checkIn.id))

	return {
		body: wallFor(
			row.pact,
			row.members,
			row.checkIns,
			today,
			(checkIn) =>
				visible.has(checkIn.id) && checkIn.photoPath ? (urls.get(checkIn.photoPath) ?? null) : null,
			reactions,
			reported
		)
	}
})
