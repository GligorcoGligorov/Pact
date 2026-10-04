import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { brandConfig } from '@app/brand'
import { BrandMark } from '@/components/BrandMark'
import { CodeForm } from '@/components/join/CodeForm'

/** An invite code that doesn't exist: say so kindly, and let them try another. */
export default function JoinNotFound() {
	return (
		<div className="min-h-[100svh] bg-bg">
			<main className="mx-auto flex w-full max-w-[440px] flex-col gap-8 px-4 pb-14 pt-5">
				<Link href="/" className="flex items-center gap-2.5">
					<BrandMark siteName={brandConfig.siteName} />
					<span className="font-display text-lg font-bold text-ink">{brandConfig.siteName}</span>
				</Link>
				<section className="space-y-4 pt-10 text-center">
					<span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-surface shadow-card">
						<SearchX className="h-7 w-7 text-ink-tertiary" aria-hidden="true" />
					</span>
					<h1 className="font-display text-4xl font-extrabold tracking-[-0.02em] text-ink">
						No pact with that code
					</h1>
					<p className="text-ink-secondary">Check it with whoever sent it, or try it again here.</p>
				</section>
				<CodeForm />
			</main>
		</div>
	)
}
