import { z } from 'zod'
import { isoDate, uuid } from './common'
import { reactionStateSchema } from './feed'
import { checkInKindSchema, dayStatusSchema, verdictSchema } from './pacts'

// GET /api/app/v1/pacts/:id/wall: the Crew Wall, the pact's real check-in photos as a grid,
// one column per member and one row per pact day so far, newest first. Read by current and
// former members, like the pact itself.

export const wallCheckInSchema = z.object({
	id: uuid,
	kind: checkInKindSchema,
	/** A signed URL that lasts an hour; null for a saver, a deleted photo, or one hidden from the caller. */
	photo_url: z.string().nullable(),
	verdict: verdictSchema,
	/** Shown to the crew when `suspicious` (R15). */
	ai_reason: z.string().nullable(),
	ai_caption: z.string().nullable(),
	reactions: reactionStateSchema,
	/** R23: the caller reported it, so it shows no photo. */
	reported_by_me: z.boolean()
})

export const wallCellSchema = z.object({
	user_id: uuid,
	/** Whether this member was held to this day (they had joined and not yet left). */
	held: z.boolean(),
	check_in: wallCheckInSchema.nullable()
})

export const wallDaySchema = z.object({
	day: isoDate,
	/** `open` for today. */
	status: dayStatusSchema,
	/** Everyone held that day is in: closed days that were kept, and today once it is. */
	kept: z.boolean(),
	/** In the order of `members`. */
	cells: z.array(wallCellSchema)
})

export const wallResponse = z.object({
	/** The columns: every member who was ever held, in the pact's member order. */
	members: z.array(z.object({ user_id: uuid, display_name: z.string().nullable() })),
	/** Today first, back to day one. Empty in the lobby. */
	days: z.array(wallDaySchema)
})

export type WallCheckIn = z.infer<typeof wallCheckInSchema>
export type WallCell = z.infer<typeof wallCellSchema>
export type WallDay = z.infer<typeof wallDaySchema>
export type Wall = z.infer<typeof wallResponse>
