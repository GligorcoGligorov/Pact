import { useState } from 'react'
import { RefreshControl, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, Check, Flame, ScanEye, SearchX, UserPlus } from 'lucide-react-native'
import { Chain, chainTiles } from '@/components/pact/Chain'
import { Countdown } from '@/components/pact/Countdown'
import { MemberRow } from '@/components/pact/MemberRow'
import { Ring } from '@/components/pact/Ring'
import { QueryErrorState } from '@/components/QueryError'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { SectionHeader } from '@/components/ui/List'
import { PageHeader } from '@/components/ui/PageHeader'
import { Screen } from '@/components/ui/Screen'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Text } from '@/components/ui/Text'
import { useColors, useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { track } from '@/lib/analytics'
import { errorCode, errorMessage } from '@/lib/api'
import { haptic } from '@/lib/haptics'
import {
	daysBetween,
	localIsoDate,
	pactKeys,
	shortDay,
	useMyUserId,
	useNudge,
	usePact,
	type PactDetail
} from '@/lib/pacts'

/**
 * R18, R19: today's board. The countdown to local midnight, the group's ring, the challenge,
 * each held member and the chain with the streak. The check-in button is the screen's one
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
		<IconButton
			icon={(color) => <UserPlus size={20} color={color} />}
			onPress={() => router.push(`/pact/${id}/invite`)}
			accessibilityLabel="Invite people"
		/>
	)

	return (
		<Screen
			header={<PageHeader right={detail ? invite : undefined} />}
			gap={16}
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
					<CardSkeleton height={190} />
					<CardSkeleton height={120} />
					<CardSkeleton height={160} />
				</>
			) : detail === null ? (
				<EmptyState
					icon={SearchX}
					title="This pact is gone"
					body="It may have been cancelled, or you're no longer in it."
					action={{ label: 'Back home', onPress: () => router.replace('/') }}
				/>
			) : (
				<Board detail={detail} myId={myId ?? null} />
			)}
		</Screen>
	)
}

function Board({ detail, myId }: { detail: PactDetail; myId: string | null }) {
	const { colors: c, elevation } = useTheme()
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
	const tiles = chainTiles(progress.chain, pact.start_day, pact.end_day, pact.cadence)
	const totalDays = tiles.length
	const doneDays = tiles.filter((t) => t.status !== 'future').length

	return (
		<>
			<FadeSlideIn index={0}>
				{/* The screen's one dark card: ref 03's countdown and the crew's ring. */}
				<Card tier="hero" padding="spacious" style={s.hero}>
					<View style={s.heroTop}>
						<View style={s.heroTitle}>
							<Text variant="eyebrow" style={{ color: c.heroTextSecondary }} numberOfLines={1}>
								{pact.name}
							</Text>
							<Text variant="h1" style={{ color: c.heroText }}>
								{pact.habit}
							</Text>
						</View>
						{today && today.held_count > 0 ? (
							<Ring
								value={today.in_count}
								max={today.held_count}
								size={80}
								stroke={9}
								color={c.brandFill}
								track={c.heroBorder}
							>
								<Text variant="h3" tabular style={{ color: c.heroText }}>
									{today.in_count}/{today.held_count}
								</Text>
								<Text variant="caption" style={{ color: c.heroTextSecondary }}>
									in
								</Text>
							</Ring>
						) : null}
					</View>

					{today && today.held_count > 0 ? (
						<View>
							<Countdown
								closesAt={today.closes_at}
								color={c.heroText}
								unitColor={c.heroTextSecondary}
							/>
							<Text variant="bodySm" style={{ color: c.heroTextSecondary }}>
								left to check in today
							</Text>
						</View>
					) : (
						<Text variant="lead" style={{ color: c.heroTextSecondary }}>
							{heroLine(detail)}
						</Text>
					)}
				</Card>
			</FadeSlideIn>

			{today && today.held_count > 0 ? (
				<FadeSlideIn index={1}>
					<Card padding="normal" style={[s.challenge, elevation.card]}>
						<View style={[s.challengeIcon, { backgroundColor: c.brandDim }]}>
							<ScanEye size={24} color={c.brandInk} />
						</View>
						<View style={s.challengeText}>
							<Text variant="eyebrow" tone="brand">
								Today&apos;s challenge
							</Text>
							<Text variant="h3">{today.challenge}</Text>
							<Text variant="caption" tone="secondary">
								Show it in your photo, so everyone knows it&apos;s from today.
							</Text>
						</View>
					</Card>
				</FadeSlideIn>
			) : null}

			{today && today.members.length > 0 ? (
				<FadeSlideIn index={2}>
					<SectionHeader title="Today" />
					<Card padding="compact">
						{today.members.map((member) => (
							<MemberRow
								key={member.user_id}
								member={member}
								isMe={member.user_id === myId}
								nudge={{
									sent: member.nudged_by_me || sentTo.has(member.user_id),
									sending: nudge.isPending && nudge.variables === member.user_id,
									onPress: () => sendNudge(member)
								}}
							/>
						))}
					</Card>
				</FadeSlideIn>
			) : !today ? (
				<FadeSlideIn index={2}>
					<SectionHeader title={`Members · ${members.filter((m) => !m.left_day).length}`} />
					<Card padding="compact">
						{members
							.filter((m) => !m.left_day)
							.map((m) => (
								<Text key={m.user_id} variant="body" style={s.memberName}>
									{(m.display_name?.trim() || 'A member') + (m.user_id === myId ? ' (you)' : '')}
									{m.role === 'owner' ? ' · owner' : ''}
								</Text>
							))}
					</Card>
				</FadeSlideIn>
			) : null}

			<FadeSlideIn index={3}>
				<Card padding="spacious" style={s.streakCard}>
					<View style={s.streakTop}>
						<View style={s.streak}>
							<Flame
								size={34}
								color={progress.current_streak > 0 ? c.warning : c.textDisabled}
								fill={progress.current_streak > 0 ? c.warningSoft : 'none'}
								strokeWidth={2}
							/>
							<View>
								<Text variant="display" tabular>
									{progress.current_streak}
								</Text>
								<Text variant="caption" tone="secondary">
									day streak · best {progress.best_streak}
								</Text>
							</View>
						</View>
						<Text variant="caption" tone="tertiary" tabular>
							{doneDays} of {totalDays} days
						</Text>
					</View>
					<Chain tiles={tiles} />
				</Card>
			</FadeSlideIn>

			{pact.stake ? (
				<FadeSlideIn index={4}>
					<Text variant="bodySm" tone="secondary" style={s.stake}>
						The stake: {pact.stake}
					</Text>
				</FadeSlideIn>
			) : null}
		</>
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
			return "This pact is over. Here's how the chain ended."
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
			<View style={[s.doneBar, { backgroundColor: c.successSoft, borderColor: c.successBorder }]}>
				<Check size={18} color={c.successText} strokeWidth={2.6} />
				<Text variant="label" tone="success">
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
			icon={(color) => <Camera size={20} color={color} strokeWidth={2.2} />}
			onPress={() => router.push(`/pact/${pact.id}/check-in`)}
		/>
	)
}

const s = StyleSheet.create({
	hero: { gap: 18 },
	heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
	heroTitle: { flex: 1, gap: 6 },
	challenge: { flexDirection: 'row', alignItems: 'center', gap: 14 },
	challengeIcon: {
		width: 48,
		height: 48,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center'
	},
	challengeText: { flex: 1, gap: 3 },
	memberName: { paddingVertical: 8 },
	streakCard: { gap: 16 },
	streakTop: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
	streak: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	stake: { textAlign: 'center' },
	footerNote: { textAlign: 'center' },
	doneBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		minHeight: 52,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth
	}
})
