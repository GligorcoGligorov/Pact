import { StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'

export type ChipTone = 'success' | 'warning' | 'info' | 'error' | 'neutral' | 'brand'

/** The small status pill of the brief's habit cards: New / Skip / Done, here To do / Done / … */
export function StateChip({ label, tone }: { label: string; tone: ChipTone }) {
	const c = useColors()
	const look = {
		success: { bg: c.successSoft, fg: c.successText, dot: c.success },
		warning: { bg: c.warningSoft, fg: c.warningText, dot: c.warning },
		info: { bg: c.infoSoft, fg: c.infoText, dot: c.info },
		error: { bg: c.errorSoft, fg: c.errorText, dot: c.error },
		neutral: { bg: c.surface3, fg: c.textSecondary, dot: c.textTertiary },
		brand: { bg: c.brandDim, fg: c.brandInk, dot: c.brandFill }
	}[tone]
	return (
		<View style={[s.chip, { backgroundColor: look.bg }]}>
			<View style={[s.dot, { backgroundColor: look.dot }]} />
			<Text variant="caption" style={[s.label, { color: look.fg }]}>
				{label}
			</Text>
		</View>
	)
}

const s = StyleSheet.create({
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		alignSelf: 'flex-start'
	},
	dot: { width: 6, height: 6, borderRadius: 3 },
	label: { fontWeight: '600' }
})
