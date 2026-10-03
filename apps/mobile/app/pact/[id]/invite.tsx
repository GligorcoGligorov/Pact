import { Share, StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SearchX, Share2 } from 'lucide-react-native'
import { CrewGrid } from '@/components/pact/CrewGrid'
import { HowItWorks } from '@/components/pact/HowItWorks'
import { QueryErrorState } from '@/components/QueryError'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader, ScreenTitle } from '@/components/ui/PageHeader'
import { Screen } from '@/components/ui/Screen'
import { CardSkeleton } from '@/components/ui/Skeleton'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { track } from '@/lib/analytics'
import { log } from '@/lib/logger'
import { useMyUserId, usePact } from '@/lib/pacts'

/**
 * The invite: the pact's code, big, and the system share sheet. The share sheet carries iOS's
 * own Copy, and the code is selectable, so there is no separate copy button (expo-clipboard is
 * native, and this slice ships without a new build).
 */
export default function InviteScreen() {
	const { elevation } = useTheme()
	const { id } = useLocalSearchParams<{ id: string }>()
	const query = usePact(id)
	const pact = query.data?.pact
	const crew = (query.data?.members ?? []).filter((m) => !m.left_day)
	const { data: myId } = useMyUserId()

	async function share() {
		if (!pact) return
		try {
			const result = await Share.share({
				message: `Join my pact "${pact.name}" on Pact: ${pact.habit}, every day. Open pact://join/${pact.invite_code} or enter the code ${pact.invite_code}.`
			})
			if (result.action === Share.sharedAction) {
				track('invite_shared', { pact_id: pact.id, method: 'share_sheet' })
			}
		} catch (error) {
			log.warn('Invite share failed', { error })
		}
	}

	function done() {
		router.replace(`/pact/${id}`)
	}

	return (
		<Screen
			header={<PageHeader backIcon="close" onBack={done} />}
			gap={22}
			footer={
				pact ? (
					<View style={s.footer}>
						<Button
							label="Share invite"
							size="lg"
							fullWidth
							icon={(color) => <Share2 size={18} color={color} />}
							onPress={share}
						/>
						<Button label="Go to the pact" variant="ghost" fullWidth onPress={done} />
					</View>
				) : undefined
			}
		>
			{query.data === undefined && query.isError ? (
				<QueryErrorState
					error={query.error}
					title="Couldn't load the invite"
					onRetry={() => query.refetch()}
				/>
			) : query.data === undefined ? (
				<CardSkeleton height={220} />
			) : query.data === null || !pact ? (
				<EmptyState
					icon={SearchX}
					title="This pact is gone"
					body="It may have been cancelled, or you're no longer in it."
					action={{ label: 'Back home', onPress: () => router.replace('/') }}
				/>
			) : (
				<>
					<ScreenTitle
						variant="display"
						eyebrow={pact.name}
						title="Bring your people"
						subtitle="A pact needs at least two. Send them the code; up to 8 can join."
					/>
					<FadeSlideIn index={1}>
						<Card padding="spacious" style={[s.codeCard, elevation.card]}>
							<Text variant="eyebrow" tone="tertiary">
								Invite code
							</Text>
							<Text
								selectable
								variant="displayHero"
								tabular
								style={s.code}
								accessibilityLabel={`Invite code ${pact.invite_code.split('').join(' ')}`}
							>
								{pact.invite_code}
							</Text>
							<Text variant="bodySm" tone="brand">
								{pact.habit}
							</Text>
						</Card>
					</FadeSlideIn>
					<FadeSlideIn index={2} style={s.section}>
						<Text variant="label" tone="secondary">
							{crew.length === 1
								? 'Just you so far'
								: `${crew.length} of ${pact.max_members} in so far`}
						</Text>
						<CrewGrid members={crew} myId={myId ?? null} />
					</FadeSlideIn>
					<FadeSlideIn index={3}>
						<HowItWorks />
					</FadeSlideIn>
				</>
			)}
		</Screen>
	)
}

const s = StyleSheet.create({
	footer: { gap: 6 },
	codeCard: { alignItems: 'center', gap: 10, paddingVertical: 36 },
	code: { letterSpacing: 6 },
	section: { gap: 12 }
})
