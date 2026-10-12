import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { brandConfig } from '@app/brand'
import { TrackEvent } from '@/components/TrackEvent'
import { ResultStories } from '@/components/results/ResultStories'
import { RESULT_PAGE_EVENTS } from '@/lib/analytics/events'
import { crewStyle } from '@/lib/pacts/crew'
import { getResultPage, type ResultPage } from '@/server/pacts/result-page'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ pact: string }> }

/** One read per request, shared by the metadata and the page. */
const load = cache((pactId: string): Promise<ResultPage | null> => getResultPage(pactId))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const page = await load((await params).pact)
	// Here, not only in the page: metadata resolves before the page streams, so the 404 sticks.
	if (!page) notFound()
	const title = `${page.name}: ${page.headline}`
	const description = `${page.keptDays} of ${page.totalDays} days kept together. ${page.habit}, on Pact.`
	return {
		title: { absolute: title },
		description,
		robots: { index: false, follow: false },
		openGraph: { title, description, type: 'website', siteName: brandConfig.siteName },
		twitter: { card: 'summary_large_image', title, description }
	}
}

/**
 * R25: a finished pact's results, as a crew shares them from the app, told the way the app tells
 * them: as stories, here scrolled (ResultStories): the score, the whole wall, the awards and
 * scores, who pays after a drumroll, the signed pact. Public by link; never a photo, a verdict or
 * a caption.
 */
export default async function ResultsPage({ params }: Props) {
	const page = await load((await params).pact)
	if (!page) notFound()

	return (
		<div className="relative min-h-[100svh] bg-bg" style={crewStyle(page.color)}>
			<TrackEvent name={RESULT_PAGE_EVENTS.resultPageView} />
			<div
				aria-hidden="true"
				className="construction-grid absolute inset-x-0 top-0 h-[90svh] [--grid-focus:70%_30%]"
			/>
			<header className="relative mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 pt-6 sm:px-8 lg:pt-9">
				<Link href="/" className="label flex items-center gap-2 text-sm text-ink">
					<span aria-hidden="true" className="h-2 w-2 rounded-full bg-[color:var(--crew-fill)]" />
					{brandConfig.siteName}
				</Link>
				<span className="label text-ink-secondary">The results are in</span>
			</header>
			<main className="relative">
				<ResultStories page={page} />
			</main>
		</div>
	)
}
