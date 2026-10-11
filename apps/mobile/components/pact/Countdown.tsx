import { useEffect, useState } from 'react'
// The system font, not the brand's: the brief wants thin numerals, and the bundled faces start
// at 400. SF Pro has a true ultralight.
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'
import { Text as BrandText } from '@/components/ui/Text'

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

/** "05:59:12", zero-padded hours, minutes and seconds left until `closesAt`. */
export function clockLeft(closesAt: string, now = Date.now()): string {
	const total = Math.max(Math.floor((Date.parse(closesAt) - now) / 1000), 0)
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${pad(Math.floor(total / 3600))}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`
}

/** The board's micro-label countdown: "05:59:12 LEFT" in mono, ticking every second. */
export function ClockLeft({ closesAt, style }: { closesAt: string; style?: StyleProp<TextStyle> }) {
	const [now, setNow] = useState(Date.now())
	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), 1000)
		return () => clearInterval(timer)
	}, [])
	const { hours, minutes } = timeLeft(closesAt, now)
	return (
		<BrandText
			variant="mono"
			style={style}
			accessibilityLabel={`${hours} hours ${minutes} minutes left today`}
		>
			{clockLeft(closesAt, now)} left
		</BrandText>
	)
}
