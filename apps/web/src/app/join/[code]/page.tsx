import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { inviteCodeSchema } from '@app/contract'
import { brandConfig } from '@app/brand'
import { TrackEvent } from '@/components/TrackEvent'
import { Countdown } from '@/components/join/Countdown'
import { crewLine } from '@/components/join/Crew'
import { JoinPanel } from '@/components/join/JoinPanel'
import { PresenceWall } from '@/components/wall/PresenceWall'
import { Signature } from '@/components/wall/Signature'
import { JOIN_PAGE_EVENTS } from '@/lib/analytics/events'
import { crewStyle } from '@/lib/pacts/crew'
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
 * chat app on their phone. The pact, its crew with who is in today, the live countdown and the
 * stake, the wall of who was in each day and the crew's signatures; then a join in one tap after
 * an emailed code. Never a photo, a verdict or a caption.
 */
export default async function JoinPage({ params }: Props) {
	const page = await load((await params).code)
	if (!page) notFound()

	const active = page.status === 'active'
	const open = page.status === 'active' || page.status === 'lobby'
	const full = page.members.length >= page.maxMembers
	const cadence = page.cadence === 'weekdays' ? 'every weekday' : 'every day'

	// Dark first, on the crew's own deep tint: the hero in its full colour, then the wall (who was
	// in, day by day, never a photo), the signatures, the stake and the way in.
	return (
		<div className="min-h-[100svh] bg-[color:var(--crew-deep)]" style={crewStyle(page.color)}>
			<TrackEvent name={JOIN_PAGE_EVENTS.joinPageView} />
			<main className="mx-auto flex w-full max-w-[460px] flex-col gap-8 px-4 pb-14 pt-6">
				<header className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.08em]">
					<Link href="/" className="text-ink">
						{brandConfig.siteName}
					</Link>
					<span className="text-ink-secondary">Pact · {page.code}</span>
				</header>

				<section
					className="enter corner-marks relative rounded-[8px] bg-[color:var(--crew-fill)] p-5 text-[color:var(--crew-on-fill)] shadow-[0_8px_40px_-8px_var(--crew-fill)]"
					style={{ '--enter-delay': '40ms' } as React.CSSProperties}
				>
					<div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.06em] text-[color:var(--crew-on-fill-muted)]">
						<span>
							{active
								? `Day ${pad(page.dayNumber ?? 0)} / ${pad(page.totalDays)}`
								: page.status === 'lobby'
									? `Starts ${shortDate(page.startDay)}`
									: 'Finished'}
						</span>
						{active && page.closesAt ? (
							<Countdown closesAt={page.closesAt} renderedAt={Date.now()} />
						) : null}
					</div>
					<p className="mt-6 font-mono text-xs uppercase tracking-[0.06em] text-[color:var(--crew-on-fill-muted)]">
						{invitedLine(page)}
					</p>
					<h1 className="font-display text-[46px] font-semibold leading-[0.98] tracking-[-0.045em]">
						{page.name}
					</h1>
					<p className="font-display text-[30px] font-semibold leading-[1.05] tracking-[-0.035em] text-[color:var(--crew-on-fill-large)]">
						{page.habit}, {cadence}.
					</p>
					{active && page.heldCount > 0 ? (
						<dl className="mt-6 flex gap-8 border-t border-[color:var(--crew-on-fill-track)] pt-4">
							<Stat label="In today" value={`${page.inCount}/${page.heldCount}`} />
							<Stat label="Streak" value={pad(page.currentStreak)} />
							<Stat label="Crew" value={`${page.members.length}/${page.maxMembers}`} />
						</dl>
					) : null}
				</section>

				{page.wall.length > 0 ? (
					<section className="space-y-3 border-t-2 border-ink pt-3">
						<h2 className="font-mono text-xs uppercase tracking-[0.06em] text-ink-secondary">
							The wall · {crewLine(page.members, page.inCount, page.heldCount)}
						</h2>
						<PresenceWall
							days={page.wall}
							members={page.members}
							label={(day, i) => (day.open ? 'Now' : pad((page.dayNumber ?? page.totalDays) - i))}
						/>
					</section>
				) : null}

				<section className="space-y-4 border-t-2 border-ink pt-3">
					<h2 className="font-mono text-xs uppercase tracking-[0.06em] text-ink-secondary">
						Signed by
					</h2>
					<ul className="grid grid-cols-2 gap-x-4 gap-y-3">
						{page.members.map((m) => (
							<li key={m.userId} className="space-y-1">
								{m.signature ? (
									<Signature path={m.signature} className="h-12 w-auto text-ink" />
								) : (
									<span className="border-line block h-12 border-b border-dashed" />
								)}
								<span className="block font-mono text-[11px] uppercase tracking-[0.06em] text-ink-tertiary">
									{(m.name ?? 'A member').split(' ')[0]}
									{m.signature ? '' : ' · not yet'}
								</span>
							</li>
						))}
					</ul>
				</section>

				{page.stake ? (
					<section className="border-t-2 border-ink pt-3">
						<h2 className="font-mono text-xs uppercase tracking-[0.06em] text-ink-secondary">
							The stake
						</h2>
						<p className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
							{page.stake}.
						</p>
					</section>
				) : null}

				{open && !full ? (
					<JoinPanel
						code={page.code}
						pactId={page.pactId}
						startsInFuture={page.status === 'lobby'}
					/>
				) : (
					<section className="border-t-2 border-ink pt-3 text-sm text-ink-secondary">
						{full
							? 'This pact is full: 8 is the most. Ask them to start another one with you.'
							: 'This pact has ended, so it can’t take anyone new.'}
					</section>
				)}

				<section className="space-y-4 border-t-2 border-ink pt-3">
					<h2 className="font-mono text-xs uppercase tracking-[0.06em] text-ink-secondary">
						How it works
					</h2>
					<ol className="space-y-4">
						{STEPS.map(({ title, body }, i) => (
							<li key={title}>
								<span className="font-mono text-xs text-ink-tertiary">{pad(i + 1)} /</span>
								<span className="block font-display text-xl font-semibold tracking-[-0.02em] text-ink">
									{title}
								</span>
								<span className="block text-sm text-ink-secondary">{body}</span>
							</li>
						))}
					</ol>
				</section>
			</main>
		</div>
	)
}

function pad(n: number): string {
	return String(n).padStart(2, '0')
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
