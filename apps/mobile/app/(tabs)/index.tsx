import { useMemo, useState } from 'react'
import { RefreshControl, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Flag, Inbox, MessageCircle, SquareCheck } from 'lucide-react-native'
import { ItemCard } from '@/components/ItemCard'
import { InlineQueryError, QueryErrorState } from '@/components/QueryError'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { NumberTicker } from '@/components/motion/NumberTicker'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { ListGroup, ListRow, SectionHeader, type IconComponent } from '@/components/ui/List'
import { Screen } from '@/components/ui/Screen'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import { useItems } from '@/hooks/useItems'
import { useProfile } from '@/hooks/useProfile'
import { devPlaceholders } from '@/lib/devPlaceholders'
import { haptic } from '@/lib/haptics'
import type { ActivityItem } from '@/lib/types'

// 🎨 REPLACE: the stats panel has no real data source yet. It shows demo numbers
// in development builds and is hidden in release builds until you wire it to
// your own numbers (or delete it).
const insightCards = devPlaceholders?.insightCards ?? []

const ACTIVITY_ICON: Record<ActivityItem['kind'], IconComponent> = {
	milestone: Flag,
	comment: MessageCircle,
	alert: CircleAlert,
	review: SquareCheck
}

function greeting(hour: number) {
	if (hour < 12) return 'Good morning'
	if (hour < 18) return 'Good afternoon'
	return 'Good evening'
}

export default function HomeScreen() {
	const c = useColors()
	const queryClient = useQueryClient()
	const [refreshing, setRefreshing] = useState(false)
	const items = useItems()
	const activity = useActivityFeed()
	const { data: profile } = useProfile()

	const now = new Date()
	const firstName = (profile?.fullName ?? '').split(' ')[0]
	const topItems = useMemo(() => (items.data ?? []).slice(0, 3), [items.data])
	const latest = useMemo(() => (activity.data ?? []).slice(0, 4), [activity.data])

	async function onRefresh() {
		setRefreshing(true)
		haptic.refresh()
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ['items'] }),
			queryClient.invalidateQueries({ queryKey: ['activity'] })
		])
		setRefreshing(false)
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
			<FadeSlideIn index={0} style={s.masthead}>
				<Eyebrow tone="muted">
					{now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
				</Eyebrow>
				<Text variant="title" accessibilityRole="header">
					{greeting(now.getHours())}
					{firstName ? `, ${firstName}` : ''}
				</Text>
			</FadeSlideIn>

			{insightCards.length > 0 ? (
				<FadeSlideIn index={1}>
					<Card tier="hero" padding="spacious">
						<Text variant="eyebrow" style={{ color: c.heroTextSecondary }}>
							At a glance · demo data
						</Text>
						<View style={s.stats}>
							{insightCards.map((stat) => (
								<View key={stat.id} style={s.stat}>
									<NumberTicker
										value={stat.value}
										format={(n) => `${Math.round(n)}${stat.unit}`}
										style={{ color: c.heroText }}
									/>
									<Text variant="caption" style={{ color: c.heroTextSecondary }}>
										{stat.label}
									</Text>
								</View>
							))}
						</View>
					</Card>
				</FadeSlideIn>
			) : null}

			<FadeSlideIn index={2}>
				<SectionHeader
					title="Recent items"
					action={
						topItems.length > 0
							? { label: 'See all', onPress: () => router.navigate('/explore') }
							: undefined
					}
				/>
			</FadeSlideIn>

			{items.data === undefined && items.isError ? (
				<QueryErrorState
					error={items.error}
					title="Couldn't load your items"
					onRetry={() => items.refetch()}
				/>
			) : items.data === undefined ? (
				<>
					<CardSkeleton />
					<CardSkeleton />
				</>
			) : topItems.length === 0 ? (
				<EmptyState
					icon={Inbox}
					title="Nothing here yet"
					body="Items you create show up here, newest first."
				/>
			) : (
				topItems.map((item, i) => (
					<FadeSlideIn key={item.id} index={3 + i}>
						<ItemCard item={item} />
					</FadeSlideIn>
				))
			)}

			<FadeSlideIn index={6}>
				<SectionHeader title="Latest activity" />
			</FadeSlideIn>

			{activity.data === undefined && activity.isError ? (
				<InlineQueryError error={activity.error} onRetry={() => activity.refetch()} />
			) : latest.length === 0 && activity.data !== undefined ? (
				<Text variant="bodySm" tone="secondary">
					No activity yet. Updates on your items will appear here.
				</Text>
			) : (
				<FadeSlideIn index={6}>
					<ListGroup>
						{latest.map((a) => (
							<ListRow
								key={a.id}
								card={false}
								icon={ACTIVITY_ICON[a.kind]}
								tone={a.kind === 'alert' ? 'warning' : 'brand'}
								title={a.title}
								subtitle={a.detail}
								value={a.timeAgo}
							/>
						))}
					</ListGroup>
				</FadeSlideIn>
			)}
		</Screen>
	)
}

const s = StyleSheet.create({
	masthead: { gap: 8, marginBottom: 4 },
	stats: { flexDirection: 'row', marginTop: 16 },
	stat: { flex: 1, gap: 4 }
})
