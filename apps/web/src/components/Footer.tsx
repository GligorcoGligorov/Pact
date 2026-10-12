import Link from 'next/link'
import { brandConfig } from '@app/brand'
import { Container } from './Container'

const LINKS = [
	{ href: '/#how', label: 'How it works' },
	{ href: '/support', label: 'Support' },
	{ href: '/privacy', label: 'Privacy' },
	{ href: '/terms', label: 'Terms' },
	{ href: '/delete-account', label: 'Delete account' }
]

/** The minimal footer: the wordmark and one line, the links, the year. */
export function Footer() {
	const { siteName } = brandConfig
	const year = new Date().getFullYear()
	return (
		<footer className="border-t border-line-hairline py-10">
			<Container className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
				<div>
					<Link href="/" className="label inline-flex items-center gap-2 text-sm text-ink">
						<span
							aria-hidden="true"
							className="h-2 w-2 rounded-full bg-[color:var(--crew-coral-fill)]"
						/>
						{siteName}
					</Link>
					<p className="mt-3 max-w-[34ch] text-sm text-ink-secondary">
						Habits your friends keep you to. One photo a day, one crew, one stake.
					</p>
				</div>
				<nav aria-label="Footer">
					<ul className="flex flex-wrap gap-x-6 gap-y-2">
						{LINKS.map((l) => (
							<li key={l.href}>
								<Link
									href={l.href}
									className="inline-flex min-h-9 items-center text-sm text-ink-secondary transition-colors duration-fast hover:text-ink"
								>
									{l.label}
								</Link>
							</li>
						))}
					</ul>
				</nav>
				<p className="label text-ink-tertiary">© {year}</p>
			</Container>
		</footer>
	)
}
