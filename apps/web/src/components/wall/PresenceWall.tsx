import type { JoinPageDay } from '@/server/pacts/join-page'

type Member = { userId: string; name: string | null }

function initials(name: string | null): string {
	return (name ?? '?').trim().slice(0, 2).toUpperCase()
}

/**
 * The Crew Wall as the public sees it (R25, R27): one column per member, one row per day, newest
 * on top, and never a photo. A tile is filled in the crew's colour when they were in, dashed with
 * their initials when they weren't; a kept row gets the crew's frame and glow. Wears the crew via
 * the page's --crew-* variables.
 */
export function PresenceWall({
	days,
	members,
	label
}: {
	days: JoinPageDay[]
	members: Member[]
	/** Each row's label, newest first: "NOW", "07"… */
	label: (day: JoinPageDay, index: number) => string
}) {
	const names = new Map(members.map((m) => [m.userId, m.name]))
	return (
		<div className="space-y-2" role="img" aria-label="Who was in, day by day">
			<div
				className="grid gap-1 pl-12 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-secondary"
				style={{ gridTemplateColumns: `repeat(${members.length}, minmax(0, 1fr))` }}
			>
				{members.map((m) => (
					<span key={m.userId} className="truncate">
						{(m.name ?? 'A member').split(' ')[0]}
					</span>
				))}
			</div>
			{days.map((day, i) => (
				<div key={day.day} className="flex items-center gap-2">
					<span className="w-10 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-tertiary">
						{label(day, i)}
					</span>
					<div
						className={`grid flex-1 gap-1 rounded-[7px] border p-[2px] ${
							day.kept
								? 'border-[color:var(--crew-fill)] shadow-[0_0_14px_var(--crew-fill)]'
								: 'border-transparent'
						}`}
						style={{ gridTemplateColumns: `repeat(${day.cells.length}, minmax(0, 1fr))` }}
					>
						{day.cells.map((cell) =>
							!cell.held ? (
								<span key={cell.userId} className="h-9" />
							) : cell.in ? (
								<span key={cell.userId} className="h-9 rounded-[4px] bg-[color:var(--crew-fill)]" />
							) : (
								<span
									key={cell.userId}
									className={`border-line grid h-9 place-items-center rounded-[4px] border-[1.5px] border-dashed font-mono text-[11px] text-ink-secondary ${day.open ? 'animate-pulse motion-reduce:animate-none' : ''}`}
								>
									{initials(names.get(cell.userId) ?? null)}
								</span>
							)
						)}
					</div>
				</div>
			))}
		</div>
	)
}
