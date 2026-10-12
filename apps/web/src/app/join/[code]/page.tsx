import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { inviteCodeSchema, pledgeLine } from '@app/contract'
import { brandConfig } from '@app/brand'
import { TrackEvent } from '@/components/TrackEvent'
import { Countdown } from '@/components/join/Countdown'
import { crewLine } from '@/components/join/Crew'
import { JoinPanel } from '@/components/join/JoinPanel'
import { PresenceWall } from '@/components/wall/PresenceWall'
import { Signature } from '@/components/wall/Signature'
import { JOIN_PAGE_EVENTS } from '@/lib/analytics/events'
import { crewStyle } from '@/lib/pacts/crew'
import type { CssVars } from '@/lib/utils'
import { getJoinPage, type JoinPage } from '@/server/pacts/join-page'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ code: string }> }

/** One read per request, shared by the metadata and the page. */
const load = cache(async (raw: string): Promise<JoinPage | null> => {
	const code = raw.toUpperCase()
	if (!inviteCodeSchema.safeParse(code).success) return null
	return getJoinPage(code)
})

const STEPS = [
	{ title: 'Sign the pact.', body: 'Everyone signs the same promise, and the stake.' },
	{
		title: 'One photo a day.',
		body: 'Show the habit and the day’s challenge. An AI takes a look.'
	},
	{ title: 'Everyone in, or nobody is.', body: 'A day counts only when the whole crew is in.' }
] as const

function invitedLine(page: JoinPage): string {
	return page.inviter ? `${page.inviter.split(' ')[0]} invited you to` : 'You’re invited to'
}

function shortDate(iso: string): string {
	return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	})
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const page = await load((await params).code)
	// Here, not only in the page: metadata resolves before the page streams, so the 404 status sticks.
	if (!page) notFound()
	const title = `${invitedLine(page).replace(' to', '')} to ${page.name}`
	const description =
		page.status === 'active' && page.heldCount > 0
			? `${page.habit} · ${page.inCount} of ${page.heldCount} in today. Join the crew on Pact.`
			: `${page.habit} · join the crew on Pact.`
	return {
		title: { absolute: title },
		description,
		robots: { index: false, follow: false },
		openGraph: { title, description, type: 'website', siteName: brandConfig.siteName },
		twitter: { card: 'summary_large_image', title, description }
	}
}

/**
 * R27: the public page an invite link opens, and the first thing a friend sees, usually from a
 * chat app on their phone. The pact and its sentence, who is in today, the live countdown and the
 * stake, the wall of who was in each day assembling, the crew's signatures drawing themselves;
 * then a join in one tap after an emailed code. Never a photo, a verdict or a caption.
 */
