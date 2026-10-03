import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

/** The brief's Apple Fitness ring: a track and a rounded arc for `value` of `max`. */
export function Ring({
	value,
	max,
	size = 84,
	stroke = 10,
	color,
	track,
	children
}: {
	value: number
	max: number
	size?: number
	stroke?: number
	color: string
	track: string
	children?: ReactNode
}) {
	const r = (size - stroke) / 2
	const circumference = 2 * Math.PI * r
	const share = max > 0 ? Math.min(value / max, 1) : 0
	return (
		<View style={{ width: size, height: size }}>
			<Svg width={size} height={size} style={s.svg}>
				<Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
				{share > 0 ? (
					<Circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						stroke={color}
						strokeWidth={stroke}
						strokeLinecap="round"
						fill="none"
						strokeDasharray={`${circumference} ${circumference}`}
						strokeDashoffset={circumference * (1 - share)}
						transform={`rotate(-90 ${size / 2} ${size / 2})`}
					/>
				) : null}
			</Svg>
			<View style={s.center}>{children}</View>
		</View>
	)
}

const s = StyleSheet.create({
	svg: { position: 'absolute' },
	center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }
})
