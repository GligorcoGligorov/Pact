import type { CssVars } from '@/lib/utils'

/** One row of the public wall: who was held and who was in that day. */
export type PresenceDay = {
	day: string
	open?: boolean
	kept: boolean
	cells: { userId: string; held: boolean; in: boolean }[]
}

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
	label,
	compact,
	isBuilt
}: {
	days: PresenceDay[]
	members: Member[]
	/** Each row's label, newest first: "NOW", "07"… */
	label: (day: PresenceDay, index: number) => string
	/** Thin rows, for a whole pact at once. */
	compact?: boolean
	/** Assemble on load: rows drop in, oldest first, and each tile lands in turn (CSS). */
	isBuilt?: boolean
}) {
	const tile = compact ? 'h-4' : 'h-9'
	const names = new Map(members.map((m) => [m.userId, m.name]))
	return (
		<div
			className={`${compact ? 'space-y-1' : 'space-y-2'} ${isBuilt ? 'wall-in' : ''}`}
			role="img"
			aria-label="Who was in, day by day"
		>
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
				<div
					key={day.day}
					className="wall-row flex items-center gap-2"
					style={{ '--i': days.length - 1 - i } as CssVars}
				>
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
						{day.cells.map((cell, j) =>
							!cell.held ? (
								<span key={cell.userId} className={tile} />
							) : cell.in ? (
								<span
									key={cell.userId}
									className={`wall-cell ${tile} rounded-[4px] bg-[color:var(--crew-fill)]`}
									style={{ '--j': j } as CssVars}
								/>
							) : (
								<span
									key={cell.userId}
									style={{ '--j': j } as CssVars}
									className={`wall-cell border-line grid ${tile} place-items-center rounded-[4px] border-[1.5px] border-dashed font-mono text-[11px] text-ink-secondary ${day.open ? 'animate-pulse motion-reduce:animate-none' : ''}`}
								>
									{compact ? null : initials(names.get(cell.userId) ?? null)}
								</span>
							)
						)}
					</div>
				</div>
			))}
		</div>
	)
}
