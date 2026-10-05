import { useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { CalendarDays, Lock, SearchX, Trophy, Users } from 'lucide-react-native'
import type { JoinSource } from '@app/contract'
import { CrewGrid } from '@/components/pact/CrewGrid'
import { HowItWorks } from '@/components/pact/HowItWorks'
import { QueryErrorState } from '@/components/QueryError'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Screen } from '@/components/ui/Screen'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { track } from '@/lib/analytics'
import { ApiError, errorMessage } from '@/lib/api'
import { haptic } from '@/lib/haptics'
import { shortDay, useInvite, useJoinPact, useMyUserId, type InviteDetail } from '@/lib/pacts'

type JoinFailure = 'not_found' | 'full' | 'closed' | 'network'

function joinFailure(error: unknown): JoinFailure {
	if (error instanceof ApiError) {
		if (error.code === 'pact_full') return 'full'
		if (error.code === 'pact_closed') return 'closed'
		if (error.code === 'not_found') return 'not_found'
	}
	return 'network'
}

/** Why an invite can't be joined, before anyone taps Join. */
function blocked(invite: InviteDetail): JoinFailure | null {
	if (invite.pact.status === 'completed' || invite.pact.status === 'cancelled') return 'closed'
	if (!invite.is_member && invite.member_count >= invite.max_members) return 'full'
	return null
}

const LATE_JOIN_NOTE =
	"It has already started, so you're in from tomorrow. Today can't break because of you."

const BLOCKED_COPY: Record<'full' | 'closed', { title: string; body: string }> = {
	full: { title: 'This pact is full', body: 'It already has 8 people. Ask them to start another.' },
	closed: {
		title: 'This pact is over',
		body: "It finished or was cancelled, so it can't take anyone new."
	}
}

/**
 * R5, R6: an invite's preview, then the join. Reached from the typed code (source `code`) or
 * from `pact://join/<code>` (source `deep_link`, the default).
 */
export default function JoinPreviewScreen() {
	const { colors: c, elevation } = useTheme()
	const params = useLocalSearchParams<{ code: string; source?: string }>()
	const code = (params.code ?? '').toUpperCase()
	const source: JoinSource = params.source === 'code' ? 'code' : 'deep_link'
	const invite = useInvite(code)
	const join = useJoinPact()
	const { data: myId } = useMyUserId()

	const viewed = useRef(false)
	useEffect(() => {
		if (viewed.current || invite.data === undefined) return
		viewed.current = true
		track('join_viewed', { source })
		const reason = invite.data === null ? 'not_found' : blocked(invite.data)
		if (reason) track('join_failed', { source, reason })
	}, [invite.data, source])

	function onJoin() {
		join.mutate(
			{ code, source },
			{
				onSuccess: ({ pact }) => {
					haptic.success()
					track('pact_joined', { source, pact_id: pact.id })
					router.replace(`/pact/${pact.id}`)
				},
				onError: (error) => {
					haptic.error()
					track('join_failed', { source, reason: joinFailure(error) })
				}
			}
		)
	}

	const data = invite.data
	const reason = data ? blocked(data) : null

	return (
		<Screen
			header={<PageHeader />}
			gap={20}
			footer={
				data && !reason ? (
					<View style={s.footer}>
						{join.isError ? (
							<Text variant="bodySm" tone="error" style={s.center}>
								{errorMessage(join.error)}
							</Text>
						) : null}
						{data.is_member ? (
							<Button
								label="Open the pact"
								size="lg"
								fullWidth
								onPress={() => router.replace(`/pact/${data.pact.id}`)}
							/>
						) : (
							<Button
								label="Join the pact"
								size="lg"
								fullWidth
								loading={join.isPending}
								onPress={onJoin}
							/>
						)}
					</View>
				) : undefined
			}
		>
			{data === undefined && invite.isError ? (
				<QueryErrorState
					error={invite.error}
					title="Couldn't load this invite"
					onRetry={() => invite.refetch()}
				/>
			) : data === undefined ? (
				<CardSkeleton height={260} />
			) : data === null ? (
				<EmptyState
					icon={SearchX}
					tone="error"
					emoji={['🕵️', '❓']}
					title="That code's a mystery"
					body={`No pact answers to${code ? ` ${code}` : ' it'}. Double-check with whoever sent it.`}
					action={{ label: 'Try another code', onPress: () => router.replace('/join') }}
				/>
			) : reason ? (
				<EmptyState
					icon={Lock}
					title={BLOCKED_COPY[reason === 'full' ? 'full' : 'closed'].title}
					body={BLOCKED_COPY[reason === 'full' ? 'full' : 'closed'].body}
					action={{ label: 'Back home', onPress: () => router.replace('/') }}
				/>
			) : (
				<FadeSlideIn index={0} style={s.stack}>
					<Card padding="spacious" style={[s.card, elevation.card]}>
						<Text variant="eyebrow" tone="tertiary">
							{data.is_member ? "You're in this pact" : "You're invited to"}
						</Text>
						<Text variant="display">{data.pact.name}</Text>
						<Text variant="lead" tone="brand">
							{data.pact.habit}
							{data.pact.cadence === 'weekdays' ? ', every weekday' : ', every day'}
						</Text>
						<View style={s.facts}>
							<Fact
								icon={<CalendarDays size={16} color={c.textTertiary} />}
								text={`${shortDay(data.pact.start_day)} – ${shortDay(data.pact.end_day)}`}
							/>
							<Fact
								icon={<Users size={16} color={c.textTertiary} />}
								text={`${data.member_count} of ${data.max_members} in`}
							/>
							{data.pact.stake ? (
								<Fact
									icon={<Trophy size={16} color={c.textTertiary} />}
									text={`Stake: ${data.pact.stake}`}
								/>
							) : null}
						</View>
						{data.pact.status === 'active' && !data.is_member ? (
							<Text variant="bodySm" tone="secondary">
								{LATE_JOIN_NOTE}
							</Text>
						) : null}
					</Card>
					{data.members.length > 0 ? (
						<View style={s.section}>
							<Text variant="label" tone="secondary">
								{data.is_member ? 'Your crew' : "Who's in"}
							</Text>
							<CrewGrid members={data.members} myId={myId ?? null} />
						</View>
					) : null}
					<HowItWorks />
				</FadeSlideIn>
			)}
		</Screen>
	)
}

function Fact({ icon, text }: { icon: React.ReactNode; text: string }) {
	return (
		<View style={s.fact}>
			{icon}
			<Text variant="bodySm" tone="body">
				{text}
			</Text>
		</View>
	)
}

const s = StyleSheet.create({
	stack: { gap: 22 },
	section: { gap: 12 },
	card: { gap: 10 },
	facts: { gap: 8, marginTop: 8 },
	fact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	footer: { gap: 10 },
	center: { textAlign: 'center' }
})
