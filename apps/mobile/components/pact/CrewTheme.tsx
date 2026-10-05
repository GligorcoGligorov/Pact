import { StyleSheet, View } from 'react-native'
import { HIT_TARGET } from '@app/brand'
import { PACT_COLORS, PACT_EMOJIS, type PactColor, type PactEmoji } from '@app/contract'
import { Pop } from '@/components/motion/Pop'
import { PressableScale } from '@/components/motion/PressableScale'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { CREW_COLOR_LABELS, crewEmoji, crewTone } from '@/lib/crew'

/** The crew's mark: its emoji on its colour. On the hero, the home card and the picker. */
export function CrewBadge({
	color,
	emoji,
	size = 44,
	onFill = false
}: {
	color: string
	emoji: string
	size?: number
	/** On the crew's own colour (its hero): the badge sits on the surface instead. */
	onFill?: boolean
}) {
	const c = useColors()
	const tone = crewTone(c, color)
	return (
		<View
			style={[
				s.badge,
				{
					width: size,
					height: size,
					borderRadius: size / 2,
					backgroundColor: onFill ? c.surface : tone.fill
				}
			]}
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
		>
			<Text style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}>{crewEmoji(emoji)}</Text>
		</View>
	)
}

/**
 * The create screen's crew picker: a preview badge, the colour swatches and the emoji grid.
 * It starts from the theme suggested by the habit; the parent decides when a choice sticks.
 */
export function CrewThemePicker({
	color,
	emoji,
	onColor,
	onEmoji
}: {
	color: PactColor
	emoji: PactEmoji
	onColor: (color: PactColor) => void
	onEmoji: (emoji: PactEmoji) => void
}) {
	const c = useColors()
	return (
		<View style={s.picker}>
			<View style={s.preview}>
				{/* Keyed, so each new pick lands with a pop. */}
				<Pop key={`${color}${emoji}`}>
					<CrewBadge color={color} emoji={emoji} size={64} />
				</Pop>
				<Text variant="bodySm" tone="secondary" style={s.previewText}>
					Your crew&apos;s colour and mark, on everything that&apos;s theirs.
				</Text>
			</View>

			<View style={s.row} accessibilityRole="radiogroup" accessibilityLabel="Crew colour">
				{PACT_COLORS.map((key) => {
					const selected = key === color
					return (
						<PressableScale
							key={key}
							haptic="select"
							onPress={() => onColor(key)}
							accessibilityRole="radio"
							accessibilityLabel={CREW_COLOR_LABELS[key]}
							accessibilityState={{ selected }}
							style={[s.swatchHit, selected && { borderColor: c.textPrimary }]}
						>
							<View style={[s.swatch, { backgroundColor: c.crew[key].fill }]} />
						</PressableScale>
					)
				})}
			</View>

			<View style={s.grid} accessibilityRole="radiogroup" accessibilityLabel="Crew emoji">
				{PACT_EMOJIS.map((key) => {
					const selected = key === emoji
					return (
						<PressableScale
							key={key}
							haptic="select"
							onPress={() => onEmoji(key)}
							accessibilityRole="radio"
							accessibilityLabel={key}
							accessibilityState={{ selected }}
							style={[
								s.emojiHit,
								selected && {
									backgroundColor: crewTone(c, color).dim,
									borderColor: crewTone(c, color).ink
								}
							]}
						>
							<Text style={s.emoji}>{key}</Text>
						</PressableScale>
					)
				})}
			</View>
		</View>
	)
}

const SWATCH = 30

const s = StyleSheet.create({
	badge: { alignItems: 'center', justifyContent: 'center' },
	picker: { gap: 16 },
	preview: { flexDirection: 'row', alignItems: 'center', gap: 14 },
	previewText: { flex: 1 },
	row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
	swatchHit: {
		width: HIT_TARGET,
		height: HIT_TARGET,
		borderRadius: HIT_TARGET / 2,
		borderWidth: 2,
		borderColor: 'transparent',
		alignItems: 'center',
		justifyContent: 'center'
	},
	swatch: { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2 },
	grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
	emojiHit: {
		width: HIT_TARGET,
		height: HIT_TARGET,
		borderRadius: 14,
		borderWidth: 1.5,
		borderColor: 'transparent',
		alignItems: 'center',
		justifyContent: 'center'
	},
	emoji: { fontSize: 22, lineHeight: 28 }
})
