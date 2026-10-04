import { Check } from 'lucide-react'
import type { JoinPageMember } from '@/server/pacts/join-page'
import { cn } from '@/lib/utils'

/** The app's avatar colours (Avatars.tsx on mobile): soft fills from brand roles, stable per person. */
const LOOKS = [
	'bg-brand-dim text-brand-ink',
	'bg-info-soft text-info-text',
	'bg-warning-soft text-warning-text',
	'bg-error-soft text-error-text',
	'bg-surface3 text-ink'
] as const

function lookFor(userId: string): string {
	let hash = 0
	for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
	return LOOKS[hash % LOOKS.length]
}

function initials(name: string): string {
	const parts = name.trim().split(/\s+/)
	return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase()
}

export function displayName(member: Pick<JoinPageMember, 'name'>): string {
	return member.name?.trim() || 'A member'
}

/** A member as coloured initials, with a check once they are in today. */
export function Face({ member, size = 52 }: { member: JoinPageMember; size?: number }) {
	const done = member.state === 'in' || member.state === 'saver'
	return (
		<span
			className={cn(
				'relative grid shrink-0 place-items-center rounded-full border-2 border-surface font-semibold',
				lookFor(member.userId),
				member.state === 'out' && 'opacity-60'
			)}
			style={{ width: size, height: size, fontSize: size * 0.34 }}
		>
			{initials(displayName(member))}
			{done ? (
				<span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full border-2 border-surface bg-brand-fill">
					<Check className="h-3 w-3 text-on-brand" strokeWidth={3.5} aria-hidden="true" />
				</span>
			) : null}
		</span>
	)
}

/** "2 of 4 in today · waiting on Ana and Dan", or a line for a day nobody is held to. */
export function crewLine(members: JoinPageMember[], inCount: number, heldCount: number): string {
	if (heldCount === 0)
		return `${members.length} ${members.length === 1 ? 'person' : 'people'} in this pact`
	if (inCount === heldCount) return "Everyone's in today"
	const waiting = members.filter((m) => m.state === 'out').map((m) => displayName(m).split(' ')[0])
	const who =
		waiting.length === 1
			? waiting[0]
			: waiting.length === 2
				? `${waiting[0]} and ${waiting[1]}`
				: `${waiting[0]}, ${waiting[1]} and ${waiting.length - 2} more`
	return `${inCount} of ${heldCount} in today · waiting on ${who}`
}

/** The crew by face and first name, the way the app's invite screen shows it. */
export function CrewGrid({ members }: { members: JoinPageMember[] }) {
	return (
		<ul className="flex flex-wrap gap-x-4 gap-y-3">
			{members.map((m) => (
				<li key={m.userId} className="flex w-[60px] flex-col items-center gap-1.5">
					<Face member={m} />
					<span className="w-full truncate text-center text-xs text-ink-secondary">
						{displayName(m).split(' ')[0]}
						{m.isOwner ? <span className="sr-only"> (owner)</span> : null}
					</span>
				</li>
			))}
		</ul>
	)
}

/** The app's progress ring: a track and a rounded arc for `value` of `max`. */
export function Ring({
	value,
	max,
	size = 88,
	stroke = 10,
	children,
	className
}: {
	value: number
	max: number
	size?: number
	stroke?: number
	children?: React.ReactNode
	className?: string
}) {
	const r = (size - stroke) / 2
	const circumference = 2 * Math.PI * r
	const share = max > 0 ? Math.min(value / max, 1) : 0
	return (
		<span
			className={cn('relative inline-grid place-items-center', className)}
			style={{ width: size, height: size }}
		>
			<svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden="true">
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					fill="none"
					strokeWidth={stroke}
					className="stroke-hero-border"
				/>
				{share > 0 ? (
					<circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill="none"
						strokeWidth={stroke}
						strokeLinecap="round"
						strokeDasharray={circumference}
						strokeDashoffset={circumference * (1 - share)}
						className="stroke-brand-fill"
					/>
				) : null}
			</svg>
			<span className="relative text-center">{children}</span>
		</span>
	)
}
