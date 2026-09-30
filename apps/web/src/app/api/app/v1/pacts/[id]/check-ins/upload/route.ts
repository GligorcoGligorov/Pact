import { endpoints } from '@app/contract'
import { ApiError } from '@/server/api/app-errors'
import { createAppRoute } from '@/server/api/app-route'
import { requireHeldToday } from '@/server/api/pact-guards'
import { fromIsoDate } from '@/server/api/wire'
import { pactStore } from '@/server/db/pacts'
import { createProofUpload } from '@/server/storage/proofs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/app/v1/pacts/:id/check-ins/upload: a signed URL for today's proof photo (R12), at a
 * path the route picks under the caller's own folder. Refused before anything is signed when
 * the caller can't check in today: not held, or already checked in. The device PUTs the photo
 * to `signed_url`, then sends `path` as `photo_path` on POST check-ins.
 */
export const POST = createAppRoute(
	endpoints.createCheckInUpload,
	async ({ user, params, body }) => {
		const { today } = await requireHeldToday(params.id, user.id)
		if (await pactStore.checkInOn(params.id, user.id, fromIsoDate(today))) {
			throw new ApiError('already_checked_in', "You've already checked in today.")
		}
		const upload = await createProofUpload(user.id, body.content_type)
		return {
			body: {
				upload: {
					bucket: upload.bucket,
					path: upload.path,
					signed_url: upload.signedUrl,
					token: upload.token,
					expires_at: upload.expiresAt.toISOString()
				}
			}
		}
	}
)
