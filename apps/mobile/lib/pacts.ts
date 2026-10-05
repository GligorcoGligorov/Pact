import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
	type InfiniteData
} from '@tanstack/react-query'
import type * as ImagePicker from 'expo-image-picker'
import {
	checkInParams,
	inviteCodeSchema,
	pactParams,
	PROOF_CONTENT_TYPES,
	type CheckIn,
	type CreatePactBody,
	type JoinSource,
	type Reaction,
	type ReportReason,
	type ReactionState
} from '@app/contract'
import { api, ApiError, type ResponseOf } from './api'
import { supabase } from './supabase'

// Pact's data, through /api/app/v1 (docs/rules/mobile-data.md): the pact list, one pact with
// today's board, invites, joining and check-ins. Every pact read lives under ['pacts'], so one
// invalidation after a write refreshes the list and the open board together.

export type PactDetail = ResponseOf<'getPact'>
export type InviteDetail = ResponseOf<'getInvite'>['invite']

export const pactKeys = {
	all: ['pacts'] as const,
	detail: (id: string) => ['pacts', id] as const,
	invite: (code: string) => ['invites', code] as const,
	checkIn: (id: string) => ['check-ins', id] as const,
	feed: ['feed'] as const,
	blocks: ['blocks'] as const
}

/** The caller's pacts, newest first, each with their own state today. */
export function usePacts() {
	return useQuery({
		queryKey: pactKeys.all,
		queryFn: async ({ signal }) => (await api('listPacts', { signal })).pacts
	})
}

/**
 * One pact, its members and today's board. `null` when it doesn't exist or the caller isn't a
 * member (the API answers both with the same 404), including an id that can't be one, like a
 * stale deep link: that is the "gone" state, not an error.
 */
export function usePact(id: string) {
	return useQuery<PactDetail | null>({
		queryKey: pactKeys.detail(id),
		queryFn: async ({ signal }) => {
			if (!pactParams.safeParse({ id }).success) return null
			try {
				return await api('getPact', { params: { id }, signal })
			} catch (error) {
				if (error instanceof ApiError && error.code === 'not_found') return null
				throw error
			}
		}
	})
}

export function useCreatePact() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (body: CreatePactBody) => (await api('createPact', { body })).pact,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: pactKeys.all })
	})
}

/** An invite's preview. `null` for a code that doesn't exist or can't be one. */
export function useInvite(code: string) {
	return useQuery<InviteDetail | null>({
		queryKey: pactKeys.invite(code),
		queryFn: async ({ signal }) => {
			if (!inviteCodeSchema.safeParse(code).success) return null
			try {
				return (await api('getInvite', { params: { code }, signal })).invite
			} catch (error) {
				if (error instanceof ApiError && error.code === 'not_found') return null
				throw error
			}
		}
	})
}

export function useJoinPact() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ code, source }: { code: string; source: JoinSource }) =>
			api('joinPact', { params: { code }, body: { source } }),
		onSuccess: (_, { code }) =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: pactKeys.all }),
				queryClient.invalidateQueries({ queryKey: pactKeys.invite(code) })
			])
	})
}

/** The signed-in person's user id, to mark "you" on a board. */
export function useMyUserId() {
	return useQuery({
		queryKey: ['session-user'],
		queryFn: async () => (await supabase.auth.getSession()).data.session?.user.id ?? null,
		staleTime: Infinity
	})
}

/** R20: poke a crew member who is still out today. The line they get comes back in `text`. */
export function useNudge(pactId: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async (toUserId: string) =>
			(await api('createNudge', { params: { id: pactId }, body: { to_user_id: toUserId } })).nudge,
		onSettled: () => queryClient.invalidateQueries({ queryKey: pactKeys.detail(pactId) })
	})
}

// ─── Safety: report, block, leave, remove (App Review 1.2, R7, R23) ─────────

/** R23: report a check-in; the feed then hides its photo for you. */
export function useReportCheckIn() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({ checkInId, reason }: { checkInId: string; reason: ReportReason }) =>
			api('reportCheckIn', { params: { id: checkInId }, body: { reason } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: pactKeys.feed })
	})
}

