import { ActivityIndicator, StyleSheet, View } from 'react-native'
import type { TodayBoard } from '@app/contract'
import { PressableScale } from '@/components/motion/PressableScale'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'

type BoardMember = TodayBoard['members'][number]

export type NudgeControl = { sent: boolean; sending: boolean; onPress: () => void }

/**
 * Under the wall: who today is still waiting on, each with a Nudge (R20), never yourself; and a
 * suspicious check-in's reason for the whole crew (R15). Nothing when everyone is in.
 */
export function Waiting({
	members,
	myId,
	nudgeFor
}: {
	members: BoardMember[]
	myId: string | null
	nudgeFor: (member: BoardMember) => NudgeControl
}) {
	const out = members.filter((m) => m.state === 'out')
	const flagged = members.filter((m) => m.check_in?.verdict === 'suspicious')
	if (out.length === 0 && flagged.length === 0) return null
	return (
		<View style={s.wrap}>
			{out.map((m) => {
				const me = m.user_id === myId
				const name = me ? 'You' : firstName(m)
				return (
					<View key={m.user_id} style={s.row}>
						<Text variant="mono" tone="secondary" style={s.flex}>
							Waiting on {name}
						</Text>
						{me ? null : <NudgeButton nudge={nudgeFor(m)} name={name} />}
					</View>
				)
			})}
			{flagged.map((m) => (
				<Text key={m.user_id} variant="bodySm" tone="warning">
					{firstName(m)}: {m.check_in?.ai_reason ?? 'The AI judge has doubts about this one.'}
				</Text>
			))}
		</View>
	)
}

function firstName(m: BoardMember): string {
	return m.display_name?.trim().split(/\s+/)[0] || 'A member'
}

/** A small outlined pill: "Nudge", a spinner while it sends, then "Nudged" for the rest of the day. */
function NudgeButton({ nudge, name }: { nudge: NudgeControl; name: string }) {
	const c = useColors()
	if (nudge.sent) {
		return (
			<Text variant="mono" tone="tertiary" accessibilityLabel={`${name} nudged`}>
				Nudged
			</Text>
		)
	}
	return (
		<PressableScale
			scaleTo="button"
			haptic="press"
			disabled={nudge.sending}
			onPress={nudge.onPress}
			accessibilityRole="button"
			accessibilityLabel={`Nudge ${name}`}
			hitSlop={10}
			style={[s.nudge, { borderColor: c.textPrimary }]}
		>
			{nudge.sending ? <ActivityIndicator size="small" color={c.textPrimary} /> : null}
			<Text variant="mono">Nudge</Text>
		</PressableScale>
	)
}

const s = StyleSheet.create({
	wrap: { gap: 10 },
	row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	flex: { flex: 1 },
	nudge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth * 2
	}
})
