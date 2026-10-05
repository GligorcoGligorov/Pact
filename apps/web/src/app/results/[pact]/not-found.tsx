import Link from 'next/link'
import { Hourglass } from 'lucide-react'
import { brandConfig } from '@app/brand'
import { BrandMark } from '@/components/BrandMark'

/** No results here: the pact doesn't exist, was cancelled, or is still going. */
export default function ResultsNotFound() {
	return (
		<div className="min-h-[100svh] bg-bg">
			<main className="mx-auto flex w-full max-w-[440px] flex-col gap-8 px-4 pb-14 pt-5">
				<Link href="/" className="flex items-center gap-2.5">
					<BrandMark siteName={brandConfig.siteName} />
					<span className="font-display text-lg font-bold text-ink">{brandConfig.siteName}</span>
				</Link>
				<section className="space-y-4 pt-10 text-center">
					<span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-surface shadow-card">
						<Hourglass className="h-7 w-7 text-ink-tertiary" aria-hidden="true" />
					</span>
					<h1 className="font-display text-4xl font-extrabold tracking-[-0.02em] text-ink">
						No results here yet
					</h1>
					<p className="text-ink-secondary">
						Results show up the day after a pact ends. This one is still going, or it isn&apos;t
						here anymore.
					</p>
					<Link
						href="/"
						className="mx-auto inline-flex h-12 items-center justify-center rounded-full bg-brand-fill px-6 text-base font-semibold text-on-brand shadow-cta"
					>
						Start your own pact
					</Link>
				</section>
			</main>
		</div>
	)
}
