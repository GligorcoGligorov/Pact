import { useState, type ReactNode } from 'react'
import type { CrewTone } from '@app/brand'
import { RefreshControl, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, Check, SearchX, Settings2, UserPlus } from 'lucide-react-native'
import { displayName } from '@/components/pact/Avatars'
import { ClockLeft } from '@/components/pact/Countdown'
import { KeptLine, useFirstKeptView, useFirstMilestoneView } from '@/components/pact/KeptCard'
import { CrewHero, OnFill } from '@/components/pact/CrewHero'
import { SaverCard } from '@/components/pact/SaverCard'
import { QueryErrorState } from '@/components/QueryError'
import { PhotoViewer } from '@/components/wall/PhotoViewer'
import { Waiting } from '@/components/wall/Waiting'
import { WallGrid, type OpenTile } from '@/components/wall/WallGrid'
import { CountUp } from '@/components/motion/CountUp'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Screen } from '@/components/ui/Screen'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { track } from '@/lib/analytics'
import { errorCode, errorMessage } from '@/lib/api'
import { crewTone } from '@/lib/crew'
import { milestoneFor } from '@/lib/streaks'
import { haptic } from '@/lib/haptics'
import {
	daysBetween,
	localIsoDate,
	pactDayCount,
	pactKeys,
	shortDay,
	useMyUserId,
	useNudge,
	usePact,
	useWall,
	type PactDetail
} from '@/lib/pacts'

/**
 * R18, R19: today's board. One loud block in the crew's colour (the countdown, the chain with
 * today's link closing as people check in, the streak), then the crew, the challenge and the
 * stake on paper. The check-in button is the screen's one
 * primary action, while the caller still owes today.
 */
export default function PactBoardScreen() {
	const c = useColors()
	const { id } = useLocalSearchParams<{ id: string }>()
	const query = usePact(id)
	const { data: myId } = useMyUserId()
	const queryClient = useQueryClient()
	const [refreshing, setRefreshing] = useState(false)
	const detail = query.data

	async function onRefresh() {
		setRefreshing(true)
		haptic.refresh()
		await queryClient.invalidateQueries({ queryKey: pactKeys.detail(id) })
		setRefreshing(false)
	}

	const invite = (
		<View style={s.headerActions}>
			<IconButton
				icon={(color) => <UserPlus size={20} color={color} />}
				onPress={() => router.push(`/pact/${id}/invite`)}
				accessibilityLabel="Invite people"
			/>
			<IconButton
				icon={(color) => <Settings2 size={20} color={color} />}
				onPress={() => router.push(`/pact/${id}/settings`)}
				accessibilityLabel="Pact settings"
			/>
		</View>
	)

	const today = detail?.today ?? null
	const kept = !!today && today.held_count >= MIN_CREW && today.in_count === today.held_count
	// The first view of a kept day or a milestone: the haptic and the event, once per device.
	// The celebration itself is the chain's link for today drawing closed.
	useFirstKeptView(id, today?.day ?? '', kept)
	useFirstMilestoneView(id, kept && detail ? milestoneFor(detail.progress.current_streak) : null)

	return (
		<View style={s.root}>
			<Screen
				ground={detail ? crewTone(c, detail.pact.color).deep : undefined}
				header={<PageHeader right={detail ? invite : undefined} />}
				gap={32}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={c.brandInk}
						colors={[c.brandInk]}
						progressBackgroundColor={c.surface}
					/>
				}
				footer={detail ? <BoardAction detail={detail} /> : undefined}
			>
				{detail === undefined && query.isError ? (
					<QueryErrorState
						error={query.error}
						title="Couldn't load this pact"
						onRetry={() => query.refetch()}
					/>
				) : detail === undefined ? (
					<>
						<CardSkeleton height={260} />
						<CardSkeleton height={72} />
						<CardSkeleton height={180} />
					</>
				) : detail === null ? (
					<EmptyState
						icon={SearchX}
						title="This pact is gone"
						body="It may have been cancelled, or you're no longer in it."
						action={{ label: 'Back home', onPress: () => router.replace('/') }}
					/>
				) : (
					<Board detail={detail} myId={myId ?? null} kept={kept} />
				)}
			</Screen>
		</View>
	)
}

