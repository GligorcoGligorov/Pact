'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/site/ThemeToggle'
import { gaEvent } from '@/lib/analytics/client'
import { FUNNEL_EVENTS } from '@/lib/analytics/events'

const LINKS = [
	{ href: '/#how', label: 'How it works' },
	{ href: '/#start', label: 'Your turn' },
	{ href: '/support', label: 'Support' }
]

/** The nav's call to action, true to the launch state (src/lib/stores.ts). */
const CTA_LABEL = 'Join a pact'

/** Scroll distance, px, after which the pill shrinks. */
const CONTRACT_AFTER = 80

/**
 * The site header: a solid pill (never glass) that shrinks once the hero is behind you, the
 * wordmark with a live dot, three links, the light/dark toggle and one call to action. Both
 * sizes are one DOM, so nothing remounts mid-scroll.
 *
 * The mobile menu is a <details> disclosure, so it opens before hydration;
 * script only adds closing on a link tap, Escape, or a tap outside.
 */
export function Nav({ siteName }: { siteName: string }) {
	const pathname = usePathname()
	const [isContracted, setIsContracted] = useState(false)
	const menu = useRef<HTMLDetailsElement>(null)

	useEffect(() => {
		let frame = 0
		const read = () => {
			frame = 0
			setIsContracted(window.scrollY > CONTRACT_AFTER)
		}
		const onScroll = () => {
			if (!frame) frame = requestAnimationFrame(read)
		}
		read()
		window.addEventListener('scroll', onScroll, { passive: true })
		return () => {
			window.removeEventListener('scroll', onScroll)
			if (frame) cancelAnimationFrame(frame)
		}
	}, [])

	useEffect(() => {
		const el = menu.current
		if (!el) return
		const close = () => {
			el.open = false
		}
		const onPointerDown = (e: PointerEvent) => {
			if (el.open && e.target instanceof Node && !el.contains(e.target)) close()
		}
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && el.open) {
				close()
				el.querySelector('summary')?.focus()
			}
		}
		document.addEventListener('pointerdown', onPointerDown)
		document.addEventListener('keydown', onKeyDown)
		window.addEventListener('resize', close)
		return () => {
			document.removeEventListener('pointerdown', onPointerDown)
			document.removeEventListener('keydown', onKeyDown)
			window.removeEventListener('resize', close)
		}
	}, [])

	const closeMenu = () => {
		if (menu.current) menu.current.open = false
	}
	const onCta = () => {
		closeMenu()
		gaEvent(FUNNEL_EVENTS.ctaClicked, { cta: 'nav' })
	}

	return (
		<header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
			<a
				href="#main"
				className="sr-only rounded-pill bg-ink px-4 py-2 text-sm font-semibold text-ink-inverse focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60]"
			>
				Skip to content
			</a>
			<nav
				aria-label="Main"
				className={cn(
					'relative mx-auto flex items-center justify-between rounded-pill border border-line-soft bg-surface pl-5 pr-1.5 transition-[max-width,height,transform] duration-slow ease-out',
					isContracted ? 'h-12 max-w-[760px]' : 'h-14 max-w-[1120px]'
				)}
			>
				<Link
					href="/"
					className="group flex items-center gap-2 rounded-pill font-mono text-sm uppercase tracking-[0.12em] text-ink"
					onClick={closeMenu}
				>
					<span
						aria-hidden="true"
						className="h-2 w-2 rounded-full bg-[color:var(--crew-coral-fill)] transition-transform duration-base ease-out group-hover:scale-150"
					/>
					{siteName}
				</Link>

				<ul className="absolute left-1/2 hidden -translate-x-1/2 items-center md:flex">
					{LINKS.map((link) => (
						<li key={link.href}>
							<Link
								href={link.href}
								aria-current={pathname === link.href ? 'page' : undefined}
								className="nav-link rounded-pill px-3.5 py-2 text-sm text-ink-secondary transition-colors duration-fast hover:text-ink aria-[current=page]:text-ink"
							>
								{link.label}
							</Link>
						</li>
					))}
				</ul>

				<div className="flex items-center gap-1.5">
					<ThemeToggle className="grid h-9 w-9 place-items-center rounded-full text-ink-secondary transition-[color,background-color,transform] duration-fast hover:bg-surface2 hover:text-ink active:scale-[0.94]" />
					<Link
						href="/#join"
						onClick={onCta}
						className={cn(
							'hidden items-center rounded-pill bg-ink px-4 text-sm font-semibold text-ink-inverse transition-[height,transform,background-color] duration-base ease-out hover:bg-ink/85 active:scale-[0.96] sm:inline-flex',
							isContracted ? 'h-9' : 'h-11'
						)}
					>
						{CTA_LABEL}
					</Link>

					<details ref={menu} className="group relative md:hidden">
						<summary
							aria-label="Menu"
							className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-ink transition-transform duration-fast active:scale-[0.94]"
						>
							<Menu className="h-5 w-5 group-open:hidden" aria-hidden="true" />
							<X className="hidden h-5 w-5 group-open:block" aria-hidden="true" />
						</summary>
						<div className="menu-panel absolute right-0 top-[calc(100%+12px)] w-64 rounded-[14px] border border-line-soft bg-surface p-2">
							<ul>
								{LINKS.map((link) => (
									<li key={link.href}>
										<Link
											href={link.href}
											onClick={closeMenu}
											className="flex min-h-11 items-center rounded-row px-3.5 text-[15px] text-ink-secondary transition-colors hover:bg-surface2 hover:text-ink"
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
							<Link
								href="/#join"
								onClick={onCta}
								className="mt-1 flex h-12 items-center justify-center rounded-pill bg-ink text-[15px] font-semibold text-ink-inverse"
							>
								{CTA_LABEL}
							</Link>
						</div>
					</details>
				</div>
			</nav>
		</header>
	)
}