/** Block someone you share a pact with: their check-ins leave your feed, nudges stop. */
export function useBlockUser() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (userId: string) => api('blockUser', { params: { user: userId }, body: {} }),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: pactKeys.feed }),
				queryClient.invalidateQueries({ queryKey: pactKeys.blocks })
			])
	})
}

/** The people you've blocked, newest first (Settings). */
export function useBlockedPeople() {
	return useQuery({
		queryKey: pactKeys.blocks,
		queryFn: async ({ signal }) => (await api('listBlocks', { signal })).blocked
	})
}

/** Unblock: their check-ins come back to your feed and nudges work again. */
export function useUnblockUser() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (userId: string) => api('unblockUser', { params: { user: userId } }),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: pactKeys.feed }),
				queryClient.invalidateQueries({ queryKey: pactKeys.blocks })
			])
	})
}

/** R7: leave a pact; your past days still count. */
export function useLeavePact(pactId: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: () => api('leavePact', { params: { id: pactId }, body: {} }),
		onSuccess: () =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: pactKeys.all }),
				queryClient.invalidateQueries({ queryKey: pactKeys.feed })
			])
	})
}

/** R7: as the owner, remove a member from today. */
export function useRemoveMember(pactId: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (memberId: string) =>
			api('removeMember', { params: { id: pactId, member: memberId } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: pactKeys.all })
	})
}

// ─── The crew feed ────────────────────────────────────────────────────────────

export const FEED_PAGE_SIZE = 15

type FeedPages = InfiniteData<ResponseOf<'listFeed'>, string | undefined>

/** The check-ins of every pact the caller is in, newest first; `data` is every page loaded. */
export function useFeed() {
	return useInfiniteQuery({
		queryKey: pactKeys.feed,
		queryFn: ({ pageParam, signal }) =>
			api('listFeed', { query: { limit: FEED_PAGE_SIZE, cursor: pageParam }, signal }),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (last) => last.next_cursor ?? undefined
	})
}

function withReactions(pages: FeedPages | undefined, checkInId: string, next: ReactionState) {
	if (!pages) return pages
	return {
		...pages,
		pages: pages.pages.map((page) => ({
			...page,
			entries: page.entries.map((entry) =>
				entry.id === checkInId ? { ...entry, reactions: next } : entry
			)
		}))
	}
}

/** The state after toggling `reaction`: what the screen shows before the server answers. */
export function toggled(state: ReactionState, reaction: Reaction): ReactionState {
	const on = !state.mine.includes(reaction)
	return {
		counts: { ...state.counts, [reaction]: Math.max(state.counts[reaction] + (on ? 1 : -1), 0) },
		mine: on ? [...state.mine, reaction] : state.mine.filter((r) => r !== reaction)
	}
}

/**
 * A reaction, toggled at once on screen (optimistic) and then on the server; on failure the
 * feed goes back to what it was and the error reaches the caller.
 */
export function useToggleReaction() {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: ({
			checkInId,
			reaction,
			on
		}: {
			checkInId: string
			reaction: Reaction
			on: boolean
		}) =>
			on
				? api('addReaction', { params: { id: checkInId, reaction }, body: {} })
				: api('removeReaction', { params: { id: checkInId, reaction } }),
		onMutate: async ({ checkInId, reaction }) => {
			await queryClient.cancelQueries({ queryKey: pactKeys.feed })
			const before = queryClient.getQueryData<FeedPages>(pactKeys.feed)
			const entry = before?.pages.flatMap((p) => p.entries).find((e) => e.id === checkInId)
			if (entry) {
				queryClient.setQueryData<FeedPages>(pactKeys.feed, (pages) =>
					withReactions(pages, checkInId, toggled(entry.reactions, reaction))
				)
			}
			return { before }
		},
		onError: (_error, _vars, context) => {
			if (context?.before) queryClient.setQueryData(pactKeys.feed, context.before)
		},
		onSuccess: ({ reactions }, { checkInId }) => {
			queryClient.setQueryData<FeedPages>(pactKeys.feed, (pages) =>
				withReactions(pages, checkInId, reactions)
			)
		}
	})
}