function Board({
	detail,
	myId,
	kept
}: {
	detail: PactDetail
	myId: string | null
	/** Everyone held today is in: the chain's link for today is closed. */
	kept: boolean
}) {
	const c = useColors()
	const { showToast } = useToast()
	const nudge = useNudge(detail.pact.id)
	// Marked at once on success, before the board's refetch says so.
	const [sentTo, setSentTo] = useState<ReadonlySet<string>>(new Set())

	function sendNudge(member: { user_id: string; display_name: string | null }) {
		const first = member.display_name?.trim().split(/\s+/)[0] || 'them'
		nudge.mutate(member.user_id, {
			onSuccess: ({ text }) => {
				haptic.success()
				track('nudge_sent', { pact_id: detail.pact.id })
				setSentTo((prev) => new Set(prev).add(member.user_id))
				showToast(`Sent to ${first}: “${text}”`, 'success')
			},
			onError: (error) => {
				const code = errorCode(error)
				if (code === 'already_nudged') {
					setSentTo((prev) => new Set(prev).add(member.user_id))
					return showToast(`You already nudged ${first} today.`, 'info')
				}
				haptic.error()
				showToast(
					code === 'already_in' ? `${first} just checked in.` : errorMessage(error),
					'error'
				)
			}
		})
	}
	const { pact, today, progress, members } = detail
	const totalDays = pactDayCount(pact.start_day, pact.end_day, pact.cadence)
	const wall = useWall(pact.id)
	const [open, setOpen] = useState<OpenTile | null>(null)
	const dayNumber = progress.chain.length
	// The crew's colour: the hero's fill, and the line of each member's link below it.
	const tone = crewTone(c, pact.color)
	const live = !!today && today.held_count > 0
	const milestone = kept ? milestoneFor(progress.current_streak) : null

	return (
		<>
			<CrewHero tone={tone} glow compact>
				<View style={s.metaRow}>
					<OnFill tone={tone} muted variant="mono">
						{pact.status === 'lobby'
							? `${pad(totalDays)} days`
							: `Day ${pad(dayNumber)} / ${pad(totalDays)}`}
					</OnFill>
					{live && !kept ? (
						<ClockLeft closesAt={today.closes_at} style={{ color: tone.onFill }} />
					) : (
						<OnFill tone={tone} variant="mono">
							{statusLabel(detail, kept)}
						</OnFill>
					)}
				</View>

				<View>
					<OnFill tone={tone} variant="display">
						{pact.name}
					</OnFill>
					<OnFill tone={tone} muted variant="h1">
						{pact.habit}
					</OnFill>
				</View>

				{pact.status === 'lobby' || !live ? (
					<OnFill tone={tone} muted variant="bodySm">
						{heroLine(detail)}
					</OnFill>
				) : null}

				{pact.status !== 'lobby' ? (
					<View style={[s.stats, { borderTopColor: tone.onFillTrack }]}>
						{live ? (
							<Stat tone={tone} label="In today" value={today.in_count} of={today.held_count} />
						) : null}
						<Stat tone={tone} label="Streak" value={progress.current_streak} />
						<Stat tone={tone} label="Best" value={progress.best_streak} />
					</View>
				) : null}
			</CrewHero>

			{kept ? (
				<FadeSlideIn index={1}>
					<KeptLine dayNumber={dayNumber} milestone={milestone} />
				</FadeSlideIn>
			) : null}

			{wall.data && wall.data.days.length > 0 ? (
				<FadeSlideIn index={1}>
					<Section
						label={
							today && today.held_count > 0
								? `The wall · ${today.in_count} / ${today.held_count} in today`
								: 'The wall'
						}
					>
						<WallGrid wall={wall.data} myId={myId} tone={tone} onOpen={setOpen} />
						{today ? (
							<Waiting
								members={today.members}
								myId={myId}
								nudgeFor={(member) => ({
									sent: member.nudged_by_me || sentTo.has(member.user_id),
									sending: nudge.isPending && nudge.variables === member.user_id,
									onPress: () => sendNudge(member)
								})}
							/>
						) : null}
					</Section>
					<PhotoViewer
						pactId={pact.id}
						tile={open}
						own={open?.cell.user_id === myId}
						onClose={() => setOpen(null)}
					/>
				</FadeSlideIn>
			) : !today ? (
				<FadeSlideIn index={1}>
					<Section label={`The crew · ${members.filter((m) => !m.left_day).length}`}>
						{members
							.filter((m) => !m.left_day)
							.map((m, i) => (
								<View
									key={m.user_id}
									style={[
										s.member,
										i > 0 && {
											borderTopColor: c.borderHairline,
											borderTopWidth: StyleSheet.hairlineWidth
										}
									]}
								>
									<Text variant="label" style={s.memberName} numberOfLines={1}>
										{displayName(m)}
										{m.user_id === myId ? ' (you)' : ''}
									</Text>
									{m.role === 'owner' ? (
										<Text variant="mono" tone="tertiary">
											Owner
										</Text>
									) : null}
								</View>
							))}
					</Section>
				</FadeSlideIn>
			) : null}

			{live && !kept ? (
				<FadeSlideIn index={2}>
					<Section label="Today’s challenge">
						<Text variant="h2">{today.challenge}</Text>
					</Section>
				</FadeSlideIn>
			) : null}

			{today && today.me.held && today.me.state === 'out' ? (
				<FadeSlideIn index={3}>
					<SaverCard
						pactId={pact.id}
						closesAt={today.closes_at}
						available={today.me.saver_available}
					/>
				</FadeSlideIn>
			) : null}

			{pact.stake ? (
				<FadeSlideIn index={4}>
					<Section label="The stake">
						<Text variant="body">{pact.stake}</Text>
					</Section>
				</FadeSlideIn>
			) : null}
		</>
	)
}

