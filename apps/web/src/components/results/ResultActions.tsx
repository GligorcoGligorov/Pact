'use client'

import Link from 'next/link'
import { gaEvent } from '@/lib/analytics/client'
import { RESULT_PAGE_EVENTS } from '@/lib/analytics/events'

/**
 * The results page's two ways forward: a member opens the results in the app; anyone else
 * starts a pact of their own (the growth half). An ink pill, then an outline.
 */
export function ResultActions({ pactId }: { pactId: string }) {
	return (
		<section className="space-y-3">
			<Link
				href="/"
				onClick={() => gaEvent(RESULT_PAGE_EVENTS.resultCtaClicked, { target: 'start' })}
				className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand-fill px-6 text-base font-semibold text-on-brand transition active:scale-[0.98]"
			>
				Start a pact with your crew
			</Link>
			<a
				href={`pact://pact/${pactId}/result`}
				onClick={() => gaEvent(RESULT_PAGE_EVENTS.resultCtaClicked, { target: 'app' })}
				className="border-line inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border px-6 text-sm font-semibold text-ink transition active:scale-[0.98]"
			>
				In this crew? Open it in the app
			</a>
		</section>
	)
}
