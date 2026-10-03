import { z } from 'zod'
import { isoDate, isoDateTime, uuid } from './common'
import { AVATAR_CONTENT_TYPES, avatarContentTypeSchema, MAX_AVATAR_BYTES } from './uploads'

// Pacts: a small group holding each other to one habit for a fixed run of days
// (docs/pact-requirements.md, R-numbers below).
//
// GET  pacts                        → the person's pacts, with their state today
// POST pacts                        → create one; the creator is its owner (R1, R2)
// GET  pacts/:id                    → the pact, its members and today's board (R18)
// GET  invites/:code                → what a code joins, before joining
// POST invites/:code/join           → join by code, idempotently (R5, R6)
// POST pacts/:id/check-ins/upload   → a signed URL for today's proof photo (R12)
// POST pacts/:id/check-ins          → today's check-in: a photo or the saver (R11, R17)
// GET  check-ins/:id                → one check-in, to poll its verdict (R13)
//
// Days are pact-local calendar dates the server computes; the app never sends one (R8),
// except the start day it picks when creating a pact.

// ── Pacts ─────────────────────────────────────────────────────────────────────

export const PACT_CADENCES = ['daily', 'weekdays'] as const
export const pactCadenceSchema = z.enum(PACT_CADENCES)

/** R3: derived from the dates on every read. */
export const PACT_STATUSES = ['lobby', 'active', 'completed', 'cancelled'] as const
export const pactStatusSchema = z.enum(PACT_STATUSES)

export const PACT_ROLES = ['owner', 'member'] as const
export const pactRoleSchema = z.enum(PACT_ROLES)

export const PACT_NAME_MAX = 60
export const PACT_HABIT_MAX = 80
export const PACT_STAKE_MAX = 80
export const PACT_MIN_DAYS = 7
export const PACT_MAX_DAYS = 90
export const PACT_MAX_MEMBERS = 8

/**
 * R2: six characters, none of them ambiguous (no 0/O, no 1/I/L). Typed codes are matched
 * without regard to case.
 */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const INVITE_CODE_LENGTH = 6
export const inviteCodeSchema = z
	.string()
	.trim()
	.toUpperCase()
	.regex(
		new RegExp(`^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`),
		'a six-character invite code'
	)

export const pactSchema = z.object({
	id: uuid,
	name: z.string(),
	habit: z.string(),
	cadence: pactCadenceSchema,
	/** IANA name, fixed at creation. Every day of the pact is a day here. */
	timezone: z.string(),
	start_day: isoDate,
	/** Inclusive. */
	end_day: isoDate,
	stake: z.string().nullable(),
	invite_code: z.string(),
	max_members: z.number().int(),
	status: pactStatusSchema,
	/** The caller's role in it. */
	role: pactRoleSchema,
	created_at: isoDateTime
})

export const pactParams = z.object({ id: uuid })

export const createPactBody = z
	.object({
		/** Generated on the device, so a retry of the same create finds its pact. */
		id: uuid.optional(),
		name: z.string().trim().min(1).max(PACT_NAME_MAX),
		habit: z.string().trim().min(1).max(PACT_HABIT_MAX),
		cadence: pactCadenceSchema,
		/** Calendar days, for either cadence: a 7-day weekdays pact holds 5 days. */
		days: z.number().int().min(PACT_MIN_DAYS).max(PACT_MAX_DAYS),
		/** Today or later, in `timezone`. */
		start_day: isoDate,
		/** The device's IANA timezone. The server validates it; it never changes. */
		timezone: z.string().trim().min(1).max(64),
		/** Free text, never money. */
		stake: z.string().trim().min(1).max(PACT_STAKE_MAX).nullable().optional()
	})
	.strict()

export const pactResponse = z.object({ pact: pactSchema })

// ── Today ─────────────────────────────────────────────────────────────────────

