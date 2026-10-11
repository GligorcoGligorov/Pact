import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { brandConfig } from '@app/brand'
import { pledgeLine } from '@app/contract'
import { TrackEvent } from '@/components/TrackEvent'
import { ResultActions } from '@/components/results/ResultActions'
import { PresenceWall } from '@/components/wall/PresenceWall'
import { Signature } from '@/components/wall/Signature'
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
 * R25: a finished pact's results, as a crew shares them from the app, laid out like the app's
 * stories on one page: the score on the crew's colour, the whole wall (who was in each day), who
 * pays, the awards, everyone's record and the signed pact. Public by link; never a photo, a
 * verdict or a caption.
 */
export default async function ResultsPage({ params }: Props) {
	const page = await load((await params).pact)
	if (!page) notFound()
	const pad = (n: number) => String(n).padStart(2, '0')
	const signed = page.members.filter((m) => m.signature)

	return (
		<div className="min-h-[100svh] bg-[color:var(--crew-deep)]" style={crewStyle(page.color)}>
			<TrackEvent name={RESULT_PAGE_EVENTS.resultPageView} />
			<main className="mx-auto flex w-full max-w-[460px] flex-col gap-8 px-4 pb-14 pt-6">
				<header className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.08em]">
					<Link href="/" className="text-ink">
						{brandConfig.siteName}
					</Link>
					<span className="text-ink-secondary">The results are in</span>
				</header>

				<section className="enter corner-marks relative rounded-[8px] bg-[color:var(--crew-fill)] p-5 text-[color:var(--crew-on-fill)] shadow-[0_8px_40px_-8px_var(--crew-fill)]">
					<p className="font-mono text-xs uppercase tracking-[0.06em] text-[color:var(--crew-on-fill-muted)]">
						That’s a wrap · {pad(page.totalDays)} days
					</p>
					<h1 className="mt-5 font-display text-[46px] font-semibold leading-[0.98] tracking-[-0.045em]">
						{page.name}
					</h1>
					<p className="font-display text-[30px] font-semibold leading-[1.05] tracking-[-0.035em] text-[color:var(--crew-on-fill-large)]">
						{page.keptDays} of {page.totalDays} days, kept together.
					</p>
					<dl className="mt-6 flex gap-8 border-t border-[color:var(--crew-on-fill-track)] pt-4">
						<Stat label="Kept" value={`${page.keptDays}/${page.totalDays}`} />
						<Stat label="Best run" value={pad(page.bestStreak)} />
						<Stat label="Crew" value={pad(page.members.length)} />
					</dl>
				</section>

				<section className="space-y-3 border-t-2 border-ink pt-3">
					<h2 className="font-mono text-xs uppercase tracking-[0.06em] text-ink-secondary">
						The wall · every day
					</h2>
					<PresenceWall
						days={page.wall}
						members={page.members.map((m) => ({ userId: m.userId, name: m.name }))}
						label={(_, i) => pad(page.wall.length - i)}
						compact
					/>
				</section>

				<section className="border-t-2 border-ink pt-3">
					<h2 className="font-mono text-xs uppercase tracking-[0.06em] text-ink-secondary">
						{page.nobodyPays ? 'Everybody wins' : 'Who pays'}
					</h2>
					<p className="mt-2 font-display text-[40px] font-semibold leading-[1] tracking-[-0.045em] text-ink">
						{page.headline}
					</p>
				</section>

				{page.awards.length > 0 ? (
					<section className="border-t-2 border-ink pt-3">
						<h2 className="font-mono text-xs uppercase tracking-[0.06em] text-ink-secondary">
							The awards
						</h2>
						<ul className="mt-3 divide-y divide-line-hairline">
							{page.awards.map((award, i) => (
								<li key={award.title} className="py-3">
									<span className="font-mono text-xs uppercase tracking-[0.06em] text-ink-tertiary">
										{pad(i + 1)} / {award.title}
									</span>
									<span className="block font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
										{award.names}
									</span>
								</li>
							))}
						</ul>
					</section>
				) : null}

				<section className="border-t-2 border-ink pt-3">
					<h2 className="font-mono text-xs uppercase tracking-[0.06em] text-ink-secondary">
						Final scores
					</h2>
					<ul className="mt-3 divide-y divide-line-hairline">
						{page.members.map((m, i) => (
							<li key={m.userId} className="flex items-start gap-3 py-3">
								<span className="w-6 pt-0.5 font-mono text-xs text-ink-tertiary">{pad(i + 1)}</span>
								<span className="min-w-0 flex-1">
									<span className="block font-semibold text-ink">{m.name}</span>
									<span className="block font-mono text-xs uppercase tracking-[0.06em] text-ink-secondary">
										{pad(m.daysDone)} / {pad(m.daysHeld)} · best {pad(m.bestStreak)}
										{m.saverUsed ? ' · saver' : ''}
									</span>
									{m.awards.length > 0 ? (
										<span className="block text-sm text-ink-tertiary">{m.awards.join(', ')}</span>
									) : null}
								</span>
								{m.isLoser ? (
									<span className="font-mono text-xs uppercase tracking-[0.06em] text-warning">
										Pays
									</span>
								) : null}
							</li>
						))}
					</ul>
				</section>

				{signed.length > 0 ? (
					<section className="corner-marks relative rounded-[6px] bg-ink p-5 text-bg">
						<p className="font-mono text-xs uppercase tracking-[0.06em]">The pact · {page.name}</p>
						<p className="mt-3 font-display text-xl font-semibold leading-snug tracking-[-0.02em]">
							{pledgeLine(null, page.habit, page.cadence, page.totalDays, page.stake)}
						</p>
						<ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
							{signed.map((m) => (
								<li key={m.userId}>
									<Signature path={m.signature!} className="h-12 w-auto" />
									<span className="block font-mono text-[11px] uppercase tracking-[0.06em] opacity-60">
										{m.name.split(' ')[0]}
									</span>
								</li>
							))}
						</ul>
					</section>
				) : null}

				<ResultActions pactId={page.pactId} />
			</main>
		</div>
	)
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-[color:var(--crew-on-fill-muted)]">
				{label}
			</dt>
			<dd className="font-display text-3xl font-semibold tabular-nums tracking-[-0.04em]">
				{value}
			</dd>
		</div>
	)
}
