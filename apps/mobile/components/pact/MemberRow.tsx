import { StyleSheet, View } from 'react-native'
import { TriangleAlert } from 'lucide-react-native'
import type { TodayBoard } from '@app/contract'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { getInitials } from '@/lib/utils'
import { Ring } from './Ring'
import { StateChip } from './StateChip'

type BoardMember = TodayBoard['members'][number]

const STATE_CHIP = {
	in: { label: 'In', tone: 'success' },
	saver: { label: 'Saver', tone: 'info' },
	out: { label: 'Not yet', tone: 'warning' }
} as const

/**
 * A member on today's board: their small ring (full once they're in), their state, and the AI's
 * caption. A suspicious check-in shows its flag and the reason to everyone (R15).
 */
export function MemberRow({ member, isMe }: { member: BoardMember; isMe: boolean }) {
	const c = useColors()
	const name = member.display_name?.trim() || 'A member'
	const checkIn = member.check_in
	const suspicious = checkIn?.verdict === 'suspicious'
	return (
		<View style={s.row}>
			<Ring
				value={member.state === 'out' ? 0 : 1}
				max={1}
				size={44}
				stroke={4}
				color={member.state === 'saver' ? c.info : c.brandFill}
				track={c.tintTrack}
			>
				<Text variant="label" tone="secondary">
					{getInitials(name)}
				</Text>
			</Ring>
			<View style={s.body}>
				<View style={s.top}>
					<Text variant="label" numberOfLines={1} style={s.name}>
						{isMe ? `${name} (you)` : name}
					</Text>
					<StateChip label={STATE_CHIP[member.state].label} tone={STATE_CHIP[member.state].tone} />
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

const s = StyleSheet.create({
	row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10 },
	body: { flex: 1, gap: 4, paddingTop: 2 },
	top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	name: { flex: 1 },
	caption: { fontStyle: 'italic' },
	flag: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
	flagText: { flex: 1 }
})
