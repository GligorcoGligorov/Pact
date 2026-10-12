'use client'

import { useEffect, useState } from 'react'

const TICK_MS = 1_000
const pad = (n: number) => String(n).padStart(2, '0')

/** HH:MM:SS from `now` to the visitor's next local midnight: when "today" closes. */
function untilMidnight(now: Date): string {
	const midnight = new Date(now)
	midnight.setHours(24, 0, 0, 0)
	const s = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000))
	return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}

/**
 * The time left in the visitor's day, ticking every second. Empty dashes until mounted, so the
 * server's render (a different clock, a different timezone) never mismatches the browser's.
 */
export function useLocalCountdown(): string {
	const [value, setValue] = useState('--:--:--')
	useEffect(() => {
		const tick = () => setValue(untilMidnight(new Date()))
		tick()
		const timer = setInterval(tick, TICK_MS)
		return () => clearInterval(timer)
	}, [])
	return value
}
