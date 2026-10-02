import { StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'

const DAYS_EACH_SIDE = 3

/** The brief's horizontal week: three days either side of today, today as a dark pill. */
export function WeekStrip({ today = new Date() }: { today?: Date }) {
	const c = useColors()
	const days = Array.from({ length: DAYS_EACH_SIDE * 2 + 1 }, (_, i) => {
		const day = new Date(today)
		day.setDate(today.getDate() + i - DAYS_EACH_SIDE)
		return day
	})
	return (
		<View style={s.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
			{days.map((day, i) => {
				const isToday = i === DAYS_EACH_SIDE
				return (
					<View key={day.toDateString()} style={[s.day, isToday && { backgroundColor: c.hero }]}>
						<Text
							variant="caption"
							style={[s.weekday, { color: isToday ? c.heroTextSecondary : c.textTertiary }]}
						>
							{day.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2).toUpperCase()}
						</Text>
						<Text variant="label" tabular style={{ color: isToday ? c.heroText : c.textSecondary }}>
							{day.getDate()}
						</Text>
					</View>
				)
			})}
		</View>
	)
}

const s = StyleSheet.create({
	row: { flexDirection: 'row', justifyContent: 'space-between' },
	day: {
		width: 42,
		paddingVertical: 10,
		borderRadius: 999,
		alignItems: 'center',
		gap: 4
	},
	weekday: { fontSize: 11, letterSpacing: 0.4 }
})
