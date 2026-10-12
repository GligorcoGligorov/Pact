'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

let active: Lenis | null = null

/**
 * Scroll the page to `top` (px), through Lenis when it is running so the glide is the same as a
 * wheel's, natively otherwise.
 */
export function scrollToY(top: number) {
	if (active) active.scrollTo(top)
	else window.scrollTo({ top, behavior: 'smooth' })
}

/** How long a wheel step glides, in seconds: long enough to feel weighted, short enough to steer. */
const GLIDE_S = 1.1
/** The longest smooth scroll waits for an idle moment, ms. */
const IDLE_TIMEOUT_MS = 1500

/**
 * Lenis smooth scroll for the marketing pages. It drives the window's own scroll position, so
 * `position: sticky`, motion's `useScroll` and anchors keep working. Touch scrolling stays native
 * (Lenis leaves it alone by default), and a visitor who asked for reduced motion gets none of it.
 */
export function SmoothScroll() {
	useEffect(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
		let lenis: Lenis | null = null
		// Once the page is idle: smooth scroll is never worth delaying the first input for.
		const start = () => {
			lenis = new Lenis({ duration: GLIDE_S, anchors: { offset: -88 }, autoRaf: true })
			active = lenis
			document.documentElement.classList.add('lenis')
		}
		const idle = window.requestIdleCallback?.(start, { timeout: IDLE_TIMEOUT_MS })
		const fallback = idle === undefined ? window.setTimeout(start, IDLE_TIMEOUT_MS) : undefined
		return () => {
			if (idle !== undefined) window.cancelIdleCallback(idle)
			if (fallback !== undefined) window.clearTimeout(fallback)
			active = null
			lenis?.destroy()
			document.documentElement.classList.remove('lenis')
		}
	}, [])
	return null
}
