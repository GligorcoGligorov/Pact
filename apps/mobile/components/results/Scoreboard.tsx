import { StyleSheet, View } from 'react-native'
import { awardOf, type PactResult } from '@app/contract'
import { Avatar, displayName } from '@/components/pact/Avatars'
import { StateChip } from '@/components/pact/StateChip'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'

/**
 * Everyone's final record, best first: days done out of days held, their own best run, the
 * saver if they used it, their award emoji, and a small "pays" chip on whoever owes the stake.
 * Shown after the reveal, so it never spoils it.
 */
export function Scoreboard({ result, myId }: { result: PactResult; myId: string | null }) {
	const c = useColors()
	const ranked = [...result.members].sort(
		(a, b) => b.days_done * a.days_held - a.days_done * b.days_held || b.best_streak - a.best_streak
	)
	return (
		<Card padding="compact">
			{ranked.map((m, i) => {
				const emoji = m.awards.map((k) => awardOf(k)?.emoji).filter(Boolean)
				const me = m.user_id === myId
				return (
					<View
						key={m.user_id}
						style={[
							s.row,
							i > 0 && {
								borderTopWidth: StyleSheet.hairlineWidth,
								borderTopColor: c.borderHairline
							}
						]}
					>
						<Avatar userId={m.user_id} name={displayName(m)} size={40} />
						<View style={s.text}>
							<Text variant="label" numberOfLines={1}>
								{displayName(m)}
								{me ? ' (you)' : ''}
							</Text>
							<Text variant="caption" tone="secondary" tabular>
								{m.days_done} of {m.days_held} days · best run {m.best_streak}
								{m.saver_used ? ' · 🛟' : ''}
							</Text>
						</View>
						{emoji.length > 0 ? (
							<Text style={s.emoji} accessibilityElementsHidden>
								{emoji.join('')}
							</Text>
						) : null}
						{m.is_loser ? <StateChip label="Pays" tone="warning" /> : null}
					</View>
				)
			})}
		</Card>
	)
}

const s = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
	text: { flex: 1, gap: 1 },
	emoji: { fontSize: 18, lineHeight: 24 }
})
