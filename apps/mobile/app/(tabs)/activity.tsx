import { useMemo, useState } from 'react'
import { RefreshControl, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Ban, Camera, Flag } from 'lucide-react-native'
import type { FeedEntry, Reaction, ReportReason } from '@app/contract'
import { displayName } from '@/components/pact/Avatars'
import { FeedCard } from '@/components/pact/FeedCard'
import { LoadMore, QueryErrorState } from '@/components/QueryError'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { ActionSheet, AlertModal } from '@/components/ui/AppModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/List'
import { ScreenTitle } from '@/components/ui/PageHeader'
import { Screen } from '@/components/ui/Screen'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useColors } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { track } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'
import { errorMessage } from '@/lib/api'
import {
	addIsoDays,
	localIsoDate,
	pactKeys,
	useBlockUser,
	useFeed,
	useMyUserId,
	useReportCheckIn,
	useToggleReaction
} from '@/lib/pacts'

/** "Today", "Yesterday", or the day's date: the feed's section headers. */
function dayLabel(iso: string, today: string): string {
	if (iso === today) return 'Today'
	if (iso === addIsoDays(today, -1)) return 'Yesterday'
	return new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC'
	})
}

/** The feed's entries, grouped by the day they were checked in on, newest first. */
function byDay(entries: FeedEntry[]): { day: string; entries: FeedEntry[] }[] {
	const groups: { day: string; entries: FeedEntry[] }[] = []
	for (const entry of entries) {
		const last = groups[groups.length - 1]
		if (last && last.day === entry.day) last.entries.push(entry)
		else groups.push({ day: entry.day, entries: [entry] })
	}
	return groups
}

/**
 * The Activity tab: the crew feed (R22). Every check-in from every pact you're in, with its photo,
 * the AI's caption and any flag, and one-tap reactions that make it social, not a log.
 */
export default function ActivityScreen() {
	const c = useColors()
	const queryClient = useQueryClient()
	const { showToast } = useToast()
	const feed = useFeed()
	const toggle = useToggleReaction()
	const { data: myId } = useMyUserId()
	const [refreshing, setRefreshing] = useState(false)
	const report = useReportCheckIn()
	const block = useBlockUser()
	// The card whose "⋯" was tapped, and which step of its menu is open.
	const [menu, setMenu] = useState<{
		entry: FeedEntry
		step: 'actions' | 'report' | 'block'
	} | null>(null)
	const first = menu ? displayName(menu.entry).split(' ')[0] : ''

	function sendReport(reason: ReportReason) {
		if (!menu) return
		const { entry } = menu
		setMenu(null)
		track('check_in_reported', { pact_id: entry.pact_id, reason })
		report.mutate(
			{ checkInId: entry.id, reason },
			{
				onSuccess: () => {
					haptic.success()
					showToast('Reported. The photo is hidden for you, and we’ll take a look.', 'success')
				},
				onError: (error) => showToast(errorMessage(error), 'error')
			}
		)
	}

	function confirmBlock() {
		if (!menu) return
		const { entry } = menu
		setMenu(null)
		track('user_blocked')
		block.mutate(entry.user_id, {
			onSuccess: () => {
				haptic.success()
				showToast(`${displayName(entry).split(' ')[0]} is blocked.`, 'success')
			},
			onError: (error) => showToast(errorMessage(error), 'error')
		})
	}

	const entries = useMemo(() => feed.data?.pages.flatMap((page) => page.entries) ?? [], [feed.data])
	const groups = useMemo(() => byDay(entries), [entries])
	const today = localIsoDate()

	async function onRefresh() {
		setRefreshing(true)
		haptic.refresh()
		await queryClient.invalidateQueries({ queryKey: pactKeys.feed })
		setRefreshing(false)
	}

	function react(entry: FeedEntry, reaction: Reaction) {
		const on = !entry.reactions.mine.includes(reaction)
		if (on) track('check_in_reacted', { pact_id: entry.pact_id, reaction })
		toggle.mutate(
			{ checkInId: entry.id, reaction, on },
			{ onError: () => showToast("That reaction didn't go through. Try again.", 'error') }
		)
	}

	return (
		<Screen
			tabs
			gap={14}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={onRefresh}
					tintColor={c.brandInk}
					colors={[c.brandInk]}
					progressBackgroundColor={c.surface}
				/>
			}
		>
			<ScreenTitle
				variant="display"
				title="Activity"
				subtitle="Your crews’ check-ins, newest first."
			/>

			{feed.data === undefined && feed.isError ? (
				<QueryErrorState
					error={feed.error}
					title="Couldn't load the feed"
					onRetry={() => feed.refetch()}
				/>
			) : feed.data === undefined ? (
				<>
					<CardSkeleton height={420} />
					<CardSkeleton height={420} />
				</>
			) : entries.length === 0 ? (
				<EmptyState
					icon={Camera}
					emoji={['📸', '👏', '😂']}
					title="Quiet in here…"
					body="Every check-in from your crews lands here. Go first and set the pace."
					action={{ label: 'Go to your pacts', onPress: () => router.navigate('/') }}
				/>
			) : (
				<>
					{groups.map((group, g) => (
						<FadeSlideIn key={group.day} index={Math.min(g, 3)} style={s.group}>
							<SectionHeader title={dayLabel(group.day, today)} />
							{group.entries.map((entry) => (
								<FeedCard
									key={entry.id}
									entry={entry}
									myId={myId ?? null}
									onReact={(reaction) => react(entry, reaction)}
									onMore={() => setMenu({ entry, step: 'actions' })}
								/>
							))}
						</FadeSlideIn>
					))}
					<LoadMore
						hasMore={feed.hasNextPage}
						loading={feed.isFetchingNextPage}
						error={feed.isFetchNextPageError ? feed.error : undefined}
						onPress={() => feed.fetchNextPage()}
						label="Older check-ins"
					/>
				</>
			)}
			<ActionSheet
				visible={menu?.step === 'actions'}
				title={`${first}’s check-in`}
				options={[
					{
						text: 'Report check-in',
						icon: Flag,
						onPress: () => menu && setMenu({ ...menu, step: 'report' })
					},
					{
						text: `Block ${first}`,
						icon: Ban,
						style: 'destructive',
						onPress: () => menu && setMenu({ ...menu, step: 'block' })
					}
				]}
				onDismiss={() => setMenu(null)}
			/>
			<ActionSheet
				visible={menu?.step === 'report'}
				title="What’s wrong with it?"
				options={[
					{ text: 'It’s fake or an old photo', onPress: () => sendReport('fake') },
					{ text: 'It’s inappropriate', onPress: () => sendReport('inappropriate') },
					{ text: 'Something else', onPress: () => sendReport('other') }
				]}
				onDismiss={() => setMenu(null)}
			/>
			<AlertModal
				visible={menu?.step === 'block'}
				title={`Block ${first}?`}
				message="You won’t see each other’s check-ins, and nudges between you stop. You both stay in your pacts."
				buttons={[
					{ text: 'Cancel', style: 'cancel', onPress: () => setMenu(null) },
					{ text: 'Block', style: 'destructive', onPress: confirmBlock }
				]}
				onDismiss={() => setMenu(null)}
			/>
		</Screen>
	)
}

const s = StyleSheet.create({
	group: { gap: 14 }
})
