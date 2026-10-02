import { useMemo, useState } from 'react'
import { RefreshControl, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Handshake, KeyRound, Plus } from 'lucide-react-native'
import { PactCard, pactRank } from '@/components/pact/PactCard'
import { WeekStrip } from '@/components/pact/WeekStrip'
import { QueryErrorState } from '@/components/QueryError'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/List'
import { Screen } from '@/components/ui/Screen'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { useProfile } from '@/hooks/useProfile'
import { haptic } from '@/lib/haptics'
import { pactKeys, usePacts } from '@/lib/pacts'

/** Home: the caller's pacts, today's to-dos first, each one check-in tap away (the brief). */
export default function HomeScreen() {
	const c = useColors()
	const queryClient = useQueryClient()
	const [refreshing, setRefreshing] = useState(false)
	const pacts = usePacts()
	const { data: profile } = useProfile()

	const firstName = (profile?.fullName ?? '').split(' ')[0]
	const sorted = useMemo(
		() => [...(pacts.data ?? [])].sort((a, b) => pactRank(a) - pactRank(b)),
		[pacts.data]
	)
	const toDo = sorted.filter((p) => p.status === 'active' && p.my_state_today === 'out').length

	async function onRefresh() {
		setRefreshing(true)
		haptic.refresh()
		await queryClient.invalidateQueries({ queryKey: pactKeys.all })
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
				<Text variant="display" accessibilityRole="header">
					Hey{firstName ? ', ' : ''}
					<Text variant="display" tone="brand">
						{firstName || 'there'}
					</Text>
					!
				</Text>
				{pacts.data && pacts.data.length > 0 ? (
					<Text variant="lead" tone="secondary">
						{toDo === 0
							? "You're all caught up today."
							: `${toDo} check-in${toDo === 1 ? '' : 's'} left today.`}
					</Text>
				) : null}
			</FadeSlideIn>

			<FadeSlideIn index={1}>
				<WeekStrip />
			</FadeSlideIn>

			{pacts.data === undefined && pacts.isError ? (
				<QueryErrorState
					error={pacts.error}
					title="Couldn't load your pacts"
					onRetry={() => pacts.refetch()}
				/>
			) : pacts.data === undefined ? (
				<>
					<CardSkeleton height={104} />
					<CardSkeleton height={104} />
				</>
			) : sorted.length === 0 ? (
				<FadeSlideIn index={2}>
					<EmptyState
						icon={Handshake}
						title="No pacts yet"
						body="Make a pact with a few friends, or join theirs with a code. Miss a day and the whole group sees it."
					/>
				</FadeSlideIn>
			) : (
				<>
					<FadeSlideIn index={2}>
						<SectionHeader title="Your pacts" />
					</FadeSlideIn>
					{sorted.map((pact, i) => (
						<FadeSlideIn key={pact.id} index={3 + i}>
							<PactCard pact={pact} />
						</FadeSlideIn>
					))}
				</>
			)}

			{pacts.data !== undefined ? (
				<FadeSlideIn index={3 + sorted.length} style={s.actions}>
					<Button
						label="New pact"
						size="lg"
						fullWidth
						icon={(color) => <Plus size={18} color={color} strokeWidth={2.4} />}
						onPress={() => router.push('/pact/new')}
					/>
					<Button
						label="Join with a code"
						variant="outline"
						size="lg"
						fullWidth
						icon={(color) => <KeyRound size={18} color={color} />}
						onPress={() => router.push('/join')}
					/>
				</FadeSlideIn>
			) : null}
		</Screen>
	)
}

const s = StyleSheet.create({
	masthead: { gap: 6, marginBottom: 2 },
	actions: { gap: 10, marginTop: 8 }
})
