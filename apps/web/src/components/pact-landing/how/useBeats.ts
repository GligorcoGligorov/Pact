'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'

/**
 * A step visual's choreography: while `isActive`, moves through beats 0…n at the given times (ms
 * from activation); back to 0 when it stops being active, so scrolling back replays it. Under
 * reduced motion it sits on the last beat, so the visual is whole and still.
 */
export function useBeats(isActive: boolean, at: readonly number[]): number {
	const still = useReducedMotion()
	const [beat, setBeat] = useState(0)
	useEffect(() => {
		if (still) return setBeat(at.length)
		if (!isActive) return setBeat(0)
		const timers = at.map((ms, i) => setTimeout(() => setBeat(i + 1), ms))
		return () => timers.forEach(clearTimeout)
		// `at` is a module constant at every call site.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isActive, still])
	return beat
}

/** How much longer a typist pauses after a comma or a full stop than after a letter. */
const PAUSE_AFTER_PUNCTUATION = 7

/**
 * Characters of `text` typed so far, at `msPerChar` with a pause after punctuation, while
 * `isActive`; all of them under reduced motion.
 */
export function useTyped(isActive: boolean, text: string, msPerChar: number, delayMs = 0): number {
	const still = useReducedMotion()
	const [typed, setTyped] = useState(0)
	useEffect(() => {
		if (still) return setTyped(text.length)
		if (!isActive) return setTyped(0)
		let n = 0
		let timer: ReturnType<typeof setTimeout>
		const tick = () => {
			n += 1
			setTyped(n)
			if (n >= text.length) return
			const pause = /[,.:]/.test(text[n - 1] ?? '') ? PAUSE_AFTER_PUNCTUATION : 1
			timer = setTimeout(tick, msPerChar * pause)
		}
		timer = setTimeout(tick, delayMs)
		return () => clearTimeout(timer)
	}, [isActive, still, text, msPerChar, delayMs])
	return typed
}
