import { useEffect, useState } from 'react'
// The system font, not the brand's: the brief wants thin numerals, and the bundled faces start
// at 400. SF Pro has a true ultralight.
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'

const TICK_MS = 15_000

/** The time left until `closesAt`, as hours and minutes. */
export function timeLeft(closesAt: string, now = Date.now()): { hours: number; minutes: number } {
	const ms = Math.max(Date.parse(closesAt) - now, 0)
	const totalMinutes = Math.ceil(ms / 60_000)
	return { hours: Math.floor(totalMinutes / 60), minutes: totalMinutes % 60 }
}

/** The brief's giant, thin countdown: "2h 14m" until today closes. Ticks every 15 s. */
export function Countdown({
	closesAt,
	color,
	unitColor
}: {
	closesAt: string
	color: string
	unitColor: string
}) {
	const [now, setNow] = useState(Date.now())
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), TICK_MS)
		return () => clearInterval(timer)
	}, [])
	const { hours, minutes } = timeLeft(closesAt, now)
	const number: StyleProp<TextStyle> = [s.number, { color }]
	const unit: StyleProp<TextStyle> = [s.unit, { color: unitColor }]
	return (
		<View
			style={s.row}
			accessible
			accessibilityLabel={`${hours} hours ${minutes} minutes left today`}
		>
			{hours > 0 ? (
				<>
					<Text style={number}>{hours}</Text>
					<Text style={unit}>h</Text>
				</>
			) : null}
			<Text style={number}>{hours > 0 ? String(minutes).padStart(2, '0') : minutes}</Text>
			<Text style={unit}>m</Text>
		</View>
	)
}

const s = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
	number: {
		fontSize: 64,
		lineHeight: 70,
		fontWeight: '200',
		letterSpacing: -2,
		fontVariant: ['tabular-nums']
	},
	unit: { fontSize: 22, fontWeight: '400', marginRight: 10 }
})
