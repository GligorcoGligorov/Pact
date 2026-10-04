import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { Camera, Flame, Link2Off, Lock, Sparkles, Trophy } from 'lucide-react'
import { inviteCodeSchema } from '@app/contract'
import { brandConfig } from '@app/brand'
import { BrandMark } from '@/components/BrandMark'
import { TrackEvent } from '@/components/TrackEvent'
import { Countdown } from '@/components/join/Countdown'
import { CrewGrid, crewLine, Ring } from '@/components/join/Crew'
import { JoinPanel } from '@/components/join/JoinPanel'
import { JOIN_PAGE_EVENTS } from '@/lib/analytics/events'
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
	{ icon: Camera, title: 'A photo, every day', body: 'Show the habit and the day’s challenge.' },
	{
		icon: Sparkles,
		title: 'The AI takes a look',
		body: 'It flags anything odd. It never fails anyone.'
	},
	{
		icon: Link2Off,
		title: 'Miss a day, the chain breaks',
		body: 'The day counts only when everyone’s in.'
	}
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
 * stake; then a join in one tap after an emailed code. Never a photo, a verdict or a caption.
 */
export default async function JoinPage({ params }: Props) {
	const page = await load((await params).code)
	if (!page) notFound()

	const active = page.status === 'active'
	const open = page.status === 'active' || page.status === 'lobby'
	const full = page.members.length >= page.maxMembers
	const cadence = page.cadence === 'weekdays' ? 'every weekday' : 'every day'

	return (
		<div className="min-h-[100svh] bg-bg">
			<TrackEvent name={JOIN_PAGE_EVENTS.joinPageView} />
			<main className="mx-auto flex w-full max-w-[440px] flex-col gap-5 px-4 pb-14 pt-5">
				<header className="flex items-center justify-between">
					<Link href="/" className="flex items-center gap-2.5">
						<BrandMark siteName={brandConfig.siteName} />
						<span className="font-display text-lg font-bold text-ink">{brandConfig.siteName}</span>
					</Link>
					<span className="rounded-full bg-surface px-3 py-1 font-mono text-xs tracking-[0.2em] text-ink-secondary shadow-soft">
						{page.code}
					</span>
				</header>

				<section className="enter space-y-2 pt-3">
					<p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
						{invitedLine(page)}
					</p>
					<h1 className="font-display text-[44px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink">
						{page.name}
					</h1>
					<p className="text-lg font-medium text-brand-ink">
						{page.habit}, {cadence}
					</p>
				</section>

				<section
					className="enter rounded-card bg-hero p-6 shadow-raised"
					style={{ '--enter-delay': '80ms' } as React.CSSProperties}
				>
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0 space-y-1">
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-hero-text-secondary">
								{active
									? `Day ${page.dayNumber} of ${page.totalDays}`
									: page.status === 'lobby'
										? `Starts ${shortDate(page.startDay)}`
										: 'This pact has ended'}
							</p>
							{active && page.closesAt ? (
								<>
									<Countdown closesAt={page.closesAt} renderedAt={Date.now()} />
									<p className="text-sm text-hero-text-secondary">left to check in today</p>
								</>
							) : (
								<p className="max-w-[22ch] font-display text-2xl font-bold text-hero-text">
									{page.status === 'lobby'
										? `${page.totalDays} days, ${shortDate(page.startDay)} to ${shortDate(page.endDay)}`
										: `It ran ${shortDate(page.startDay)} to ${shortDate(page.endDay)}`}
								</p>
							)}
						</div>
						{active && page.heldCount > 0 ? (
							<Ring
								value={page.inCount}
								max={page.heldCount}
								size={76}
								stroke={9}
								className="shrink-0"
							>
								<span className="block font-display text-xl font-bold leading-none text-hero-text">
									{page.inCount}/{page.heldCount}
								</span>
								<span className="text-xs text-hero-text-secondary">in</span>
							</Ring>
						) : null}
					</div>
					{page.currentStreak > 0 ? (
						<p className="mt-4 flex items-center gap-1.5 text-sm text-hero-text-secondary">
							<Flame className="h-4 w-4 text-warning" aria-hidden="true" />
							<span>
								<span className="font-semibold text-hero-text">{page.currentStreak}-day</span> crew
								streak
							</span>
						</p>
					) : null}
				</section>

				<section
					className="enter space-y-4 rounded-card border border-line-hairline bg-surface p-5 shadow-card"
					style={{ '--enter-delay': '140ms' } as React.CSSProperties}
				>
					<div className="flex items-baseline justify-between">
						<h2 className="font-display text-lg font-bold text-ink">The crew</h2>
						<span className="text-sm text-ink-tertiary">
							{page.members.length} of {page.maxMembers}
						</span>
					</div>
					<CrewGrid members={page.members} />
					<p className="text-sm text-ink-secondary">
						{crewLine(page.members, page.inCount, page.heldCount)}
					</p>
				</section>

				{page.stake ? (
					<section className="flex items-center gap-3 rounded-card bg-brand-dim px-5 py-4">
						<Trophy className="h-5 w-5 shrink-0 text-brand-ink" aria-hidden="true" />
						<p className="text-sm text-ink">
							<span className="font-semibold">The stake:</span> {page.stake}
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
					<section className="flex items-center gap-3 rounded-card border border-line-hairline bg-surface p-5">
						<Lock className="h-5 w-5 shrink-0 text-ink-tertiary" aria-hidden="true" />
						<p className="text-sm text-ink-secondary">
							{full
								? 'This pact is full: 8 is the most. Ask them to start another one with you.'
								: 'This pact has ended, so it can’t take anyone new.'}
						</p>
					</section>
				)}

				<section className="space-y-3 px-1 pt-2">
					<h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-tertiary">
						How it works
					</h2>
					<ol className="space-y-3">
						{STEPS.map(({ icon: Icon, title, body }) => (
							<li key={title} className="flex items-center gap-3">
								<span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-brand-dim">
									<Icon className="h-5 w-5 text-brand-ink" aria-hidden="true" />
								</span>
								<span>
									<span className="block text-sm font-semibold text-ink">{title}</span>
									<span className="block text-sm text-ink-secondary">{body}</span>
								</span>
							</li>
						))}
					</ol>
				</section>
			</main>
		</div>
	)
}
