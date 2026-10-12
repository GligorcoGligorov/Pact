'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

/** How long a wheel step glides, in seconds: long enough to feel weighted, short enough to steer. */
const GLIDE_S = 1.1

/**
 * Lenis smooth scroll for the marketing pages. It drives the window's own scroll position, so
 * `position: sticky`, motion's `useScroll` and anchors keep working. Touch scrolling stays native
 * (Lenis leaves it alone by default), and a visitor who asked for reduced motion gets none of it.
 */
export function SmoothScroll() {
	useEffect(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
		const lenis = new Lenis({ duration: GLIDE_S, anchors: { offset: -88 }, autoRaf: true })
		document.documentElement.classList.add('lenis')
		return () => {
			lenis.destroy()
			document.documentElement.classList.remove('lenis')
		}
	}, [])
	return null
}
