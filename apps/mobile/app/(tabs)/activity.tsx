import { useMemo, useState } from 'react'
import { RefreshControl, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Camera } from 'lucide-react-native'
import type { FeedEntry, Reaction } from '@app/contract'
import { FeedCard } from '@/components/pact/FeedCard'
import { LoadMore, QueryErrorState } from '@/components/QueryError'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/List'
import { ScreenTitle } from '@/components/ui/PageHeader'
import { Screen } from '@/components/ui/Screen'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { useColors } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { track } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'
import {
	addIsoDays,
	localIsoDate,
	pactKeys,
	useFeed,
	useMyUserId,
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
					title="No check-ins yet"
					body="When anyone in your pacts checks in, it shows up here. Be the first today."
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
		</Screen>
	)
}

const s = StyleSheet.create({
	group: { gap: 14 }
})
