import { endpoints } from '@app/contract'
import { ApiError } from '@/server/api/app-errors'
import { createAppRoute, notFound } from '@/server/api/app-route'
import { toWireMember } from '@/server/api/pact-wire'
import { pactStore } from '@/server/db/pacts'
import { PACT_EVENTS } from '@/lib/analytics/events'
import { recordUserEvent } from '@/lib/analytics/record'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/app/v1/pacts/:id/signature: the signed pact. A current member signs the pact's card
 * once, with their finger; the path is validated by the contract (path commands and numbers
 * only). 409 `already_signed` on a second signature; 404 unless the caller is a current member.
 * Records `pact_signed` once per member.
 */
export const POST = createAppRoute(endpoints.signPact, async ({ user, params, body }) => {
	const result = await pactStore.sign(params.id, user.id, body.signature)
	if (!result) throw notFound()
	if (result.outcome === 'already')
		throw new ApiError('already_signed', 'You already signed this pact.')

	await recordUserEvent(user.id, PACT_EVENTS.pactSigned, {
		metadata: { pact_id: params.id },
		dedupeDaily: false
	})
	return { body: { member: toWireMember(result.member) } }
})
