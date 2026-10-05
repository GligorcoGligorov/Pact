import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Hourglass, Repeat, SearchX } from 'lucide-react-native'
import { Pop } from '@/components/motion/Pop'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { CrewBadge } from '@/components/pact/CrewTheme'
import { EmojiBurst } from '@/components/pact/EmojiBurst'
import { QueryErrorState } from '@/components/QueryError'
import { Awards } from '@/components/results/Awards'
import { LoserReveal, type RevealPhase } from '@/components/results/LoserReveal'
import { ResultChain } from '@/components/results/ResultChain'
import { Scoreboard } from '@/components/results/Scoreboard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/List'
import { PageHeader } from '@/components/ui/PageHeader'
import { Screen } from '@/components/ui/Screen'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { track } from '@/lib/analytics'
import { errorMessage } from '@/lib/api'
import { crewEmoji, crewTone } from '@/lib/crew'
import { haptic } from '@/lib/haptics'
import { useMyUserId } from '@/lib/pacts'
import { usePactResult, useRematch, type PactResultDetail } from '@/lib/results'

/** Pacts whose reveal this person has already seen in this app session: no second drumroll. */
const revealed = new Set<string>()

/**
 * R24: the end of a pact, the moment a crew screenshots. The crew's final chain in its colour,
 * the awards, then the reveal (a drumroll, then who owes the stake, or nobody), then the
 * scoreboard and round 2 with the same crew in one tap.
 */
export default function PactResultScreen() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const query = usePactResult(id)
	const data = query.data
	const [burst, setBurst] = useState<readonly string[] | null>(null)

	return (
		<View style={s.root}>
			<Screen header={<PageHeader />} gap={16}>
				{data === undefined && query.isError ? (
					<QueryErrorState
						error={query.error}
						title="Couldn't load the results"
						onRetry={() => query.refetch()}
					/>
				) : data === undefined ? (
					<>
						<CardSkeleton height={220} />
						<CardSkeleton height={96} />
						<CardSkeleton height={96} />
					</>
				) : data === null ? (
					<EmptyState
						icon={SearchX}
						title="This pact is gone"
						body="It may have been deleted, or you were never in it."
						action={{ label: 'Back home', onPress: () => router.replace('/') }}
					/>
				) : data === 'not_finished' ? (
					<EmptyState
						icon={Hourglass}
						emoji={['🔥', '⏳']}
						title="Still going strong"
						body="The results land the day after the last day. Keep the chain alive till then."
						action={{ label: 'Back to the pact', onPress: () => router.replace(`/pact/${id}`) }}
					/>
				) : (
					<Results detail={data} onBurst={setBurst} />
				)}
			</Screen>
			{burst ? <EmojiBurst emoji={burst} originY={0.45} /> : null}
		</View>
	)
}

