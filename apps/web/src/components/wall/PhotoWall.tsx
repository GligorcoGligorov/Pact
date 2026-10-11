import Image from 'next/image'

/** A tile: a photo in /public/wall by number, or someone still out (their initials). */
export type PhotoTile = number | { waiting: string }
export type PhotoRow = { tiles: PhotoTile[]; kept?: boolean }

/**
 * The Crew Wall with real photos, for the marketing pages (a demo crew; Unsplash photos via
 * Lorem Picsum, see apps/mobile/assets/intro/README.md): kept rows framed in the crew's colour
 * and glowing, today's empty tile dashed and breathing. Wears the crew via --crew-* variables.
 */
export function PhotoWall({ rows, label }: { rows: PhotoRow[]; label: string }) {
	return (
		<div className="space-y-2" role="img" aria-label={label}>
			{rows.map((row, r) => (
				<div
					key={r}
					className={`grid grid-cols-4 gap-1 rounded-[8px] border p-[3px] ${
						row.kept
							? 'border-[color:var(--crew-fill)] shadow-[0_0_18px_var(--crew-fill)]'
							: 'border-transparent'
					}`}
				>
					{row.tiles.map((tile, i) =>
						typeof tile === 'number' ? (
							<div key={i} className="relative aspect-[4/5] overflow-hidden rounded-[4px]">
								<Image
									src={`/wall/${tile}.jpg`}
									alt=""
									fill
									sizes="(min-width: 1024px) 140px, 22vw"
									className="object-cover"
								/>
							</div>
						) : (
							<div
								key={i}
								className="grid aspect-[4/5] animate-pulse place-items-center rounded-[4px] border-[1.5px] border-dashed border-[color:var(--crew-line)] font-mono text-xs uppercase tracking-[0.06em] text-[color:var(--crew-line)] motion-reduce:animate-none"
							>
								{tile.waiting}
							</div>
						)
					)}
				</div>
			))}
		</div>
	)
}