export const MEMBER_STATES = ['in', 'saver', 'out'] as const
export const memberStateSchema = z.enum(MEMBER_STATES)

export const CHECK_IN_KINDS = ['photo', 'saver'] as const
export const checkInKindSchema = z.enum(CHECK_IN_KINDS)

/**
 * R13–R16. Advisory only: every verdict counts as a check-in (R15).
 *  - pending: not judged yet (poll GET check-ins/:id)
 *  - pass, suspicious: the AI's view; `suspicious` shows its reason to the group
 *  - error: the AI call failed
 *  - not_configured: no AI provider is set up
 *  - skipped: never judged (a saver, or no AI consent)
 */
export const VERDICTS = [
	'pending',
	'pass',
	'suspicious',
	'error',
	'not_configured',
	'skipped'
] as const
export const verdictSchema = z.enum(VERDICTS)

export const pactMemberSchema = z.object({
	user_id: uuid,
	display_name: z.string().nullable(),
	role: pactRoleSchema,
	/** The first day they are held (R6). */
	joined_day: isoDate,
	/** The first day they are NOT held, once they left (R7). */
	left_day: isoDate.nullable()
})

/** A check-in as the board shows it: no photo (that is the feed's, R22). */
export const boardCheckInSchema = z.object({
	id: uuid,
	kind: checkInKindSchema,
	verdict: verdictSchema,
	ai_reason: z.string().nullable(),
	ai_caption: z.string().nullable()
})

export const boardMemberSchema = z.object({
	user_id: uuid,
	display_name: z.string().nullable(),
	state: memberStateSchema,
	check_in: boardCheckInSchema.nullable()
})

/** R18: today, for an active pact. Only the members held today are on it. */
export const todayBoardSchema = z.object({
	day: isoDate,
	/** R9: the same for every reader, from the pact and the day. */
	challenge: z.string(),
	/** When today closes: the next local midnight. */
	closes_at: isoDateTime,
	in_count: z.number().int(),
	held_count: z.number().int(),
	members: z.array(boardMemberSchema),
	me: z.object({
		/** Whether the caller is held today (a late joiner is held from tomorrow). */
		held: z.boolean(),
		state: memberStateSchema.nullable(),
		/** R17: one per member per pact. */
		saver_available: z.boolean()
	})
})

export const DAY_STATUSES = ['kept', 'broken', 'open'] as const
export const dayStatusSchema = z.enum(DAY_STATUSES)

/** R19: the chain and the streaks, computed on every read from check-ins and membership (R10). */
export const pactProgressSchema = z.object({
	/** Every pact day from the start through today (or the end), oldest first; empty in the lobby. */
	chain: z.array(z.object({ day: isoDate, status: dayStatusSchema })),
	/** Kept days in a row back from the last closed day, plus today once it is kept. */
	current_streak: z.number().int(),
	best_streak: z.number().int()
})

export const pactDetailResponse = z.object({
	pact: pactSchema,
	/** Every member, those who left included (their days still count, R7). */
	members: z.array(pactMemberSchema),
	/** Null unless the pact is active. */
	today: todayBoardSchema.nullable(),
	progress: pactProgressSchema
})

export const pactListItemSchema = pactSchema.extend({
	/** The caller's state today, or null when they aren't held today. */
	my_state_today: memberStateSchema.nullable(),
	/** Today's board, as on the pact's own page; null unless the pact is active. */
	today: todayBoardSchema.nullable(),
	progress: pactProgressSchema
})

export const listPactsResponse = z.object({ pacts: z.array(pactListItemSchema) })

// ── Joining ───────────────────────────────────────────────────────────────────

export const inviteParams = z.object({ code: inviteCodeSchema })

export const invitePactSchema = pactSchema.pick({
	id: true,
	name: true,
	habit: true,
	cadence: true,
	start_day: true,
	end_day: true,
	stake: true,
	status: true
})

