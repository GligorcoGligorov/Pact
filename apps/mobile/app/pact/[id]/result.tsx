import { useEffect, useRef, useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Hourglass, Repeat, SearchX, Share } from 'lucide-react-native'
import type { CrewTone } from '@app/brand'
import { CountUp } from '@/components/motion/CountUp'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { Chain } from '@/components/pact/Chain'
import { CrewHero, OnFill } from '@/components/pact/CrewHero'
import { QueryErrorState } from '@/components/QueryError'
import { Awards } from '@/components/results/Awards'
import { LoserReveal, type RevealPhase } from '@/components/results/LoserReveal'
import { Scoreboard } from '@/components/results/Scoreboard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Screen } from '@/components/ui/Screen'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { track } from '@/lib/analytics'
import { errorMessage } from '@/lib/api'
import { crewTone } from '@/lib/crew'
import { haptic } from '@/lib/haptics'
import { useMyUserId } from '@/lib/pacts'
import { usePactResult, useRematch, type PactResultDetail } from '@/lib/results'
import { shareResult } from '@/lib/shareResult'

/** Pacts whose reveal this person has already seen in this app session: no second drumroll. */
const revealed = new Set<string>()

/**
 * R24: the end of a pact, the moment a crew screenshots. The crew's block with its whole chain
 * drawing in and the score counting up, the awards, then the reveal (a drumroll, then who owes the stake, or nobody), then the
 * scoreboard and round 2 with the same crew in one tap.
 */
export default function PactResultScreen() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const query = usePactResult(id)
	const data = query.data

	return (
		<View style={s.root}>
			<Screen header={<PageHeader />} gap={32}>
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
						title="Still going strong"
						body="The results land the day after the last day. Keep the chain alive till then."
						action={{ label: 'Back to the pact', onPress: () => router.replace(`/pact/${id}`) }}
					/>
				) : (
					<Results detail={data} />
				)}
			</Screen>
		</View>
	)
}

function Results({ detail }: { detail: PactResultDetail }) {
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
		track('pact_result_revealed', { pact_id: pact.id, outcome: result.outcome })
	}

	return (
		<>
			<CrewHero tone={tone}>
				<OnFill tone={tone} muted variant="mono">
					That’s a wrap · {pad(result.total_days)} days
				</OnFill>
				<View>
					<OnFill tone={tone} variant="display">
						{pact.name}
					</OnFill>
					<OnFill tone={tone} muted variant="h1">
						{pact.habit}
					</OnFill>
				</View>
				<Chain
					tiles={result.chain}
					size="full"
					colors={{ ink: tone.onFill, track: tone.onFillTrack, glow: tone.glow }}
				/>
				<View style={[s.stats, { borderTopColor: tone.onFillTrack }]}>
					<Stat tone={tone} label="Kept together" value={result.kept_days} of={result.total_days} />
					<Stat tone={tone} label="Best run" value={result.best_streak} />
				</View>
			</CrewHero>

			{result.awards.length > 0 ? (
				<Section label="The awards">
					<Awards result={result} myId={myId ?? null} base={1} />
				</Section>
			) : null}

			<FadeSlideIn index={4}>
				<LoserReveal
					result={result}
					stake={pact.stake}
					myId={myId ?? null}
					phase={phase}
					onPhase={onPhase}
				/>
			</FadeSlideIn>

			{phase === 'revealed' ? (
				<>
					<FadeSlideIn index={1}>
						<ShareResult pactId={pact.id} name={pact.name} />
					</FadeSlideIn>
					<FadeSlideIn index={2}>
						<Section label="Final scores">
							<Scoreboard result={result} myId={myId ?? null} />
						</Section>
					</FadeSlideIn>
					<FadeSlideIn index={3}>
						<RoundTwo detail={detail} />
					</FadeSlideIn>
				</>
			) : null}
		</>
	)
}

/** Two digits, the way the micro-labels count. */
const pad = (n: number) => String(n).padStart(2, '0')

/** A mono label over a number that counts up on open: "KEPT TOGETHER / 12/14". */
function Stat({
	tone,
	label,
	value,
	of
}: {
	tone: CrewTone
	label: string
	value: number
	of?: number
}) {
	return (
		<View style={s.stat}>
			<OnFill tone={tone} muted variant="mono">
				{label}
			</OnFill>
			<View style={s.statValue}>
				<CountUp
					value={value}
					format={of === undefined ? pad : String}
					color={tone.onFill}
					variant="display"
				/>
				{of !== undefined ? (
					<Text variant="h1" tabular style={{ color: tone.onFillMuted }}>
						/{of}
					</Text>
				) : null}
			</View>
		</View>
	)
}

/** A block on paper: an ink rule, a mono label, then its content. */
function Section({ label, children }: { label: string; children: ReactNode }) {
	const c = useColors()
	return (
		<View style={[s.section, { borderTopColor: c.textPrimary }]}>
			<Text variant="mono" tone="secondary">
				{label}
			</Text>
			{children}
		</View>
	)
}

/** R25: the card, through the share sheet: the moment the group chat sees. */
function ShareResult({ pactId, name }: { pactId: string; name: string }) {
	const { showToast } = useToast()
	const [sharing, setSharing] = useState(false)
	return (
		<Button
			label="Share the results"
			variant="secondary"
			size="lg"
			fullWidth
			loading={sharing}
			icon={(color) => <Share size={18} color={color} strokeWidth={1.8} />}
			onPress={async () => {
				setSharing(true)
				try {
					const method = await shareResult(pactId, name)
					if (method) track('pact_result_shared', { pact_id: pactId, method })
				} catch (error) {
					haptic.error()
					showToast(errorMessage(error), 'error')
				} finally {
					setSharing(false)
				}
			}}
		/>
	)
}

/** Round 2: the same crew, the same habit, from tomorrow. */
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
				icon={(color) => <Repeat size={18} color={color} strokeWidth={1.8} />}
				onPress={() => {
					track('pact_rematch_started', { pact_id: detail.pact.id })
					rematch.mutate(undefined, {
						onSuccess: ({ pact, created }) => {
							haptic.success()
							showToast(
								created
									? 'Round 2 is on. Day 1 is tomorrow.'
									: 'Your crew already started round 2. You’re in.',
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
	stats: {
		flexDirection: 'row',
		gap: 32,
		paddingTop: 16,
		borderTopWidth: StyleSheet.hairlineWidth
	},
	stat: { gap: 4 },
	statValue: { flexDirection: 'row', alignItems: 'baseline' },
	section: { borderTopWidth: StyleSheet.hairlineWidth * 2, paddingTop: 12, gap: 4 },
	roundTwo: { gap: 8 },
	center: { textAlign: 'center' }
})