/** Two digits, the way the micro-labels count: "08". */
function pad(n: number): string {
	return String(n).padStart(2, '0')
}

/** The hero's right-hand label when there is no clock running. */
function statusLabel({ pact, today }: PactDetail, kept: boolean): string {
	if (pact.status === 'lobby') return `Starts ${shortDay(pact.start_day)}`
	if (pact.status === 'completed') return 'Finished'
	if (pact.status === 'cancelled') return 'Cancelled'
	if (kept) return 'Day kept'
	return today?.held_count === 0 ? 'Rest day' : ''
}

/** A mono label over a number that counts up on open: "STREAK / 06", "IN TODAY / 2 / 4". */
function Stat({
	tone,
	label,
	value,
	of
}: {
	tone: CrewTone
	label: string
	value: number
	/** "of N": shown after the value. */
	of?: number
}) {
	return (
		<View style={s.stat}>
			<OnFill tone={tone} muted variant="mono">
				{label}
			</OnFill>
			<View style={s.statValue}>
				<CountUp value={value} format={of === undefined ? pad : String} color={tone.onFill} />
				{of !== undefined ? (
					<Text variant="h1" tabular style={{ color: tone.onFillMuted }}>
						/{of}
					</Text>
				) : null}
			</View>
		</View>
	)
}

/** A block of the board: a hairline, a mono label, then its content. No card. */
function Section({ label, children }: { label: string; children: ReactNode }) {
	const c = useColors()
	return (
		<View style={[s.section, { borderTopColor: c.textPrimary }]}>
			<Text variant="mono" tone="secondary">
				{label}
			</Text>
			<View style={s.sectionBody}>{children}</View>
		</View>
	)
}

/** The hero's line when there is no countdown to show. */
function heroLine({ pact, today }: PactDetail): string {
	switch (pact.status) {
		case 'lobby': {
			const days = daysBetween(localIsoDate(), pact.start_day)
			return days <= 1
				? `Starts ${days <= 0 ? 'today' : 'tomorrow'}. Get everyone in before then.`
				: `Starts in ${days} days, on ${shortDay(pact.start_day)}. Get everyone in before then.`
		}
		case 'completed':
			return 'That’s a wrap. The results are in.'
		case 'cancelled':
			return 'This pact was cancelled.'
		case 'active':
			return today?.held_count === 0 ? 'A rest day. Nobody checks in today.' : ''
	}
}

/** The board's one action, in the footer: check in, or say why not. */
function BoardAction({ detail }: { detail: PactDetail }) {
	const c = useColors()
	const { pact, today } = detail

	if (pact.status === 'lobby') {
		return (
			<Button
				label="Invite people"
				size="lg"
				fullWidth
				icon={(color) => <UserPlus size={18} color={color} />}
				onPress={() => router.push(`/pact/${pact.id}/invite`)}
			/>
		)
	}
	if (pact.status === 'completed') {
		return (
			<Button
				label="See the results"
				size="lg"
				fullWidth
				withArrow
				haptic="snap"
				onPress={() => router.push(`/pact/${pact.id}/result`)}
			/>
		)
	}
	if (!today || pact.status !== 'active') return null
	if (!today.me.held) {
		return (
			<Text variant="bodySm" tone="secondary" style={s.footerNote}>
				{today.held_count === 0
					? 'No check-in today.'
					: "You're in from tomorrow. Today's on the others."}
			</Text>
		)
	}
	if (today.me.state === 'in' || today.me.state === 'saver') {
		return (
			<View style={[s.doneBar, { borderColor: c.borderActive }]}>
				<Check size={18} color={c.textPrimary} strokeWidth={2.2} />
				<Text variant="label">
					{today.me.state === 'saver' ? 'Saver used. Today is covered.' : "You're in today."}
				</Text>
			</View>
		)
	}
	return (
		<Button
			label="Check in"
			size="lg"
			fullWidth
			haptic="snap"
			icon={(color) => <Camera size={20} color={color} strokeWidth={1.8} />}
			onPress={() => router.push(`/pact/${pact.id}/check-in`)}
		/>
	)
}

/** A crew of one can't keep a day "together" (the server's crew-complete rule too). */
const MIN_CREW = 2

const s = StyleSheet.create({
	root: { flex: 1 },
	headerActions: { flexDirection: 'row', gap: 8 },
	metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
	stats: {
		flexDirection: 'row',
		gap: 32,
		paddingTop: 16,
		borderTopWidth: StyleSheet.hairlineWidth
	},
	stat: { gap: 4 },
	statValue: { flexDirection: 'row', alignItems: 'baseline' },
	section: { borderTopWidth: StyleSheet.hairlineWidth * 2, paddingTop: 12, gap: 12 },
	sectionBody: { gap: 16 },
	member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
	memberName: { flex: 1 },
	footerNote: { textAlign: 'center' },
	doneBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		minHeight: 52,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth * 2
	}
})
