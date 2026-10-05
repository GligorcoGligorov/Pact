import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { crewThemeOf, inviteCodeSchema } from '@app/contract'
import { composite, theme } from '@app/brand'
import { getJoinPage } from '@/server/pacts/join-page'

export const runtime = 'nodejs'
export const alt = 'An invite to a pact on Pact'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** The light palette's colours: an image has no CSS variables, so it reads the tokens directly. */
const c = theme.palettes.light
const AVATAR_LOOKS = [
	{ bg: c.brandDim, fg: c.brandInk },
	{ bg: c.infoSoft, fg: c.infoText },
	{ bg: c.warningSoft, fg: c.warningText },
	{ bg: c.errorSoft, fg: c.errorText },
	{ bg: c.surface3, fg: c.textPrimary }
]
const MAX_FACES = 6
const RING = 220
const RING_STROKE = 22

function hueIndex(userId: string): number {
	let hash = 0
	for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
	return hash % AVATAR_LOOKS.length
}

function initials(name: string): string {
	const parts = name.trim().split(/\s+/)
	return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2)).toUpperCase()
}

const font = (file: string) => readFile(path.join(process.cwd(), 'assets/fonts', file))

/**
 * The card an invite link unfurls into in WhatsApp or iMessage: who invited you, the pact, the
 * crew's faces with today's checks and the ring. Same data rules as the page (R27).
 */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
	const code = (await params).code.toUpperCase()
	const page = inviteCodeSchema.safeParse(code).success ? await getJoinPage(code) : null
	const [display, medium, bold] = await Promise.all([
		font('BricolageGrotesque_800ExtraBold.ttf'),
		font('Inter_500Medium.ttf'),
		font('Inter_700Bold.ttf')
	])
	const fonts = [
		{ name: 'Bricolage', data: display, weight: 800 as const },
		{ name: 'Inter', data: medium, weight: 500 as const },
		{ name: 'Inter', data: bold, weight: 700 as const }
	]

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
					fontFamily: 'Bricolage',
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
	const r = (RING - RING_STROKE) / 2
	const circumference = 2 * Math.PI * r
	const share = active ? page.inCount / page.heldCount : 0
	const faces = page.members.slice(0, MAX_FACES)
	// The crew's colour and emoji, as on the page: the mark, the habit, the hero and its ring.
	const crew = crewThemeOf(page.color, page.emoji)
	const tone = c.crew[crew.color]

	return new ImageResponse(
		<div
			style={{
				display: 'flex',
				width: '100%',
				height: '100%',
				background: c.bg,
				padding: 64,
				fontFamily: 'Inter'
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					flex: 1,
					justifyContent: 'space-between'
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
					<div
						style={{
							display: 'flex',
							width: 56,
							height: 56,
							borderRadius: 28,
							background: tone.fill,
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 32
						}}
					>
						{crew.emoji}
					</div>
					<div style={{ fontFamily: 'Bricolage', fontSize: 36, color: c.textPrimary }}>Pact</div>
				</div>

				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<div
						style={{
							fontSize: 30,
							fontWeight: 700,
							color: c.textTertiary,
							letterSpacing: 2,
							textTransform: 'uppercase'
						}}
					>
						{inviter ? `${inviter} invited you to` : 'You’re invited to'}
					</div>
					<div
						style={{
							fontFamily: 'Bricolage',
							fontSize: 92,
							lineHeight: 1,
							color: c.textPrimary,
							letterSpacing: -3
						}}
					>
						{page.name}
					</div>
					<div style={{ fontSize: 36, fontWeight: 500, color: tone.ink }}>{page.habit}</div>
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
					<div style={{ display: 'flex' }}>
						{faces.map((m, i) => {
							const look = AVATAR_LOOKS[hueIndex(m.userId)]
							const done = m.state === 'in' || m.state === 'saver'
							return (
								<div
									key={m.userId}
									style={{
										display: 'flex',
										position: 'relative',
										marginLeft: i === 0 ? 0 : -18,
										width: 72,
										height: 72,
										borderRadius: 36,
										background: look.bg,
										color: look.fg,
										border: `4px solid ${c.bg}`,
										alignItems: 'center',
										justifyContent: 'center',
										fontSize: 26,
										fontWeight: 700,
										opacity: m.state === 'out' ? 0.6 : 1
									}}
								>
									{initials(m.name?.trim() || 'A member')}
									{done ? (
										<div
											style={{
												display: 'flex',
												position: 'absolute',
												right: -6,
												bottom: -6,
												width: 30,
												height: 30,
												borderRadius: 15,
												background: c.brandFill,
												border: `3px solid ${c.bg}`,
												alignItems: 'center',
												justifyContent: 'center'
											}}
										>
											<svg width={16} height={16} viewBox="0 0 24 24">
												<polyline
													points="4 12 10 18 20 6"
													fill="none"
													stroke={c.onBrand}
													strokeWidth={4}
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											</svg>
										</div>
									) : null}
								</div>
							)
						})}
					</div>
					<div style={{ fontSize: 30, fontWeight: 500, color: c.textSecondary }}>
						{active
							? `${page.inCount} of ${page.heldCount} in today`
							: `${page.members.length} in the crew`}
					</div>
				</div>
			</div>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					width: 360,
					borderRadius: 40,
					background: composite(tone.heroWash, c.hero),
					alignItems: 'center',
					justifyContent: 'center',
					gap: 22
				}}
			>
				<div
					style={{
						display: 'flex',
						position: 'relative',
						width: RING,
						height: RING,
						alignItems: 'center',
						justifyContent: 'center'
					}}
				>
					<svg
						width={RING}
						height={RING}
						style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
					>
						<circle
							cx={RING / 2}
							cy={RING / 2}
							r={r}
							fill="none"
							stroke={c.heroBorder}
							strokeWidth={RING_STROKE}
						/>
						{share > 0 ? (
							<circle
								cx={RING / 2}
								cy={RING / 2}
								r={r}
								fill="none"
								stroke={tone.fill}
								strokeWidth={RING_STROKE}
								strokeLinecap="round"
								strokeDasharray={`${circumference}`}
								strokeDashoffset={circumference * (1 - share)}
							/>
						) : null}
					</svg>
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
						<div style={{ fontFamily: 'Bricolage', fontSize: 64, color: c.heroText }}>
							{active ? `${page.inCount}/${page.heldCount}` : page.members.length}
						</div>
						<div style={{ fontSize: 24, fontWeight: 500, color: c.heroTextSecondary }}>
							{active ? 'in today' : 'members'}
						</div>
					</div>
				</div>
				<div style={{ fontSize: 26, fontWeight: 700, color: tone.heroInk }}>
					{page.dayNumber ? `Day ${page.dayNumber} of ${page.totalDays}` : `${page.totalDays} days`}
				</div>
			</div>
		</div>,
		// The fonts carry no emoji: Twemoji draws the crew's.
		{ ...size, fonts, emoji: 'twemoji' }
	)
}
