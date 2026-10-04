import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { PressableScale } from '@/components/motion/PressableScale'
import { InlineQueryError } from '@/components/QueryError'
import { Section } from '@/components/ui/List'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { errorMessage } from '@/lib/api'
import { haptic } from '@/lib/haptics'
import { useBlockedPeople, useUnblockUser } from '@/lib/pacts'
import { Avatar, displayName } from './Avatars'

/** Settings → Blocked people: everyone you've blocked, each with Unblock (App Review 1.2). */
export function BlockedPeople() {
	const c = useColors()
	const { showToast } = useToast()
	const blocked = useBlockedPeople()
	const unblock = useUnblockUser()

	return (
		<Section
			title="Blocked people"
			footnote="Blocked people don't see your check-ins, and you don't see theirs. Block someone from the ⋯ on their check-in in Activity."
		>
			{blocked.data === undefined && blocked.isError ? (
				<View style={s.pad}>
					<InlineQueryError error={blocked.error} onRetry={() => blocked.refetch()} />
				</View>
			) : blocked.data === undefined ? (
				<View style={s.pad}>
					<ActivityIndicator color={c.textTertiary} />
				</View>
			) : blocked.data.length === 0 ? (
				<Text variant="bodySm" tone="secondary" style={s.pad}>
					Nobody. You haven&apos;t blocked anyone.
				</Text>
			) : (
				blocked.data.map((person) => {
					const name = displayName(person)
					const busy = unblock.isPending && unblock.variables === person.user_id
					return (
						<View key={person.user_id} style={s.row}>
							<Avatar userId={person.user_id} name={name} size={36} />
							<Text variant="label" numberOfLines={1} style={s.name}>
								{name}
							</Text>
							<PressableScale
								scaleTo="button"
								haptic="select"
								disabled={busy}
								onPress={() =>
									unblock.mutate(person.user_id, {
										onSuccess: () => {
											haptic.success()
											showToast(`${name.split(' ')[0]} is unblocked.`, 'success')
										},
										onError: (error) => showToast(errorMessage(error), 'error')
									})
								}
								accessibilityRole="button"
								accessibilityLabel={`Unblock ${name}`}
								style={[s.unblock, { backgroundColor: c.surface2, borderColor: c.borderSoft }]}
							>
								{busy ? (
									<ActivityIndicator size="small" color={c.textSecondary} />
								) : (
									<Text variant="caption" tone="secondary" style={s.unblockText}>
										Unblock
									</Text>
								)}
							</PressableScale>
						</View>
					)
				})
			)}
		</Section>
	)
}

const s = StyleSheet.create({
	pad: { paddingHorizontal: 16, paddingVertical: 14 },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 14,
		paddingVertical: 10
	},
	name: { flex: 1 },
	unblock: {
		minWidth: 84,
		minHeight: 34,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 14,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth
	},
	unblockText: { fontWeight: '700' }
})