function Results({
	detail,
	onBurst
}: {
	detail: PactResultDetail
	/** The reveal's celebration, drawn over the whole screen. */
	onBurst: (emoji: readonly string[]) => void
}) {
	const c = useColors()
	const { pact, result } = detail
	const { data: myId } = useMyUserId()
	const tone = crewTone(c, pact.color)
	const [phase, setPhase] = useState<RevealPhase>(revealed.has(pact.id) ? 'revealed' : 'idle')
	const viewed = useRef(false)

	useEffect(() => {
		if (viewed.current) return
		viewed.current = true
		track('pact_result_viewed', { pact_id: pact.id })
	}, [pact.id])

	function onPhase(next: RevealPhase) {
		setPhase(next)
		if (next !== 'revealed') return
		revealed.add(pact.id)
		onBurst(
			result.outcome !== 'loser'
				? [crewEmoji(pact.emoji), '🎉', '🙌', '🏆']
				: ['😂', crewEmoji(pact.emoji), '🎉', '☕']
		)
		track('pact_result_revealed', { pact_id: pact.id, outcome: result.outcome })
	}

	return (
		<>
			<FadeSlideIn index={0}>
				<Card
					tier="hero"
					padding="spacious"
					style={[s.hero, { backgroundColor: tone.fill, borderColor: tone.fill }]}
				>
					<View style={s.heroTop}>
						<Pop>
							<CrewBadge color={pact.color} emoji={pact.emoji} size={56} onFill />
						</Pop>
						<View style={s.heroTitle}>
							<Text variant="eyebrow" style={{ color: tone.onFillMuted }} numberOfLines={1}>
								{pact.name} · that&apos;s a wrap
							</Text>
							<Text variant="h2" style={{ color: tone.onFill }}>
								{pact.habit}
							</Text>
						</View>
					</View>
					<View style={s.score}>
						<Text variant="display" tabular style={{ color: tone.onFill }}>
							{result.kept_days}/{result.total_days}
						</Text>
						<Text variant="lead" style={[s.scoreText, { color: tone.onFillMuted }]}>
							days kept together{'\n'}best run {result.best_streak} 🔥
						</Text>
					</View>
					<View style={[s.chainWell, { backgroundColor: c.surface }]}>
						<ResultChain chain={result.chain} color={pact.color} />
					</View>
				</Card>
			</FadeSlideIn>

			{result.awards.length > 0 ? (
				<View>
					<SectionHeader title="The awards" />
					<Awards result={result} color={pact.color} myId={myId ?? null} base={1} />
				</View>
			) : null}

			<FadeSlideIn index={4}>
				<LoserReveal
					result={result}
					stake={pact.stake}
					color={pact.color}
					myId={myId ?? null}
					phase={phase}
					onPhase={onPhase}
				/>
			</FadeSlideIn>

			{phase === 'revealed' ? (
				<>
					<FadeSlideIn index={1}>
						<SectionHeader title="Final scores" />
						<Scoreboard result={result} myId={myId ?? null} />
					</FadeSlideIn>
					<FadeSlideIn index={2}>
						<RoundTwo detail={detail} />
					</FadeSlideIn>
				</>
			) : null}
		</>
	)
}

/** Round 2: the same crew, the same habit, from tomorrow. Green: it's the action. */
function RoundTwo({ detail }: { detail: PactResultDetail }) {
	const { showToast } = useToast()
	const rematch = useRematch(detail.pact.id)

	if (detail.rematch) {
		const next = detail.rematch.pact_id
		return (
			<Button
				label="Open round 2"
				size="lg"
				fullWidth
				withArrow
				onPress={() => router.replace(`/pact/${next}`)}
			/>
		)
	}
	return (
		<View style={s.roundTwo}>
			<Button
				label="Same crew, new pact"
				size="lg"
				fullWidth
				haptic="snap"
				loading={rematch.isPending}
				icon={(color) => <Repeat size={18} color={color} strokeWidth={2.4} />}
				onPress={() => {
					track('pact_rematch_started', { pact_id: detail.pact.id })
					rematch.mutate(undefined, {
						onSuccess: ({ pact, created }) => {
							haptic.success()
							showToast(
								created
									? 'Round 2 is on! Day 1 is tomorrow.'
									: 'Your crew already started round 2. You’re in!',
								'success'
							)
							router.replace(`/pact/${pact.id}`)
						},
						onError: (error) => {
							haptic.error()
							showToast(errorMessage(error), 'error')
						}
					})
				}}
			/>
			<Text variant="caption" tone="secondary" style={s.center}>
				Same habit, same crew, same stakes. Everyone&apos;s in, starting tomorrow.
			</Text>
		</View>
	)
}

const s = StyleSheet.create({
	root: { flex: 1 },
	hero: { gap: 18 },
	heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
	heroTitle: { flex: 1, gap: 4 },
	score: { flexDirection: 'row', alignItems: 'flex-end', gap: 14 },
	scoreText: { flex: 1, marginBottom: 6 },
	chainWell: { borderRadius: 18, padding: 12 },
	roundTwo: { gap: 8 },
	center: { textAlign: 'center' }
})