// ─── Check-ins ────────────────────────────────────────────────────────────────

type ProofContentType = keyof typeof PROOF_CONTENT_TYPES

function proofContentType(asset: ImagePicker.ImagePickerAsset): ProofContentType {
	const type = asset.mimeType ?? 'image/jpeg'
	return type in PROOF_CONTENT_TYPES ? (type as ProofContentType) : 'image/jpeg'
}

/** Why a photo check-in failed, in the words of the `check_in_failed` event. */
export type CheckInFailure = 'upload' | 'already_checked_in' | 'not_held' | 'network'

export function checkInFailure(error: unknown): CheckInFailure {
	if (error instanceof ApiError) {
		if (error.code === 'already_checked_in') return 'already_checked_in'
		if (error.code === 'not_held') return 'not_held'
		if (error.status === null) return 'network'
	}
	return 'upload'
}

/**
 * R12: a photo check-in. Asks for a signed URL under the caller's own proofs folder, PUTs the
 * photo there, then creates the check-in with that path. The verdict starts `pending`; poll it
 * with useCheckIn.
 */
export async function submitPhotoCheckIn(
	pactId: string,
	asset: ImagePicker.ImagePickerAsset,
	note: string | null
): Promise<CheckIn> {
	const contentType = proofContentType(asset)
	const file = await (await fetch(asset.uri)).blob()
	const { upload } = await api('createCheckInUpload', {
		params: { id: pactId },
		body: { content_type: contentType, size_bytes: file.size }
	})
	const put = await fetch(upload.signed_url, {
		method: 'PUT',
		headers: { 'Content-Type': contentType },
		body: file
	})
	if (!put.ok) {
		throw new ApiError('upload_failed', "Your photo didn't upload. Try again.", {
			status: put.status
		})
	}
	const { check_in } = await api('createCheckIn', {
		params: { id: pactId },
		body: { kind: 'photo', photo_path: upload.path, note }
	})
	return check_in
}

/**
 * R17: the streak saver, a check-in with no photo that keeps today. One per member per pact:
 * the server refuses a second (`saver_used`), even from two taps at once.
 */
export function useSaver(pactId: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: async () =>
			(await api('createCheckIn', { params: { id: pactId }, body: { kind: 'saver' } })).check_in,
		onSettled: () => queryClient.invalidateQueries({ queryKey: pactKeys.all })
	})
}

/** How often the verdict is polled while it is pending: the judge usually answers in ~1 s. */
const VERDICT_POLL_MS = 1_000

/** A check-in, polled every second until the AI's verdict is in. */
export function useCheckIn(id: string | null) {
	return useQuery({
		queryKey: pactKeys.checkIn(id ?? ''),
		enabled: !!id && checkInParams.safeParse({ id }).success,
		queryFn: async ({ signal }) =>
			(await api('getCheckIn', { params: { id: id ?? '' }, signal })).check_in,
		refetchInterval: (query) => (query.state.data?.verdict === 'pending' ? VERDICT_POLL_MS : false)
	})
}

// ─── Dates ────────────────────────────────────────────────────────────────────

/** Today's date as `YYYY-MM-DD` on this device. */
export function localIsoDate(date = new Date()): string {
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** `iso` plus `days`, as `YYYY-MM-DD`. Calendar arithmetic, in UTC so DST can't shift it. */
export function addIsoDays(iso: string, days: number): string {
	const date = new Date(`${iso}T00:00:00Z`)
	date.setUTCDate(date.getUTCDate() + days)
	return date.toISOString().slice(0, 10)
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD`. */
export function daysBetween(from: string, to: string): number {
	return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** A short "Mon 5 Oct" for an ISO date. */
export function shortDay(iso: string): string {
	return new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	})
}

/** The device's IANA timezone: a pact's timezone is its creator's (R1). */
export function deviceTimeZone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone
}
