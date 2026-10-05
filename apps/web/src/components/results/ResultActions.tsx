'use client'

import Link from 'next/link'
import { Smartphone, Sparkles } from 'lucide-react'
import { gaEvent } from '@/lib/analytics/client'
import { RESULT_PAGE_EVENTS } from '@/lib/analytics/events'

/**
 * The results page's two ways forward: a member opens the results in the app; anyone else
 * starts a pact of their own (the growth half). Green, the colour of action.
 */
export function ResultActions({ pactId }: { pactId: string }) {
	return (
		<section className="space-y-3">
			<Link
				href="/"
				onClick={() => gaEvent(RESULT_PAGE_EVENTS.resultCtaClicked, { target: 'start' })}
				className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand-fill px-6 text-base font-semibold text-on-brand shadow-cta transition active:scale-[0.98]"
			>
				<Sparkles className="h-5 w-5" aria-hidden="true" />
				Start a pact with your crew
			</Link>
			<a
				href={`pact://pact/${pactId}/result`}
				onClick={() => gaEvent(RESULT_PAGE_EVENTS.resultCtaClicked, { target: 'app' })}
				className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line-hairline bg-surface px-6 text-sm font-semibold text-ink transition active:scale-[0.98]"
			>
				<Smartphone className="h-4 w-4" aria-hidden="true" />
				In this crew? Open it in the app
			</a>
		</section>
	)
}
