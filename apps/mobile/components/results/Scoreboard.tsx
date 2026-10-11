import { StyleSheet, View } from 'react-native'
import { awardOf, type PactResult } from '@app/contract'
import { displayName } from '@/components/pact/Avatars'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'

/**
 * Everyone's final record, best first, as hairline rows: the name, "12 / 14 · BEST 06" in mono,
 * their awards by name, and "PAYS" on whoever owes the stake. Shown after the reveal, so it
 * never spoils it.
 */
export function Scoreboard({ result, myId }: { result: PactResult; myId: string | null }) {
	const c = useColors()
	const pad = (n: number) => String(n).padStart(2, '0')
	const ranked = [...result.members].sort(
		(a, b) => b.days_done * a.days_held - a.days_done * b.days_held || b.best_streak - a.best_streak
	)
	return (
		<View>
			{ranked.map((m, i) => {
				const awards = m.awards.map((k) => awardOf(k)?.title).filter(Boolean)
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
						<Text variant="mono" tone="tertiary" style={s.rank}>
							{pad(i + 1)}
						</Text>
						<View style={s.text}>
							<Text variant="label" numberOfLines={1}>
								{displayName(m)}
								{m.user_id === myId ? ' (you)' : ''}
							</Text>
							<Text variant="mono" tone="secondary">
								{pad(m.days_done)} / {pad(m.days_held)} · best {pad(m.best_streak)}
								{m.saver_used ? ' · saver' : ''}
							</Text>
							{awards.length > 0 ? (
								<Text variant="caption" tone="tertiary" numberOfLines={1}>
									{awards.join(', ')}
								</Text>
							) : null}
						</View>
						{m.is_loser ? (
							<Text variant="mono" tone="warning">
								Pays
							</Text>
						) : null}
					</View>
				)
			})}
		</View>
	)
}

const s = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
	rank: { width: 20, paddingTop: 3 },
	text: { flex: 1, gap: 2 }
})
