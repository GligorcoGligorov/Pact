import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { LogOut, SearchX, UserMinus } from 'lucide-react-native'
import type { PactMember } from '@app/contract'
import { Avatar, displayName } from '@/components/pact/Avatars'
import { Signature } from '@/components/sign/Signature'
import { QueryErrorState } from '@/components/QueryError'
import { PressableScale } from '@/components/motion/PressableScale'
import { AlertModal } from '@/components/ui/AppModal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ListGroup, ListRow } from '@/components/ui/List'
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
import { shortDay, useLeavePact, useMyUserId, usePact, useRemoveMember } from '@/lib/pacts'

const first = (member: Pick<PactMember, 'display_name'>) => displayName(member).split(' ')[0]

/**
 * A pact's settings (R7, App Review 1.2): what the pact is, who is in it, removing a member if
 * you're the owner, and leaving it. Every destructive step asks first.
 */
export default function PactSettingsScreen() {
	const c = useColors()
	const { showToast } = useToast()
	const { id } = useLocalSearchParams<{ id: string }>()
	const query = usePact(id)
	const { data: myId } = useMyUserId()
	const leave = useLeavePact(id)
	const remove = useRemoveMember(id)
	const [confirm, setConfirm] = useState<
		{ kind: 'leave' } | { kind: 'remove'; member: PactMember } | null
	>(null)

	const detail = query.data
	const members = (detail?.members ?? []).filter((m) => !m.left_day)
	const isOwner = detail?.pact.role === 'owner'
	const nextOwner = members.find((m) => m.user_id !== myId)

	function doLeave() {
		setConfirm(null)
		leave.mutate(undefined, {
			onSuccess: () => {
				haptic.success()
				track('pact_left', { pact_id: id })
				showToast(`You left ${detail?.pact.name ?? 'the pact'}.`, 'success')
				router.replace('/')
			},
			onError: (error) => showToast(errorMessage(error), 'error')
		})
	}

	function doRemove(member: PactMember) {
		setConfirm(null)
		remove.mutate(member.user_id, {
			onSuccess: () => {
				haptic.success()
				track('pact_member_removed', { pact_id: id })
				showToast(`${first(member)} is out of the pact.`, 'success')
			},
			onError: (error) => showToast(errorMessage(error), 'error')
		})
	}

	return (
		<Screen
			header={<PageHeader />}
			gap={28}
			ground={detail ? crewTone(c, detail.pact.color).deep : undefined}
		>
			{detail === undefined && query.isError ? (
				<QueryErrorState
					error={query.error}
					title="Couldn't load this pact"
					onRetry={() => query.refetch()}
				/>
			) : detail === undefined ? (
				<>
					<CardSkeleton height={120} />
					<CardSkeleton height={220} />
				</>
			) : detail === null ? (
				<EmptyState
					icon={SearchX}
					title="This pact is gone"
					body="It may have been cancelled, or you're no longer in it."
					action={{ label: 'Back home', onPress: () => router.replace('/') }}
				/>
			) : (
				<>
					<View>
						<Text variant="mono" tone="secondary">
							The pact · {detail.pact.invite_code}
						</Text>
						<Text variant="display" accessibilityRole="header">
							{detail.pact.name}
						</Text>
						<Text variant="display" tone="tertiary">
							{detail.pact.habit}
						</Text>
					</View>

					<View style={[s.facts, { borderTopColor: c.textPrimary }]}>
						<Fact
							label="Runs"
							value={`${shortDay(detail.pact.start_day)} – ${shortDay(detail.pact.end_day)}`}
						/>
						<Fact
							label="How often"
							value={detail.pact.cadence === 'weekdays' ? 'Weekdays' : 'Every day'}
						/>
						<Fact label="Invite code" value={detail.pact.invite_code} />
						{detail.pact.stake ? <Fact label="The stake" value={detail.pact.stake} /> : null}
					</View>

					<View style={[s.facts, { borderTopColor: c.textPrimary }]}>
						<Text variant="mono" tone="secondary">
							The crew · {members.length}
						</Text>
						{members.map((member) => {
							const me = member.user_id === myId
							return (
								<View key={member.user_id} style={s.member}>
									<Avatar userId={member.user_id} name={displayName(member)} size={40} />
									<View style={s.name}>
										<Text variant="label" numberOfLines={1}>
											{displayName(member)}
											{me ? ' (you)' : ''}
										</Text>
										{member.signature ? (
											<Signature path={member.signature} ink={c.textPrimary} width={110} />
										) : me ? (
											<PressableScale
												scaleTo="button"
												onPress={() =>
													router.push({
														pathname: '/pact/[id]/sign',
														params: {
															id: detail.pact.id,
															source: 'join',
															next: `/pact/${detail.pact.id}/settings`
														}
													})
												}
												accessibilityRole="button"
											>
												<Text variant="mono" tone="brand">
													Not signed · sign now
												</Text>
											</PressableScale>
										) : (
											<Text variant="mono" tone="tertiary">
												Not signed
											</Text>
										)}
									</View>
									{member.role === 'owner' ? (
										<Text variant="mono" tone="secondary">
											Owner
										</Text>
									) : null}
									{isOwner && !me ? (
										<PressableScale
											scaleTo="button"
											haptic="warning"
											onPress={() => setConfirm({ kind: 'remove', member })}
											accessibilityRole="button"
											accessibilityLabel={`Remove ${displayName(member)}`}
											style={[s.remove, { borderColor: c.errorText }]}
										>
											<UserMinus size={16} color={c.errorText} />
										</PressableScale>
									) : null}
								</View>
							)
						})}
					</View>

					<ListGroup>
						<ListRow
							icon={LogOut}
							title="Leave pact"
							subtitle="Your days so far still count."
							destructive
							onPress={() => setConfirm({ kind: 'leave' })}
						/>
					</ListGroup>
				</>
			)}

			<AlertModal
				visible={confirm?.kind === 'leave'}
				title={`Leave ${detail?.pact.name ?? 'this pact'}?`}
				message={
					!isOwner
						? 'You won’t be held to it from today. Your days so far still count.'
						: nextOwner
							? `${first(nextOwner)} becomes the owner. Your days so far still count.`
							: 'You’re the last one in it, so leaving ends the pact.'
				}
				buttons={[
					{ text: 'Stay', style: 'cancel', onPress: () => setConfirm(null) },
					{ text: 'Leave', style: 'destructive', onPress: doLeave }
				]}
				onDismiss={() => setConfirm(null)}
			/>
			<AlertModal
				visible={confirm?.kind === 'remove'}
				title={confirm?.kind === 'remove' ? `Remove ${first(confirm.member)}?` : ''}
				message="They won’t be held to the pact from today. Their days so far still count."
				buttons={[
					{ text: 'Cancel', style: 'cancel', onPress: () => setConfirm(null) },
					{
						text: 'Remove',
						style: 'destructive',
						onPress: () => confirm?.kind === 'remove' && doRemove(confirm.member)
					}
				]}
				onDismiss={() => setConfirm(null)}
			/>
		</Screen>
	)
}

function Fact({ label, value }: { label: string; value: string }) {
	return (
		<View style={s.fact}>
			<Text variant="mono" tone="secondary">
				{label}
			</Text>
			<Text variant="label" style={s.factValue} numberOfLines={2}>
				{value}
			</Text>
		</View>
	)
}

const s = StyleSheet.create({
	facts: { gap: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth * 2 },
	fact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
	factValue: { flexShrink: 1, textAlign: 'right' },
	member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
	name: { flex: 1 },
	remove: {
		width: 36,
		height: 36,
		borderRadius: 18,
		borderWidth: 1.5,
		alignItems: 'center',
		justifyContent: 'center'
	}
})
