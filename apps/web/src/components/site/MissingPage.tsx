import Link from 'next/link'
import { brandConfig } from '@app/brand'

/**
 * The public pages' not-found, in the site's language: the wordmark, a mono label, a two-tone
 * headline, and a single dashed tile waiting, the wall's own way of saying "not here". Left-aligned
 * on the grid; whatever comes next (a code box, a link) is the child.
 */
export function MissingPage({
	label,
	title,
	body,
	children
}: {
	label: string
	title: [string, string]
	body: string
	children: React.ReactNode
}) {
	return (
		<div
			className="relative min-h-[100svh] overflow-hidden bg-bg"
			style={{ '--crew-line': 'var(--crew-coral-line)' } as React.CSSProperties}
		>
			<div
				aria-hidden="true"
				className="construction-grid absolute inset-0 [--grid-focus:30%_40%]"
			/>
			<main className="relative mx-auto flex w-full max-w-[560px] flex-col gap-10 px-5 pb-16 pt-6 sm:px-8">
				<Link href="/" className="label flex items-center gap-2 text-sm text-ink">
					<span
						aria-hidden="true"
						className="h-2 w-2 rounded-full bg-[color:var(--crew-coral-fill)]"
					/>
					{brandConfig.siteName}
				</Link>
				<section className="pt-10">
					<div
						aria-hidden="true"
						className="label grid h-24 w-20 animate-[waiting_1.6s_ease-in-out_infinite] place-items-center rounded-[6px] border-[1.5px] border-dashed border-[color:var(--crew-coral-line)] text-[color:var(--crew-coral-ink)]"
					>
						??
					</div>
					<p className="label mt-10 text-ink-secondary">{label}</p>
					<h1 className="t-h1 mt-3">
						{title[0]} <span className="block text-ink-tertiary">{title[1]}</span>
					</h1>
					<p className="mt-5 max-w-[40ch] text-pretty text-ink-secondary">{body}</p>
				</section>
				{children}
			</main>
		</div>
	)
}
