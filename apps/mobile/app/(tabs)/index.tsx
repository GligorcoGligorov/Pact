import { useEffect, useMemo, useState } from 'react'
import { RefreshControl, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Handshake, KeyRound, Plus } from 'lucide-react-native'
import type { PactListItem } from '@app/contract'
import { timeLeft } from '@/components/pact/Countdown'
import { PactCard, pactRank } from '@/components/pact/PactCard'
import { WeekStrip, type DayMark } from '@/components/pact/WeekStrip'
import { QueryErrorState } from '@/components/QueryError'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { ListGroup, ListRow } from '@/components/ui/List'
import { Screen } from '@/components/ui/Screen'
import { Sheet } from '@/components/ui/Sheet'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { useProfile } from '@/hooks/useProfile'
import { haptic } from '@/lib/haptics'
import { pactKeys, useMyUserId, usePacts } from '@/lib/pacts'

const TICK_MS = 30_000

/** Each closed day across the caller's pacts: kept everywhere, or broken in at least one. */
function dayMarks(pacts: PactListItem[]): Map<string, DayMark> {
	const marks = new Map<string, DayMark>()
	for (const pact of pacts) {
		for (const { day, status } of pact.progress.chain) {
			if (status === 'broken') marks.set(day, 'broken')
			else if (status === 'kept' && !marks.has(day)) marks.set(day, 'kept')
		}
	}
	return marks
}

/** Home: the caller's crews, today's to-dos first, each one check-in tap away (ref 01). */
export default function HomeScreen() {
	const c = useColors()
	const queryClient = useQueryClient()
	const [refreshing, setRefreshing] = useState(false)
	const [adding, setAdding] = useState(false)
	const pacts = usePacts()
	const { data: profile } = useProfile()
	const { data: myId } = useMyUserId()

	const firstName = (profile?.fullName ?? '').split(' ')[0]
	const sorted = useMemo(
		() => [...(pacts.data ?? [])].sort((a, b) => pactRank(a) - pactRank(b)),
		[pacts.data]
	)
	const marks = useMemo(() => dayMarks(pacts.data ?? []), [pacts.data])
	const hasPacts = sorted.length > 0

	async function onRefresh() {
		setRefreshing(true)
		haptic.refresh()
		await queryClient.invalidateQueries({ queryKey: pactKeys.all })
		setRefreshing(false)
	}

	function go(path: '/pact/new' | '/join') {
		setAdding(false)
		router.push(path)
	}

	return (
		<>
			<Screen
				tabs
				gap={18}
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
					<View style={s.titleRow}>
						<Text variant="display" accessibilityRole="header" style={s.flex}>
							Hey{firstName ? ', ' : ''}
							<Text variant="display" tone="brand">
								{firstName || 'there'}
							</Text>
							!
						</Text>
						{hasPacts ? (
							<IconButton
								icon={(color) => <Plus size={22} color={color} strokeWidth={2.4} />}
								onPress={() => setAdding(true)}
								accessibilityLabel="New pact or join one"
								size={44}
							/>
						) : null}
					</View>
					{hasPacts ? <DueLine pacts={sorted} /> : null}
				</FadeSlideIn>

				<FadeSlideIn index={1}>
					<WeekStrip marks={marks} />
				</FadeSlideIn>

				{pacts.data === undefined && pacts.isError ? (
					<QueryErrorState
						error={pacts.error}
						title="Couldn't load your pacts"
						onRetry={() => pacts.refetch()}
					/>
				) : pacts.data === undefined ? (
					<>
						<CardSkeleton height={190} />
						<CardSkeleton height={190} />
					</>
				) : !hasPacts ? (
					<FadeSlideIn index={2} style={s.empty}>
						<EmptyState
							icon={Handshake}
							title="No pacts yet"
							body="Make a pact with a few friends, or join theirs with a code. Miss a day and the whole crew sees it."
						/>
						<Button
							label="New pact"
							size="lg"
							fullWidth
							icon={(color) => <Plus size={18} color={color} strokeWidth={2.4} />}
							onPress={() => go('/pact/new')}
						/>
						<Button
							label="Join with a code"
							variant="outline"
							size="lg"
							fullWidth
							icon={(color) => <KeyRound size={18} color={color} />}
							onPress={() => go('/join')}
						/>
					</FadeSlideIn>
				) : (
					sorted.map((pact, i) => (
						<FadeSlideIn key={pact.id} index={2 + i}>
							<PactCard pact={pact} myId={myId ?? null} />
						</FadeSlideIn>
					))
				)}
			</Screen>

			<Sheet open={adding} onClose={() => setAdding(false)} title="Add a pact">
				<ListGroup>
					<ListRow
						icon={Plus}
						title="New pact"
						subtitle="Pick a habit and bring your crew"
						onPress={() => go('/pact/new')}
					/>
					<ListRow
						icon={KeyRound}
						title="Join with a code"
						subtitle="A friend sent you six characters"
						onPress={() => go('/join')}
					/>
				</ListGroup>
			</Sheet>
		</>
	)
}

/** "6h 12m left · 2 to go": the soonest close among the pacts the caller still owes today. */
function DueLine({ pacts }: { pacts: PactListItem[] }) {
	const [now, setNow] = useState(Date.now())
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), TICK_MS)
		return () => clearInterval(timer)
	}, [])

	const owed = pacts.filter((p) => p.status === 'active' && p.my_state_today === 'out' && p.today)
	if (owed.length === 0) {
		const anyActive = pacts.some((p) => p.status === 'active' && p.my_state_today !== null)
		return (
			<Text variant="lead" tone="secondary">
				{anyActive ? "You're in everywhere today. Nice." : 'Nothing to check in today.'}
			</Text>
		)
	}
	const soonest = owed
		.map((p) => p.today!.closes_at)
		.sort((a, b) => Date.parse(a) - Date.parse(b))[0]
	const { hours, minutes } = timeLeft(soonest, now)
	return (
		<View
			style={s.due}
			accessibilityLabel={`${hours} hours ${minutes} minutes left, ${owed.length} to go`}
		>
			<Text variant="h1" tone="brand" tabular>
				{hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
			</Text>
			<Text variant="lead" tone="secondary">
				left · {owed.length} to go
			</Text>
		</View>
	)
}

const s = StyleSheet.create({
	masthead: { gap: 8, marginBottom: 2 },
	titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	flex: { flex: 1 },
	due: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
	empty: { gap: 12 }
})
