import { StyleSheet, View } from 'react-native'
import { awardOf, joinNames, type PactResult } from '@app/contract'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { Pop } from '@/components/motion/Pop'
import { displayName } from '@/components/pact/Avatars'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { crewTone } from '@/lib/crew'

/**
 * The awards, one card each: the emoji on the crew's wash, what it's for, and who earned it.
 * Every award is earned from real check-ins (the server's results.ts); an award this build
 * doesn't know is skipped.
 */
export function Awards({
	result,
	color,
	myId,
	base = 0
}: {
	result: PactResult
	color: string
	myId: string | null
	/** Where this group starts in the screen's entrance stagger. */
	base?: number
}) {
	const { colors: c, elevation } = useTheme()
	const tone = crewTone(c, color)
	const members = new Map(result.members.map((m) => [m.user_id, m]))
	const cards = result.awards.flatMap((award) => {
		const meta = awardOf(award.kind)
		if (!meta) return []
		// You first: "You and Cleo", never "Cleo and You".
		const winners = award.user_ids
			.map((id) => members.get(id))
			.filter((m) => m !== undefined)
			.sort((a, b) => Number(b.user_id === myId) - Number(a.user_id === myId))
		if (winners.length === 0) return []
		const names = winners.map((m) => (m.user_id === myId ? 'You' : displayName(m)))
		const blurb =
			award.kind === 'iron_streak'
				? `${winners[0].best_streak} days in a row, no breaks`
				: meta.blurb
		return [{ kind: award.kind, ...meta, blurb, names }]
	})
	if (cards.length === 0) return null

	return (
		<View style={s.list}>
			{cards.map((card, i) => (
				<FadeSlideIn key={card.kind} index={base + i}>
					<Card padding="normal" style={[s.card, elevation.card]}>
						<Pop delay={120 + i * 60}>
							<View style={[s.medal, { backgroundColor: tone.dim }]}>
								<Text style={s.emoji}>{card.emoji}</Text>
							</View>
						</Pop>
						<View style={s.text}>
							<Text variant="eyebrow" style={{ color: tone.ink }}>
								{card.title}
							</Text>
							<Text variant="h3">{joinNames(card.names)}</Text>
							<Text variant="caption" tone="secondary">
								{card.blurb}
							</Text>
						</View>
					</Card>
				</FadeSlideIn>
			))}
		</View>
	)
}

const MEDAL = 52

const s = StyleSheet.create({
	list: { gap: 10 },
	card: { flexDirection: 'row', alignItems: 'center', gap: 14 },
	medal: {
		width: MEDAL,
		height: MEDAL,
		borderRadius: MEDAL / 2,
		alignItems: 'center',
		justifyContent: 'center'
	},
	emoji: { fontSize: 28, lineHeight: 34 },
	text: { flex: 1, gap: 2 }
})
