import { StyleSheet, View } from 'react-native'
import { awardOf, joinNames, type PactResult } from '@app/contract'
import { FadeSlideIn } from '@/components/motion/FadeSlideIn'
import { displayName } from '@/components/pact/Avatars'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'

/**
 * The awards as a numbered list on paper, one hairline row each: "01 / IRON STREAK" in mono,
 * who earned it, and what for. Every award is earned from real check-ins (the server's
 * results.ts); an award this build doesn't know is skipped.
 */
export function Awards({
	result,
	myId,
	base = 0
}: {
	result: PactResult
	myId: string | null
	/** Where this group starts in the screen's entrance stagger. */
	base?: number
}) {
	const c = useColors()
	const members = new Map(result.members.map((m) => [m.user_id, m]))
	const rows = result.awards.flatMap((award) => {
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
		return [{ kind: award.kind, title: meta.title, blurb, names }]
	})
	if (rows.length === 0) return null

	return (
		<View>
			{rows.map((row, i) => (
				<FadeSlideIn key={row.kind} index={base + i}>
					<View
						style={[
							s.row,
							i > 0 && {
								borderTopColor: c.borderHairline,
								borderTopWidth: StyleSheet.hairlineWidth
							}
						]}
					>
						<Text variant="mono" tone="tertiary">
							{String(i + 1).padStart(2, '0')} / {row.title}
						</Text>
						<Text variant="h2">{joinNames(row.names)}</Text>
						<Text variant="bodySm" tone="secondary">
							{row.blurb}
						</Text>
					</View>
				</FadeSlideIn>
			))}
		</View>
	)
}

const s = StyleSheet.create({
	row: { gap: 4, paddingVertical: 14 }
})
