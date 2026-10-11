'use client'

import { useEffect, useState } from 'react'

const TICK_MS = 1_000

function left(closesAt: string, now: number) {
	const ms = Math.max(Date.parse(closesAt) - now, 0)
	const totalSeconds = Math.floor(ms / 1000)
	return {
		hours: Math.floor(totalSeconds / 3600),
		minutes: Math.floor((totalSeconds % 3600) / 60),
		seconds: totalSeconds % 60
	}
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * The board's countdown as a mono micro-label, live: "05:59:12 LEFT" until today closes in the
 * pact's timezone.
 * Renders the server's value first, then ticks every second, so it never flashes empty.
 */
export function Countdown({ closesAt, renderedAt }: { closesAt: string; renderedAt: number }) {
	const [now, setNow] = useState(renderedAt)
	useEffect(() => {
		setNow(Date.now())
		const timer = setInterval(() => setNow(Date.now()), TICK_MS)
		return () => clearInterval(timer)
	}, [])
	const { hours, minutes, seconds } = left(closesAt, now)
	return (
		<span
			className="font-mono tabular-nums"
			role="timer"
			aria-label={`${hours} hours ${minutes} minutes left today`}
		>
			{pad(hours)}:{pad(minutes)}:{pad(seconds)} left
		</span>
	)
}
