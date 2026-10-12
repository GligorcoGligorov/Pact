import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { crewThemeOf, inviteCodeSchema } from '@app/contract'
import { theme } from '@app/brand'
import { getJoinPage } from '@/server/pacts/join-page'

export const runtime = 'nodejs'
export const alt = 'An invite to a pact on Pact'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** The dark palette's colours: an image has no CSS variables, so it reads the tokens directly. */
const c = theme.palettes.dark
/** Rows of the wall the card shows, newest on top. */
const WALL_ROWS = 4
const GRID = 60
const MARK = 16
const MARK_INSET = 22

const font = (file: string) => readFile(path.join(process.cwd(), 'assets/fonts', file))
const pad = (n: number) => String(n).padStart(2, '0')

function initials(name: string | null): string {
	return (name ?? '?').trim().slice(0, 2).toUpperCase()
}

/**
 * The card an invite link unfurls into in WhatsApp or iMessage, in the website's language: the
 * near-black ground with its construction grid and corner marks, who invited you, the pact's name
 * and habit in two tones, and the crew's wall as presence (who was in, day by day, today's
 * missing tiles dashed with initials) in the crew's colour. Same data rules as the page (R27):
 * never a photo.
 */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
	const code = (await params).code.toUpperCase()
	const page = inviteCodeSchema.safeParse(code).success ? await getJoinPage(code) : null
	const [display, mono] = await Promise.all([
		font('InterTight_600SemiBold.ttf'),
		font('IBMPlexMono_500Medium.ttf')
	])
	const fonts = [
		{ name: 'Display', data: display, weight: 600 as const },
		{ name: 'Mono', data: mono, weight: 500 as const }
	]
	const label = (fontSize: number, color: string = c.textSecondary) => ({
		fontFamily: 'Mono',
		fontSize,
		letterSpacing: fontSize * 0.08,
		textTransform: 'uppercase' as const,
		color
	})

	if (!page) {
		return new ImageResponse(
			<div
				style={{
					display: 'flex',
					width: '100%',
					height: '100%',
					alignItems: 'center',
					justifyContent: 'center',
					background: c.bg,
					fontFamily: 'Display',
					fontSize: 96,
					color: c.textPrimary
				}}
			>
				Pact
			</div>,
			{ ...size, fonts }
		)
	}

	const active = page.status === 'active' && page.heldCount > 0
	const inviter = page.inviter?.split(' ')[0]
	const tone = c.crew[crewThemeOf(page.color, page.emoji).color]
	const rows = page.wall.slice(0, WALL_ROWS)
	const names = new Map(page.members.map((m) => [m.userId, m.name]))
	const markLine = `2px solid ${c.textSecondary}`
	const corners = [
		{ top: MARK_INSET, left: MARK_INSET, borderTop: markLine, borderLeft: markLine },
		{ top: MARK_INSET, right: MARK_INSET, borderTop: markLine, borderRight: markLine },
		{ bottom: MARK_INSET, left: MARK_INSET, borderBottom: markLine, borderLeft: markLine },
		{ bottom: MARK_INSET, right: MARK_INSET, borderBottom: markLine, borderRight: markLine }
	]

	return new ImageResponse(
		<div
			style={{
				display: 'flex',
				position: 'relative',
				width: '100%',
				height: '100%',
				background: c.bg,
				backgroundImage: `linear-gradient(to right, ${c.borderHairline} 1px, transparent 1px), linear-gradient(to bottom, ${c.borderHairline} 1px, transparent 1px)`,
				backgroundSize: `${GRID}px ${GRID}px`,
				padding: 56,
				gap: 48
			}}
		>
			{corners.map((corner, i) => (
				<div key={i} style={{ position: 'absolute', width: MARK, height: MARK, ...corner }} />
			))}

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					flex: 1,
					justifyContent: 'space-between'
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
					<div style={{ width: 12, height: 12, borderRadius: 99, background: tone.fill }} />
					<div style={label(22, c.textPrimary)}>Pact</div>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column' }}>
					<div style={{ ...label(20), marginBottom: 18 }}>
						{inviter ? `${inviter} invited you to` : 'You’re invited to'}
					</div>
					<div
						style={{
							fontFamily: 'Display',
							fontSize: 84,
							lineHeight: 0.98,
							letterSpacing: -3.5,
							color: c.textPrimary
						}}
					>
						{page.name}
					</div>
					<div
						style={{
							fontFamily: 'Display',
							fontSize: 46,
							lineHeight: 1.05,
							letterSpacing: -1.8,
							color: c.textTertiary
						}}
					>
						{`${page.habit}.`}
					</div>
				</div>

				<div style={{ display: 'flex', gap: 36 }}>
					{page.dayNumber ? (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
							<div style={label(15, c.textTertiary)}>Day</div>
							<div
								style={label(22, c.textPrimary)}
							>{`${pad(page.dayNumber)} / ${pad(page.totalDays)}`}</div>
						</div>
					) : null}
					<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
						<div style={label(15, c.textTertiary)}>Crew</div>
						<div
							style={label(22, c.textPrimary)}
						>{`${page.members.length} / ${page.maxMembers}`}</div>
					</div>
					{page.stake ? (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
							<div style={label(15, c.textTertiary)}>Stake</div>
							<div style={label(22, c.textPrimary)}>{page.stake}</div>
						</div>
					) : null}
				</div>
			</div>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					width: 400,
					gap: 10
				}}
			>
				<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
					<div style={label(16, c.textPrimary)}>The wall</div>
					<div style={label(16, tone.ink)}>
						{active ? `${page.inCount} / ${page.heldCount} in today` : `${page.members.length} in`}
					</div>
				</div>
				{rows.map((day) => (
					<div
						key={day.day}
						style={{
							display: 'flex',
							gap: 6,
							padding: 4,
							borderRadius: 8,
							border: `2px solid ${day.kept ? tone.line : 'transparent'}`
						}}
					>
						{day.cells.map((cell) => (
							<div
								key={cell.userId}
								style={{
									display: 'flex',
									flex: 1,
									height: 54,
									borderRadius: 5,
									alignItems: 'center',
									justifyContent: 'center',
									background: cell.held && cell.in ? tone.fill : 'transparent',
									border: cell.held && !cell.in ? `2px dashed ${tone.line}` : 'none',
									opacity: cell.held ? 1 : 0,
									...label(15, tone.ink)
								}}
							>
								{cell.held && !cell.in ? initials(names.get(cell.userId) ?? null) : ''}
							</div>
						))}
					</div>
				))}
			</div>
		</div>,
		{ ...size, fonts }
	)
}
