'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { gaEvent } from '@/lib/analytics/client'
import { FUNNEL_EVENTS } from '@/lib/analytics/events'
import { SCHEME_KEY } from '@/lib/scheme'

type Scheme = 'light' | 'dark'

function current(): Scheme {
	return document.documentElement.dataset.scheme === 'light' ? 'light' : 'dark'
}

/**
 * Light or dark, remembered in this browser. The stored choice is applied before first paint by
 * the inline script in the root layout (`SCHEME_SCRIPT`), so this only flips it.
 */
export function ThemeToggle({ className }: { className?: string }) {
	const [scheme, setScheme] = useState<Scheme | null>(null)
	useEffect(() => setScheme(current()), [])

	function toggle() {
		const next: Scheme = current() === 'dark' ? 'light' : 'dark'
		document.documentElement.dataset.scheme = next
		try {
			localStorage.setItem(SCHEME_KEY, next)
		} catch {
			// Private windows can refuse storage; the switch still holds for this page.
		}
		setScheme(next)
		gaEvent(FUNNEL_EVENTS.siteThemeChanged, { scheme: next })
	}

	const label = scheme === 'light' ? 'Switch to dark' : 'Switch to light'
	return (
		<button type="button" onClick={toggle} aria-label={label} title={label} className={className}>
			{scheme === 'light' ? (
				<Moon className="h-4 w-4" aria-hidden="true" />
			) : (
				<Sun className="h-4 w-4" aria-hidden="true" />
			)}
		</button>
	)
}