export const inviteResponse = z.object({
	invite: z.object({
		pact: invitePactSchema,
		member_count: z.number().int(),
		/** The active members, oldest first: the names a join page may show (R27). */
		members: z.array(z.object({ user_id: uuid, display_name: z.string().nullable() })),
		max_members: z.number().int(),
		is_member: z.boolean()
	})
})

/** `web`: joined on the public /join/[code] page. */
export const JOIN_SOURCES = ['deep_link', 'code', 'web'] as const
export const joinSourceSchema = z.enum(JOIN_SOURCES)

export const joinPactBody = z.object({ source: joinSourceSchema }).strict()

export const joinPactResponse = z.object({
	pact: pactSchema,
	/** The first day they are held: the start day in the lobby, else tomorrow (R6). */
	joined_day: isoDate
})

// ── Check-ins ─────────────────────────────────────────────────────────────────

/** Proof photos go into the same private bucket as avatars, with the same types and limit. */
export const PROOF_CONTENT_TYPES = AVATAR_CONTENT_TYPES
export const proofContentTypeSchema = avatarContentTypeSchema
export const MAX_PROOF_BYTES = MAX_AVATAR_BYTES

export const createCheckInUploadBody = z
	.object({
		content_type: proofContentTypeSchema,
		size_bytes: z.number().int().min(1).max(MAX_PROOF_BYTES)
	})
	.strict()

/** `<user id>/proofs/<uuid>.<ext>`, the only path shape a proof photo is stored under. */
export const proofPathSchema = z
	.string()
	.regex(
		/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\/proofs\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(jpg|png|webp|heic)$/,
		'a proof path from POST /api/app/v1/pacts/:id/check-ins/upload'
	)

export const CHECK_IN_NOTE_MAX = 140

const checkInNote = z.string().trim().min(1).max(CHECK_IN_NOTE_MAX).nullable().optional()

export const createCheckInBody = z.discriminatedUnion('kind', [
	z
		.object({
			/** Generated on the device, so a retry finds its check-in. */
			id: uuid.optional(),
			kind: z.literal('photo'),
			/** From POST check-ins/upload, after the PUT succeeded. */
			photo_path: proofPathSchema,
			note: checkInNote
		})
		.strict(),
	z
		.object({
			id: uuid.optional(),
			kind: z.literal('saver'),
			note: checkInNote
		})
		.strict()
])

export const checkInSchema = z.object({
	id: uuid,
	pact_id: uuid,
	user_id: uuid,
	day: isoDate,
	kind: checkInKindSchema,
	/** The challenge it was taken against; null for a saver. */
	challenge: z.string().nullable(),
	note: z.string().nullable(),
	verdict: verdictSchema,
	/** One sentence, from the AI. Shown to the group when `suspicious` (R15). */
	ai_reason: z.string().nullable(),
	/** A one-line deadpan comment, from the AI. */
	ai_caption: z.string().nullable(),
	judged_at: isoDateTime.nullable(),
	created_at: isoDateTime
})

export const checkInParams = z.object({ id: uuid })

export const checkInResponse = z.object({ check_in: checkInSchema })

export type Pact = z.infer<typeof pactSchema>
export type PactListItem = z.infer<typeof pactListItemSchema>
export type PactMember = z.infer<typeof pactMemberSchema>
export type TodayBoard = z.infer<typeof todayBoardSchema>
export type CreatePactBody = z.infer<typeof createPactBody>
export type Invite = z.infer<typeof inviteResponse>['invite']
export type JoinSource = z.infer<typeof joinSourceSchema>
export type CheckIn = z.infer<typeof checkInSchema>
export type CreateCheckInBody = z.infer<typeof createCheckInBody>
export type Verdict = z.infer<typeof verdictSchema>
export type MemberState = z.infer<typeof memberStateSchema>
export type DayStatus = z.infer<typeof dayStatusSchema>
export type PactProgress = z.infer<typeof pactProgressSchema>