export default async function JoinPage({ params }: Props) {
	const page = await load((await params).code)
	if (!page) notFound()

	const active = page.status === 'active'
	const open = page.status === 'active' || page.status === 'lobby'
	const full = page.members.length >= page.maxMembers
	const cadence = page.cadence === 'weekdays' ? 'every weekday' : 'every day'

	const pledge = pledgeLine(null, page.habit, page.cadence, page.totalDays, page.stake)
	const signed = page.members.filter((m) => m.signature)

	// Dark first, on the near-black ground with the crew's colour as the one colour: the pact and its
	// sentence with the way in on the left; on the right the wall (who was in, day by day, never a
	// photo) assembling, and the signatures drawing themselves. One column on a phone.
	return (
		<div className="relative min-h-[100svh] overflow-hidden bg-bg" style={crewStyle(page.color)}>
			<TrackEvent name={JOIN_PAGE_EVENTS.joinPageView} />
			<div
				aria-hidden="true"
				className="construction-grid absolute inset-x-0 top-0 h-[90svh] [--grid-focus:75%_20%]"
			/>
			<header className="relative mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 pt-6 sm:px-8">
				<Link href="/" className="label flex items-center gap-2 text-sm text-ink">
					<span aria-hidden="true" className="h-2 w-2 rounded-full bg-[color:var(--crew-fill)]" />
					{brandConfig.siteName}
				</Link>
				<span className="label text-ink-secondary">Invite · {page.code}</span>
			</header>

			<main className="relative mx-auto grid w-full max-w-[1120px] grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-12 px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
				<section className="lg:col-start-1 lg:row-start-1" aria-labelledby="pact-name">
					<p className="label enter flex items-center gap-3 text-ink-secondary">
						<span aria-hidden="true" className="h-px w-8 bg-[color:var(--crew-line)]" />
						{invitedLine(page)}
					</p>
					<h1 id="pact-name" className="mt-5 text-balance">
						<span className="line-clip t-hero-pact">
							<span className="line-rise">{page.name}</span>
						</span>
						<span className="line-clip t-h1 mt-2">
							<span className="line-rise text-ink-tertiary" style={{ '--i': 1 } as CssVars}>
								{page.habit}, {cadence}.
							</span>
						</span>
					</h1>

					<dl
						className="enter label mt-8 flex flex-wrap gap-x-8 gap-y-3 border-y border-line-hairline py-4 text-ink-secondary"
						style={{ '--enter-delay': '320ms' } as CssVars}
					>
						<Fact
							label={active ? 'Day' : page.status === 'lobby' ? 'Starts' : 'Status'}
							value={
								active
									? `${pad(page.dayNumber ?? 0)} / ${pad(page.totalDays)}`
									: page.status === 'lobby'
										? shortDate(page.startDay)
										: 'Finished'
							}
						/>
						{active && page.heldCount > 0 ? (
							<Fact label="In today" value={`${page.inCount} / ${page.heldCount}`} />
						) : null}
						{active ? <Fact label="Streak" value={pad(page.currentStreak)} /> : null}
						<Fact label="Crew" value={`${page.members.length} / ${page.maxMembers}`} />
						{active && page.closesAt ? (
							<div>
								<dt className="text-[10px] text-ink-tertiary">Today closes in</dt>
								<dd className="mt-1 text-ink">
									<Countdown closesAt={page.closesAt} renderedAt={Date.now()} />
								</dd>
							</div>
						) : null}
					</dl>

					<p
						className="enter mt-8 max-w-[30ch] font-display text-[1.55rem] font-semibold leading-[1.2] tracking-[-0.03em] text-ink sm:text-[2rem]"
						style={{ '--enter-delay': '420ms' } as CssVars}
					>
						<span className="label mb-3 block text-[10px] text-ink-tertiary">The pact</span>
						{pledge}
					</p>
				</section>

				<div className="space-y-10 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-2">
					{page.wall.length > 0 ? (
						<section className="corner-marks relative rounded-[10px] border border-line-soft bg-surface p-5 sm:p-6">
							<h2 className="label mb-4 flex items-center justify-between gap-4 text-ink-secondary">
								<span className="text-ink">The wall</span>
								<span>Last {page.wall.length} days</span>
							</h2>
							<PresenceWall
								days={page.wall}
								members={page.members}
								label={(day, i) => (day.open ? 'Now' : pad((page.dayNumber ?? page.totalDays) - i))}
								isBuilt
							/>
							<p className="label mt-4 border-t border-line-hairline pt-3 text-[10px] text-[color:var(--crew-ink)]">
								{crewLine(page.members, page.inCount, page.heldCount)}
							</p>
						</section>
					) : null}

					<section aria-labelledby="signed-by">
						<h2 id="signed-by" className="label text-ink-secondary">
							Signed by · {signed.length} / {page.members.length}
						</h2>
						<ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
							{page.members.map((m, i) => (
								<li key={m.userId}>
									<div className="relative h-14 border-b border-dashed border-line-soft text-ink">
										{m.signature ? (
											<Signature
												path={m.signature}
												drawAt={i}
												className="absolute bottom-1 left-0 h-[3.4rem] w-auto"
											/>
										) : null}
									</div>
									<span className="label mt-2 block text-[10px] text-ink-tertiary">
										{(m.name ?? 'A member').split(' ')[0]}
										{m.signature ? ' · signed' : ' · not yet'}
									</span>
								</li>
							))}
						</ul>
					</section>

					{page.stake ? (
						<section className="flex items-baseline justify-between gap-6 border-t border-line-hairline pt-4">
							<h2 className="label text-ink-secondary">The stake</h2>
							<p className="text-right font-display text-xl font-semibold tracking-[-0.02em] text-ink">
								{page.stake}.
							</p>
						</section>
					) : null}

					<section className="border-t border-line-hairline pt-4">
						<h2 className="label text-ink-secondary">How it works</h2>
						<ol className="mt-4 space-y-3">
							{STEPS.map(({ title, body }, i) => (
								<li key={title} className="grid grid-cols-[2rem_1fr] gap-2">
									<span className="label pt-1 text-ink-tertiary">{pad(i + 1)}</span>
									<span>
										<span className="block font-semibold text-ink">{title}</span>
										<span className="block text-sm text-ink-secondary">{body}</span>
									</span>
								</li>
							))}
						</ol>
					</section>
				</div>

				<div className="lg:col-start-1 lg:row-start-2">
					{open && !full ? (
						<JoinPanel
							code={page.code}
							pactId={page.pactId}
							startsInFuture={page.status === 'lobby'}
						/>
					) : (
						<p className="border-t border-line-hairline pt-4 text-sm text-ink-secondary">
							{full
								? 'This pact is full: 8 is the most. Ask them to start another one with you.'
								: 'This pact has ended, so it can’t take anyone new.'}
						</p>
					)}
				</div>
			</main>
		</div>
	)
}

function pad(n: number): string {
	return String(n).padStart(2, '0')
}

function Fact({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="text-[10px] text-ink-tertiary">{label}</dt>
			<dd className="mt-1 tabular-nums text-ink">{value}</dd>
		</div>
	)
}
