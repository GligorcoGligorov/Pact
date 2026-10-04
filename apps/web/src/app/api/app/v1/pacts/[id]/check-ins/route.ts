import { endpoints } from '@app/contract'
import { LIFECYCLE_EVENTS, PACT_EVENTS } from '@/lib/analytics/events'
import { recordUserEvent } from '@/lib/analytics/record'
import { challengeFor } from '@/lib/pacts/challenges'
import { trackPlayEvent } from '@/lib/plays/events'
import { judgeCheckIn } from '@/server/ai/judge'
import { ApiError } from '@/server/api/app-errors'
import { createAppRoute, idConflict } from '@/server/api/app-route'
import { background } from '@/server/api/background'
import { requireHeldToday } from '@/server/api/pact-guards'
import { toWireCheckIn } from '@/server/api/pact-wire'
import { fromIsoDate } from '@/server/api/wire'
import type { AppUser } from '@/server/auth/require-user'
import { analyticsStore } from '@/server/db/analytics'
import { pactStore } from '@/server/db/pacts'
import { profileStore } from '@/server/db/profiles'
import { celebrateIfKept } from '@/server/pacts/crew-complete'
import { isOwnProofPath, proofExists } from '@/server/storage/proofs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACTIVATION_TYPE = 'first_group_check_in'

const badProof = () =>
	new ApiError('invalid_request', 'Some of what was sent is not valid.', {
		issues: [{ path: 'photo_path', message: 'Not an uploaded photo of yours. Upload it first.' }]
	})

/**
 * POST /api/app/v1/pacts/:id/check-ins: today's check-in (R11), a photo or the saver (R17).
 *
 * - The day is the server's today in the pact's timezone; the caller must be held on it.
 * - A photo names a path from POST check-ins/upload, in the caller's own folder, that exists
 *   (R12). It is taken against today's challenge (R9), stored on the check-in.
 * - The verdict starts `pending` for a photo from someone who agreed to the AI judge, and is
 *   decided after the response (R13); otherwise it is `skipped` (R16). Every verdict counts.
 * - One per member per day (`already_checked_in`), one saver per pact (`saver_used`).
 *
 * 201 when made now; 200 with the same check-in when its `id` was made by an earlier try.
 */
export const POST = createAppRoute(endpoints.createCheckIn, async ({ user, params, body }) => {
	const { pact, today } = await requireHeldToday(params.id, user.id)

	let photoPath: string | null = null
	if (body.kind === 'photo') {
		if (!isOwnProofPath(user.id, body.photo_path)) throw badProof()
		if (!(await proofExists(body.photo_path))) throw badProof()
		photoPath = body.photo_path
	}
	const judged = body.kind === 'photo' && (await profileStore.hasAiConsent(user.id))

	const result = await pactStore.createCheckIn({
		id: body.id,
		pactId: pact.id,
		userId: user.id,
		day: fromIsoDate(today),
		kind: body.kind,
		challenge: body.kind === 'photo' ? challengeFor(pact.id, today) : null,
		photoPath,
		note: body.note ?? null,
		verdict: judged ? 'pending' : 'skipped'
	})
	if (result.outcome === 'already_checked_in') {
		throw new ApiError('already_checked_in', "You've already checked in today.")
	}
	if (result.outcome === 'saver_used') {
		throw new ApiError('saver_used', "You've used your streak saver in this pact.")
	}
	if (result.outcome === 'conflict') throw idConflict()

	const { checkIn } = result
	if (checkIn.verdict === 'pending') background.run(() => judgeCheckIn(checkIn.id))
	if (result.outcome === 'created') {
		await recordUserEvent(user.id, PACT_EVENTS.checkInCreated, {
			metadata: { pact_id: pact.id, kind: checkIn.kind },
			dedupeDaily: false
		})
		await activateOnce(user, pact.id)
		await celebrateIfKept(pact, today, user.id)
	}
	return {
		body: { check_in: toWireCheckIn(checkIn) },
		status: result.outcome === 'created' ? 201 : 200
	}
})

/**
 * The "aha" (docs/pact-requirements.md, Events): a person's first check-in in a pact with
 * someone else in it. Once per person, first-party and to the Play Events API. Neither sender
 * throws.
 */
async function activateOnce(user: AppUser, pactId: string) {
	if ((await pactStore.activeMemberCount(pactId)) < 2) return
	const already = await analyticsStore.hasDuplicate({
		name: LIFECYCLE_EVENTS.userActivated,
		visitor: { userId: user.id },
		match: {},
		since: null
	})
	if (already) return
	await recordUserEvent(user.id, LIFECYCLE_EVENTS.userActivated, {
		metadata: { activation_type: ACTIVATION_TYPE, pact_id: pactId },
		dedupeForever: true
	})
	await trackPlayEvent(
		'user_activated',
		{ id: user.id, email: user.email ?? undefined },
		{ activation_type: ACTIVATION_TYPE }
	)
}
