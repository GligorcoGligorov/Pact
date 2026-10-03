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
 * The app's board countdown, live: the time left until today closes in the pact's timezone.
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
			className="flex items-baseline gap-1 font-sans tabular-nums text-hero-text"
			role="timer"
			aria-label={`${hours} hours ${minutes} minutes left today`}
		>
			<span className="text-[52px] font-extralight leading-none tracking-tight sm:text-[64px]">
				{hours}
			</span>
			<span className="mr-1.5 text-lg text-hero-text-secondary">h</span>
			<span className="text-[52px] font-extralight leading-none tracking-tight sm:text-[64px]">
				{pad(minutes)}
			</span>
			<span className="mr-1.5 text-lg text-hero-text-secondary">m</span>
			<span className="text-xl font-light leading-none text-hero-text-secondary">
				{pad(seconds)}
			</span>
		</span>
	)
}
