import { useEffect, useState } from 'react'
import type { TypeRole } from '@app/brand'
import { CELEBRATION } from '@/lib/streaks'
import { NumberTicker } from './NumberTicker'

/**
 * A number that counts up from zero when it first appears, then ticks to any new value; inside
 * the celebration budget, in tabular figures. With Reduce Motion on it simply shows the value
 * (NumberTicker's own rule).
 */
export function CountUp({
	value,
	format = (n) => String(Math.round(n)),
	color,
	variant = 'h1'
}: {
	value: number
	format?: (n: number) => string
	color: string
	variant?: TypeRole
}) {
	const [target, setTarget] = useState(0)
	useEffect(() => setTarget(value), [value])
	return (
		<NumberTicker
			value={target}
			format={(n) => format(Math.round(n))}
			duration={CELEBRATION.landMs}
			variant={variant}
			style={{ color }}
			accessibilityLabel={format(value)}
		/>
	)
}
