import { z } from 'zod'
import { uuid } from './common'

// Store rules for user content (App Review 1.2, R7, R23): report a check-in, block a person, leave
// a pact, and remove a member from your own pact.

export const REPORT_REASONS = ['fake', 'inappropriate', 'other'] as const
export const reportReasonSchema = z.enum(REPORT_REASONS)
export const REPORT_DETAIL_MAX = 200

/** POST /api/app/v1/check-ins/:id/report: once per person and check-in; repeats are fine. */
export const reportCheckInBody = z
	.object({
		reason: reportReasonSchema,
		detail: z.string().trim().min(1).max(REPORT_DETAIL_MAX).nullable().optional()
	})
	.strict()

/** POST/DELETE /api/app/v1/blocks/:user: block or unblock a person. */
export const blockParams = z.object({ user: uuid })
export const blockBody = z.object({}).strict()

/** POST /api/app/v1/pacts/:id/leave: R7, the caller leaves; their past days still count. */
export const leavePactBody = z.object({}).strict()

/** DELETE /api/app/v1/pacts/:id/members/:member: R7, the owner removes a member. */
export const memberParams = z.object({ id: uuid, member: uuid })

export const okResponse = z.object({ ok: z.literal(true) })

/** GET /api/app/v1/blocks: the people the caller has blocked, newest first, for Settings. */
export const listBlocksResponse = z.object({
	blocked: z.array(z.object({ user_id: uuid, display_name: z.string().nullable() }))
})

export type ReportReason = z.infer<typeof reportReasonSchema>
