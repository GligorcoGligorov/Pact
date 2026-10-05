import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { Check, Flame, X } from 'lucide-react'
import { brandConfig } from '@app/brand'
import { BrandMark } from '@/components/BrandMark'
import { TrackEvent } from '@/components/TrackEvent'
import { ResultActions } from '@/components/results/ResultActions'
import { RESULT_PAGE_EVENTS } from '@/lib/analytics/events'
import { crewHeroStyle, crewStyle } from '@/lib/pacts/crew'
import { getResultPage, type ResultPage } from '@/server/pacts/result-page'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ pact: string }> }

/** One read per request, shared by the metadata and the page. */
const load = cache((pactId: string): Promise<ResultPage | null> => getResultPage(pactId))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const page = await load((await params).pact)
	// Here, not only in the page: metadata resolves before the page streams, so the 404 sticks.
	if (!page) notFound()
	const title = `${page.emoji} ${page.name}: ${page.headline}`
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
 * R25: a finished pact's results, as a crew shares them from the app: the chain in the crew's
 * colour, who owes the stake, the awards and everyone's record. Public by link; never a photo,
 * a verdict or a caption.
 */
export default async function ResultsPage({ params }: Props) {
	const page = await load((await params).pact)
	if (!page) notFound()

	return (
		<div className="min-h-[100svh] bg-bg" style={crewStyle(page.color)}>
			<TrackEvent name={RESULT_PAGE_EVENTS.resultPageView} />
			<main className="mx-auto flex w-full max-w-[440px] flex-col gap-5 px-4 pb-14 pt-5">
				<header className="flex items-center justify-between">
					<Link href="/" className="flex items-center gap-2.5">
						<BrandMark siteName={brandConfig.siteName} />
						<span className="font-display text-lg font-bold text-ink">{brandConfig.siteName}</span>
					</Link>
				</header>

				<section
					className="enter space-y-5 rounded-card bg-hero p-6 shadow-raised"
					style={crewHeroStyle(page.color)}
				>
					<div className="flex items-center gap-3">
						<span
							className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-surface text-[30px] leading-none"
							aria-hidden="true"
						>
							{page.emoji}
						</span>
						<div className="min-w-0">
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-hero-text-secondary">
								The results are in
							</p>
							<h1 className="font-display text-3xl font-extrabold leading-tight tracking-[-0.02em] text-hero-text">
								{page.name}
							</h1>
						</div>
					</div>
					<div className="flex items-end gap-3">
						<span className="font-display text-6xl font-extrabold leading-none tracking-[-0.03em] text-hero-text">
							{page.keptDays}/{page.totalDays}
						</span>
						<span className="pb-1 text-sm text-hero-text-secondary">
							days kept together
							<br />
							<span className="inline-flex items-center gap-1">
								best run {page.bestStreak}
								<Flame className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
							</span>
						</span>
					</div>
					<ol
						className="flex flex-wrap gap-1.5 rounded-[18px] bg-surface p-3"
						aria-label={`${page.keptDays} of ${page.totalDays} days kept`}
					>
						{page.chain.map(({ day, status }) => (
							<li
								key={day}
								className={
									status === 'kept'
										? 'grid h-8 w-8 place-items-center rounded-[10px] bg-[var(--crew-fill)]'
										: 'grid h-8 w-8 place-items-center rounded-[10px] border-2 border-[color:var(--crew-track)]'
								}
							>
								{status === 'kept' ? (
									<Check className="h-4 w-4 text-[color:var(--crew-on-fill)]" strokeWidth={3} />
								) : (
									<X className="h-3.5 w-3.5 text-ink-tertiary" strokeWidth={2.6} />
								)}
							</li>
						))}
					</ol>
				</section>

				<section
					className="enter space-y-2 rounded-card border-2 border-[color:var(--crew-fill)] bg-surface p-6 text-center shadow-card"
					style={{ '--enter-delay': '80ms' } as React.CSSProperties}
				>
					<p className="text-4xl" aria-hidden="true">
						{page.nobodyPays ? '🎉' : '😅'}
					</p>
					<h2 className="font-display text-3xl font-extrabold leading-tight tracking-[-0.02em] text-ink">
						{page.headline}
					</h2>
					{page.stake && !page.nobodyPays ? (
						<p className="text-sm text-ink-secondary">The stake was: {page.stake}</p>
					) : null}
				</section>

				{page.awards.length > 0 ? (
					<section
						className="enter space-y-2"
						style={{ '--enter-delay': '140ms' } as React.CSSProperties}
					>
						<h2 className="px-1 font-display text-lg font-bold text-ink">The awards</h2>
						<ul className="space-y-2">
							{page.awards.map((a) => (
								<li
									key={a.title}
									className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card"
								>
									<span
										className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--crew-dim)] text-2xl"
										aria-hidden="true"
									>
										{a.emoji}
									</span>
									<span className="min-w-0">
										<span className="block text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--crew-ink)]">
											{a.title}
										</span>
										<span className="block font-semibold text-ink">{a.names}</span>
									</span>
								</li>
							))}
						</ul>
					</section>
				) : null}

				<section
					className="enter space-y-2"
					style={{ '--enter-delay': '200ms' } as React.CSSProperties}
				>
					<h2 className="px-1 font-display text-lg font-bold text-ink">Final scores</h2>
					<ul className="divide-y divide-line-hairline rounded-card bg-surface px-4 shadow-card">
						{page.members.map((m) => (
							<li key={m.userId} className="flex items-center gap-3 py-3">
								<span className="min-w-0 flex-1">
									<span className="block font-semibold text-ink">{m.name}</span>
									<span className="block text-sm text-ink-secondary">
										{m.daysDone} of {m.daysHeld} days · best run {m.bestStreak}
										{m.saverUsed ? ' · 🛟' : ''}
									</span>
								</span>
								<span aria-hidden="true">{m.awards.join('')}</span>
								{m.isLoser ? (
									<span className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
										Pays
									</span>
								) : null}
							</li>
						))}
					</ul>
				</section>

				<ResultActions pactId={page.pactId} />
			</main>
		</div>
	)
}
