import { z } from 'zod'
import { isoDate, isoDateTime, nextCursor, pageQuery, uuid } from './common'
import { checkInKindSchema, verdictSchema } from './pacts'

// GET /api/app/v1/feed: the check-ins of every pact the caller is in, newest first, with each
// one's reactions (R22). POST/DELETE /api/app/v1/check-ins/:id/reactions/:reaction add or take
// back the caller's own reaction.

/** The three quick reactions: 🔥 fire, 👏 clap, 😂 laugh. */
export const REACTIONS = ['fire', 'clap', 'laugh'] as const
export const reactionSchema = z.enum(REACTIONS)

export const reactionCountsSchema = z.object({
	fire: z.number().int(),
	clap: z.number().int(),
	laugh: z.number().int()
})

export const reactionStateSchema = z.object({
	counts: reactionCountsSchema,
	/** The caller's own reactions on this check-in. */
	mine: z.array(reactionSchema)
})

export const feedEntrySchema = z.object({
	id: uuid,
	pact_id: uuid,
	pact_name: z.string(),
	habit: z.string(),
	user_id: uuid,
	display_name: z.string().nullable(),
	day: isoDate,
	kind: checkInKindSchema,
	challenge: z.string().nullable(),
	/** A signed URL that lasts an hour; null for a saver or a deleted photo. */
	photo_url: z.string().nullable(),
	note: z.string().nullable(),
	verdict: verdictSchema,
	/** Shown to the crew when `suspicious` (R15). */
	ai_reason: z.string().nullable(),
	ai_caption: z.string().nullable(),
	created_at: isoDateTime,
	reactions: reactionStateSchema,
	/** R23: the caller reported it; the app shows no photo (photo_url is null) and says so. */
	reported_by_me: z.boolean()
})

export const listFeedQuery = pageQuery
export const listFeedResponse = z.object({
	entries: z.array(feedEntrySchema),
	next_cursor: nextCursor
})

export const reactionParams = z.object({ id: uuid, reaction: reactionSchema })
/** Nothing to send: the reaction is in the path. Every write takes a body, so this one is `{}`. */
export const addReactionBody = z.object({}).strict()
export const reactionResponse = z.object({ reactions: reactionStateSchema })

export type Reaction = z.infer<typeof reactionSchema>
export type ReactionState = z.infer<typeof reactionStateSchema>
export type FeedEntry = z.infer<typeof feedEntrySchema>
