import { useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Hourglass, Repeat, SearchX } from 'lucide-react-native'
import { QueryErrorState } from '@/components/QueryError'
import { Stories } from '@/components/results/Stories'
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
import { goBack } from '@/lib/nav'
import { useMyUserId, usePact, useWall } from '@/lib/pacts'
import { usePactResult, useRematch, type PactResultDetail } from '@/lib/results'

/** Pacts whose reveal this person has already seen in this app session: no second drumroll. */
const revealed = new Set<string>()

/**
 * R24: the end of a pact, the moment a crew screenshots, as stories you tap through: the whole
 * wall, the awards, the drumroll, who pays, and the signed pact with round 2 in one tap.
 */
export default function PactResultScreen() {
	const { id } = useLocalSearchParams<{ id: string }>()
	const query = usePactResult(id)
	const data = query.data

	if (data && data !== 'not_finished') return <Results detail={data} />

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
						body="The results land the day after the last day. Keep the wall full till then."
						action={{ label: 'Back to the pact', onPress: () => router.replace(`/pact/${id}`) }}
					/>
				) : null}
			</Screen>
		</View>
	)
}

function Results({ detail }: { detail: PactResultDetail }) {
	const c = useColors()
	const { pact, result } = detail
	const { data: myId } = useMyUserId()
	const members = usePact(pact.id)
	const wall = useWall(pact.id)
	const viewed = useRef(false)

	useEffect(() => {
		if (viewed.current) return
		viewed.current = true
		track('pact_result_viewed', { pact_id: pact.id })
	}, [pact.id])

	return (
		<Stories
			detail={detail}
			pact={members.data ?? null}
			wall={wall.data ?? null}
			tone={crewTone(c, pact.color)}
			myId={myId ?? null}
			startRevealed={revealed.has(pact.id)}
			onRevealed={() => {
				revealed.add(pact.id)
				track('pact_result_revealed', { pact_id: pact.id, outcome: result.outcome })
			}}
			onClose={goBack}
			roundTwo={<RoundTwo detail={detail} ink={crewTone(c, pact.color).onFillMuted} />}
		/>
	)
}

/** Round 2: the same crew, the same habit, from tomorrow. */
function RoundTwo({ detail, ink }: { detail: PactResultDetail; ink?: string }) {
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
			<Text variant="caption" tone="secondary" style={[s.center, ink ? { color: ink } : null]}>
				Same habit, same crew, same stakes. Everyone&apos;s in, starting tomorrow.
			</Text>
		</View>
	)
}

const s = StyleSheet.create({
	root: { flex: 1 },
	roundTwo: { gap: 8 },
	center: { textAlign: 'center' }
})
