import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Check, Hand, TriangleAlert } from 'lucide-react-native'
import type { TodayBoard } from '@app/contract'
import { PressableScale } from '@/components/motion/PressableScale'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { Avatar } from './Avatars'
import { StateChip } from './StateChip'

type BoardMember = TodayBoard['members'][number]

const STATE_CHIP = {
	in: { label: 'In', tone: 'success' },
	saver: { label: 'Saver', tone: 'info' },
	out: { label: 'Not yet', tone: 'warning' }
} as const

/**
 * A member on today's board: their avatar (checked once they're in), their state, and the AI's
 * caption. A suspicious check-in shows its flag and the reason to everyone (R15).
 */
export type NudgeControl = { sent: boolean; sending: boolean; onPress: () => void }

export function MemberRow({
	member,
	isMe,
	nudge
}: {
	member: BoardMember
	isMe: boolean
	/** R20: shown for a member who is still out today, never for yourself. */
	nudge?: NudgeControl
}) {
	const c = useColors()
	const name = member.display_name?.trim() || 'A member'
	const checkIn = member.check_in
	const suspicious = checkIn?.verdict === 'suspicious'
	return (
		<View style={s.row}>
			<Avatar userId={member.user_id} name={name} state={member.state} size={42} />
			<View style={s.body}>
				<View style={s.top}>
					<Text variant="label" numberOfLines={1} style={s.name}>
						{isMe ? `${name} (you)` : name}
					</Text>
					{nudge && member.state === 'out' && !isMe ? (
						<NudgeButton nudge={nudge} name={name} />
					) : (
						<StateChip
							label={STATE_CHIP[member.state].label}
							tone={STATE_CHIP[member.state].tone}
						/>
					)}
				</View>
				{checkIn?.ai_caption ? (
					<Text variant="bodySm" tone="secondary" numberOfLines={2} style={s.caption}>
						“{checkIn.ai_caption}”
					</Text>
				) : null}
				{suspicious ? (
					<View style={s.flag}>
						<TriangleAlert size={14} color={c.warningText} />
						<Text variant="caption" tone="warning" style={s.flagText}>
							{checkIn?.ai_reason ?? 'The AI judge has doubts about this one.'}
						</Text>
					</View>
				) : null}
			</View>
		</View>
	)
}

/** A small pill: "Nudge", a spinner while it sends, then "Nudged" for the rest of the day. */
function NudgeButton({ nudge, name }: { nudge: NudgeControl; name: string }) {
	const c = useColors()
	if (nudge.sent) {
		return (
			<View
				style={[s.nudge, { backgroundColor: c.surface2 }]}
				accessibilityLabel={`${name} nudged`}
			>
				<Check size={14} color={c.textTertiary} strokeWidth={3} />
				<Text variant="caption" tone="tertiary" style={s.nudgeText}>
					Nudged
				</Text>
			</View>
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
			style={[s.nudge, { backgroundColor: c.brandFill }]}
		>
			{nudge.sending ? (
				<ActivityIndicator size="small" color={c.onBrand} />
			) : (
				<Hand size={14} color={c.onBrand} strokeWidth={2.4} />
			)}
			<Text variant="caption" style={[s.nudgeText, { color: c.onBrand }]}>
				Nudge
			</Text>
		</PressableScale>
	)
}

const s = StyleSheet.create({
	row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10 },
	body: { flex: 1, gap: 4, paddingTop: 2 },
	top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	name: { flex: 1 },
	caption: { fontStyle: 'italic' },
	flag: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
	flagText: { flex: 1 },
	nudge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 999
	},
	nudgeText: { fontWeight: '700' }
})
