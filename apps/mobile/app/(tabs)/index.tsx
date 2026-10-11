import { useMemo, useState } from 'react'
import { RefreshControl, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { Handshake, KeyRound, Plus } from 'lucide-react-native'
import type { PactListItem } from '@app/contract'
import { ClockLeft } from '@/components/pact/Countdown'
import { PactCard, pactRank } from '@/components/pact/PactCard'
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

/**
 * Home: the caller's crews, today's to-dos first. The first pact still owed today is the screen's
 * one loud block, with its check-in on it; the rest are quiet rows.
 */
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
			>
				<FadeSlideIn index={0} style={s.masthead}>
					<View style={s.titleRow}>
						<Text variant="mono" tone="secondary" style={s.flex}>
							{todayLabel()}
						</Text>
						{hasPacts ? (
							<IconButton
								icon={(color) => <Plus size={22} color={color} strokeWidth={1.8} />}
								onPress={() => setAdding(true)}
								accessibilityLabel="New pact or join one"
								size={44}
							/>
						) : null}
					</View>
					<View>
						<Text variant="display" accessibilityRole="header">
							Hey{firstName ? `, ${firstName}` : ''}.
						</Text>
						{hasPacts ? <DueLine pacts={sorted} /> : null}
					</View>
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
							title="No pacts yet. Let's fix that."
							body="Grab a few friends, pick one habit, keep each other honest. Miss a day and the whole crew knows."
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
						<FadeSlideIn key={pact.id} index={1 + i}>
							<PactCard pact={pact} myId={myId ?? null} loud={i === 0 && pactRank(pact) === 0} />
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

/** "SUN 11 OCT": the masthead's mono date. */
function todayLabel(): string {
	return new Date()
		.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })
		.replace(',', '')
}

/**
 * The headline's muted second line: what today still asks ("One pact to go."), and the soonest
 * close among the pacts the caller still owes, ticking in mono.
 */
function DueLine({ pacts }: { pacts: PactListItem[] }) {
	const owed = pacts.filter((p) => p.status === 'active' && p.my_state_today === 'out' && p.today)
	if (owed.length === 0) {
		const anyActive = pacts.some((p) => p.status === 'active' && p.my_state_today !== null)
		return (
			<Text variant="display" tone="tertiary">
				{anyActive ? 'You’re in everywhere.' : 'Nothing due today.'}
			</Text>
		)
	}
	const soonest = owed
		.map((p) => p.today!.closes_at)
		.sort((a, b) => Date.parse(a) - Date.parse(b))[0]
	return (
		<View style={s.due}>
			<Text variant="display" tone="tertiary">
				{owed.length === 1 ? 'One pact to go.' : `${owed.length} pacts to go.`}
			</Text>
			<ClockLeft closesAt={soonest} />
		</View>
	)
}

const s = StyleSheet.create({
	masthead: { gap: 16 },
	titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	flex: { flex: 1 },
	due: { gap: 12 },
	empty: { gap: 12 }
})
