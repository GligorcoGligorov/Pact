import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import Animated, { FadeIn, FadeInDown, Keyframe } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Share, X } from 'lucide-react-native'
import type { CrewTone } from '@app/brand'
import { awardOf, joinNames, pledgeLine, stakeLine, type Wall } from '@app/contract'
import { Avatar, displayName } from '@/components/pact/Avatars'
import { OnFill } from '@/components/pact/CrewHero'
import { PressableScale } from '@/components/motion/PressableScale'
import { Signature } from '@/components/sign/Signature'
import { CornerMarks } from '@/components/ui/CornerMarks'
import { Text } from '@/components/ui/Text'
import { WallGrid } from '@/components/wall/WallGrid'
import { useColors } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { track } from '@/lib/analytics'
import { errorMessage } from '@/lib/api'
import { haptic } from '@/lib/haptics'
import { useReducedMotion } from '@/lib/motion'
import type { PactDetail } from '@/lib/pacts'
import type { PactResultDetail } from '@/lib/results'
import { drumrollMs, REVEAL } from '@/lib/reveal'
import { shareResult } from '@/lib/shareResult'

export const SLIDES = ['wall', 'awards', 'drumroll', 'loser', 'signatures'] as const
export type Slide = (typeof SLIDES)[number]

/** A tap on the left third goes back, anywhere else forward. */
const BACK_ZONE = 0.33
/** An award's winner photos, and how far a second one overlaps the first. */
const AWARD_FACE = 56
const FACE_OVERLAP = 0.35
/** The loser's own days: this many tiles a row. */
const DAYS_PER_ROW = 7

/** Each drumroll beat's number drops in and settles inside the beat. */
const beatIn = new Keyframe({
	0: { opacity: 0, transform: [{ translateY: -24 }, { scale: 1.15 }] },
	100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] }
}).duration(REVEAL.beatUpMs)

/**
 * R24 as stories, the way a crew screenshots a finish: full-screen slides you tap through, in
 * the crew's colour and on near-black by turns. The whole wall of the pact, the awards, a
 * drumroll that plays itself, who pays, and the signed pact with round 2. Numbered ticks on
 * top; a share button on every slide. Each slide fires `pact_result_story_viewed`; the drumroll
 * ending fires `onRevealed` (the screen's `pact_result_revealed`).
 */
export function Stories({
	detail,
	pact,
	wall,
	tone,
	myId,
	startRevealed,
	onRevealed,
	onClose,
	roundTwo
}: {
	detail: PactResultDetail
	/** The pact as members read it: their signatures. */
	pact: PactDetail | null
	wall: Wall | null
	tone: CrewTone
	myId: string | null
	/** This person has seen the reveal: no second drumroll, it starts on who pays. */
	startRevealed: boolean
	onRevealed: () => void
	onClose: () => void
	/** The last slide's action: round 2 with the same crew. */
	roundTwo: ReactNode
}) {
	const c = useColors()
	const insets = useSafeAreaInsets()
	const reduced = useReducedMotion()
	const { showToast } = useToast()
	const [index, setIndex] = useState(0)
	const [width, setWidth] = useState(1)
	const [beat, setBeat] = useState(0)
	const [revealed, setRevealed] = useState(startRevealed)
	const [sharing, setSharing] = useState(false)
	const timers = useRef<ReturnType<typeof setTimeout>[]>([])
	const slide = SLIDES[index]!
	const { pact: info, result } = detail

	useEffect(() => () => timers.current.forEach(clearTimeout), [])

	useEffect(() => {
		track('pact_result_story_viewed', { pact_id: info.id, slide })
		if (slide !== 'drumroll') return
		if (revealed || reduced) {
			// Seen it before (or no motion): straight on to who pays.
			if (!revealed) {
				setRevealed(true)
				onRevealed()
			}
			setIndex(SLIDES.indexOf('loser'))
			return
		}
		// The drumroll plays itself: a light tap per beat, then the answer.
		for (let b = 0; b < REVEAL.beats; b++) {
			timers.current.push(
				setTimeout(() => {
					setBeat(b)
					haptic.press()
				}, b * REVEAL.beatMs)
			)
		}
		timers.current.push(
			setTimeout(() => {
				haptic.success()
				setRevealed(true)
				onRevealed()
				setIndex(SLIDES.indexOf('loser'))
			}, drumrollMs)
		)
		// Runs when the slide changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [slide])

	function go(delta: number) {
		// The drumroll can't be skipped past, and who pays can't be reached before it.
		if (slide === 'drumroll') return
		const next = index + delta
		if (next < 0 || next >= SLIDES.length) return
		if (SLIDES[next] === 'loser' && !revealed) return setIndex(SLIDES.indexOf('drumroll'))
		haptic.select()
		setIndex(next)
	}

	async function share() {
		setSharing(true)
		try {
			const method = await shareResult(info.id, info.name)
			if (method) track('pact_result_shared', { pact_id: info.id, method, slide })
		} catch (error) {
			haptic.error()
			showToast(errorMessage(error), 'error')
		} finally {
			setSharing(false)
		}
	}

	const loud = slide === 'awards' || slide === 'loser' || slide === 'signatures'
	const ground = loud ? tone.fill : slide === 'drumroll' ? c.bg : tone.deep
	const ink = loud ? tone.onFill : c.textPrimary
	const pad = (n: number) => String(n).padStart(2, '0')

	return (
		<View
			style={[s.root, { backgroundColor: ground, paddingTop: insets.top + 8 }]}
			onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
		>
			<View style={s.ticks}>
				{SLIDES.map((name, i) => (
					<View
						key={name}
						style={[s.tick, { backgroundColor: ink, opacity: i <= index ? 1 : 0.25 }]}
					/>
				))}
			</View>
			<View style={s.top}>
				<Text variant="mono" style={{ color: ink }}>
					{pad(index + 1)} / {pad(SLIDES.length)} · {info.name}
				</Text>
				<PressableScale
					onPress={onClose}
					scaleTo={0.9}
					haptic="select"
					accessibilityRole="button"
					accessibilityLabel="Close"
					hitSlop={12}
				>
					<X size={22} color={ink} strokeWidth={2} />
				</PressableScale>
			</View>

			<Pressable
				style={s.body}
				onPress={(e) => go(e.nativeEvent.pageX < width * BACK_ZONE ? -1 : 1)}
				accessibilityRole="button"
				accessibilityLabel="Next"
				accessibilityHint="Tap the left side to go back"
			>
				<Animated.View
					key={slide}
					entering={reduced ? undefined : FadeIn.duration(240)}
					style={s.slide}
				>
					{slide === 'wall' ? (
						<>
							<Headline
								one={`${result.kept_days} of ${result.total_days} days,`}
								two="kept together."
								color={ink}
								muted={c.textTertiary}
							/>
							{wall ? <WallFill wall={wall} myId={myId} tone={tone} /> : null}
							<Text variant="mono" tone="secondary">
								Best run {pad(result.best_streak)} days · {wall?.members.length ?? 0} people
							</Text>
						</>
					) : slide === 'awards' ? (
						<>
							<OnFill tone={tone} variant="mono" muted>
								The awards
							</OnFill>
							<View style={s.awards}>
								{awardRows(detail, myId).map((row, i) => (
									<Animated.View
										key={row.kind}
										entering={reduced ? undefined : FadeInDown.delay(i * 60).duration(280)}
										style={s.award}
									>
										<Faces
											ids={row.ids}
											wall={wall}
											detail={detail}
											size={AWARD_FACE}
											tone={tone}
										/>
										<View style={s.flex}>
											<OnFill tone={tone} variant="mono" muted>
												{pad(i + 1)} / {row.title}
											</OnFill>
											<OnFill tone={tone} variant="h2">
												{row.names}
											</OnFill>
										</View>
									</Animated.View>
								))}
							</View>
						</>
					) : slide === 'drumroll' ? (
						<View style={s.center}>
							<Text variant="mono" tone="secondary">
								{info.stake ? `The stake · ${info.stake}` : 'Who came last?'}
							</Text>
							<Text variant="display">Who pays?</Text>
							<Animated.View key={beat} entering={reduced ? undefined : beatIn}>
								<Text variant="displayHero" tabular style={s.beat}>
									{pad(REVEAL.beats - beat)}
								</Text>
							</Animated.View>
						</View>
					) : slide === 'loser' ? (
						<Loser detail={detail} tone={tone} myId={myId} wall={wall} />
					) : (
						<Signatures detail={detail} pact={pact} roundTwo={roundTwo} tone={tone} />
					)}
				</Animated.View>
			</Pressable>

			<View style={[s.bottom, { paddingBottom: insets.bottom + 12 }]}>
				<PressableScale
					onPress={share}
					disabled={sharing}
					scaleTo="button"
					haptic="press"
					accessibilityRole="button"
					accessibilityLabel="Share the results"
					style={[s.share, { borderColor: ink }]}
				>
					<Share size={16} color={ink} strokeWidth={1.8} />
					<Text variant="mono" style={{ color: ink }}>
						{sharing ? 'Sharing…' : 'Share'}
					</Text>
				</PressableScale>
			</View>
		</View>
	)
}

function Headline({
	one,
	two,
	color,
	muted
}: {
	one: string
	two: string
	color: string
	muted: string
}) {
	return (
		<View>
			<Text variant="display" style={{ color }}>
				{one}
			</Text>
			<Text variant="display" style={{ color: muted }}>
				{two}
			</Text>
		</View>
	)
}

function awardRows(detail: PactResultDetail, myId: string | null) {
	const members = new Map(detail.result.members.map((m) => [m.user_id, m]))
	return detail.result.awards.flatMap((award) => {
		const meta = awardOf(award.kind)
		if (!meta) return []
		const names = award.user_ids
			.map((id) => members.get(id))
			.filter((m) => m !== undefined)
			.sort((a, b) => Number(b.user_id === myId) - Number(a.user_id === myId))
			.map((m) => (m.user_id === myId ? 'You' : displayName(m)))
		return names.length > 0
			? [{ kind: award.kind, title: meta.title, names: joinNames(names), ids: award.user_ids }]
			: []
	})
}

/** A member's photos on the wall, newest first, with how much the crew reacted to each. */
function photosOf(wall: Wall | null, userId: string) {
	if (!wall) return []
	return wall.days.flatMap((day) => {
		const checkIn = day.cells.find((cell) => cell.user_id === userId)?.check_in
		if (!checkIn?.photo_url) return []
		const { fire, clap, laugh } = checkIn.reactions.counts
		return [{ day: day.day, url: checkIn.photo_url, cheers: fire + clap + laugh }]
	})
}

/** Their best photo: the one the crew reacted to most, the latest on a tie. */
function bestPhoto(wall: Wall | null, userId: string): string | null {
	const photos = photosOf(wall, userId)
	if (photos.length === 0) return null
	return photos.reduce((best, p) => (p.cheers > best.cheers ? p : best), photos[0]!).url
}

/** Each winner's best photo, overlapping; their avatar when they have none. */
function Faces({
	ids,
	wall,
	detail,
	size,
	tone
}: {
	ids: string[]
	wall: Wall | null
	detail: PactResultDetail
	size: number
	tone: CrewTone
}) {
	const names = new Map(detail.result.members.map((m) => [m.user_id, displayName(m)]))
	// A fixed-width column, room for two overlapping photos, so every award's text lines up.
	return (
		<View style={[s.faces, { width: size * (2 - FACE_OVERLAP) }]}>
			{ids.slice(0, 2).map((id, i) => {
				const url = bestPhoto(wall, id)
				return (
					<View
						key={id}
						style={[
							s.face,
							{ width: size, height: size, borderColor: tone.fill },
							i > 0 && { marginLeft: -size * FACE_OVERLAP }
						]}
					>
						{url ? (
							<Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" />
						) : (
							<Avatar userId={id} name={names.get(id) ?? ''} size={size - 4} />
						)}
					</View>
				)
			})}
		</View>
	)
}

/**
 * Who pays: their own photo, big, the stake said about them and a line on their side, then
 * their pact day by day: a photo for each day they kept, an empty tile for each they missed.
 */
function Loser({
	detail,
	tone,
	myId,
	wall
}: {
	detail: PactResultDetail
	tone: CrewTone
	myId: string | null
	wall: Wall | null
}) {
	const c = useColors()
	const [width, setWidth] = useState(0)
	const { result, pact } = detail
	const losers = result.members.filter((m) => m.is_loser)
	const nobody = result.outcome !== 'loser' || losers.length === 0
	const names = losers.map((m) => (m.user_id === myId ? 'You' : displayName(m)))
	const said = nobody ? 'Nobody pays.' : stakeLine(names, pact.stake)
	const headline = /[\p{L}\p{N}]$/u.test(said) ? `${said}.` : said
	const first = losers[0]
	const line = nobody
		? 'All of you held it together. Frame this.'
		: losers.length > 1
			? `Tied at the bottom: ${joinNames(names)} split it.`
			: `${first?.days_done} of ${first?.days_held} days. Next round is ${names[0] === 'You' ? 'yours' : `${names[0]}’s`}.`
	const photo = first && !nobody ? bestPhoto(wall, first.user_id) : null
	// Their days, oldest first: what they kept and what they missed.
	const days =
		first && !nobody && wall
			? [...wall.days].reverse().map((day) => {
					const cell = day.cells.find((x) => x.user_id === first.user_id)
					return { day: day.day, held: !!cell?.held, checkIn: cell?.check_in ?? null }
				})
			: []
	const tile = width > 0 ? (width - GAP_DAYS * (DAYS_PER_ROW - 1)) / DAYS_PER_ROW : 0

	return (
		<View style={s.loser}>
			<OnFill tone={tone} variant="mono" muted>
				{nobody ? 'Everybody wins' : 'Pays'}
			</OnFill>
			{photo ? (
				<CornerMarks color={tone.onFill} style={s.loserPhoto}>
					<Image source={{ uri: photo }} style={s.fill} contentFit="cover" />
				</CornerMarks>
			) : (
				<View style={s.faces}>
					{(nobody ? result.members : losers).map((m, i) => (
						<View key={m.user_id} style={i > 0 ? s.overlap : undefined}>
							<Avatar userId={m.user_id} name={displayName(m)} size={nobody ? 64 : 112} />
						</View>
					))}
				</View>
			)}
			<View>
				<OnFill tone={tone} variant="display">
					{headline}
				</OnFill>
				<OnFill tone={tone} variant="h2" muted>
					{line}
				</OnFill>
			</View>
			{days.length > 0 ? (
				<View style={s.days} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
					{days.map((d) =>
						d.checkIn?.photo_url ? (
							<Image
								key={d.day}
								source={{ uri: d.checkIn.photo_url }}
								style={[s.dayTile, { width: tile, height: tile }]}
								contentFit="cover"
							/>
						) : d.checkIn ? (
							<View
								key={d.day}
								style={[
									s.dayTile,
									{ width: tile, height: tile, backgroundColor: tone.onFillTrack }
								]}
							/>
						) : (
							<View
								key={d.day}
								accessibilityLabel={`Missed ${d.day}`}
								style={[
									s.dayTile,
									s.missed,
									{ width: tile, height: tile, borderColor: d.held ? tone.onFill : c.borderSoft }
								]}
							/>
						)
					)}
				</View>
			) : null}
		</View>
	)
}

/**
 * The results' wall, filling what the slide has left: tiles as wide as the columns allow and as
 * tall as the rows allow, the rows arriving one by one.
 */
function WallFill({ wall, myId, tone }: { wall: Wall; myId: string | null; tone: CrewTone }) {
	const [height, setHeight] = useState(0)
	const rows = Math.max(wall.days.length, 1)
	// Each mini row is its tiles plus the frame (3) on both sides and a 1pt gap above.
	const tileHeight = height > 0 ? Math.max(height / rows - 7, 12) : 0
	return (
		<View style={s.wallFill} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
			{height > 0 ? (
				<WallGrid
					wall={wall}
					myId={myId}
					tone={tone}
					mini
					maxTile={999}
					tileHeight={tileHeight}
					cascade
				/>
			) : null}
		</View>
	)
}

/** The signed pact, at the end: what everyone promised, and their signatures. Then round 2. */
function Signatures({
	detail,
	pact,
	roundTwo,
	tone
}: {
	detail: PactResultDetail
	pact: PactDetail | null
	roundTwo: ReactNode
	tone: CrewTone
}) {
	const c = useColors()
	const info = detail.pact
	const signed = (pact?.members ?? []).filter((m) => m.signature)
	const days = detail.result.total_days
	return (
		<View style={s.signatures}>
			<View>
				<OnFill tone={tone} variant="display">
					Signed.
				</OnFill>
				<OnFill tone={tone} variant="display" muted>
					{signed.length === (pact?.members.length ?? 0) ? 'Every one of you.' : 'Kept, mostly.'}
				</OnFill>
			</View>
			<CornerMarks color={tone.onFill}>
				<View style={[s.card, { backgroundColor: c.inkOnArt }]}>
					<Text variant="mono" style={{ color: c.hero }}>
						The pact · {info.name}
					</Text>
					<Text variant="h2" style={{ color: c.hero }}>
						{pledgeLine(null, info.habit, info.cadence, days, info.stake)}
					</Text>
					<View style={s.signed}>
						{signed.map((m) => (
							<View key={m.user_id} style={s.signer}>
								<Signature path={m.signature!} ink={c.hero} width={120} />
								<Text variant="mono" style={{ color: c.hero, opacity: 0.6 }}>
									{displayName(m).split(' ')[0]}
								</Text>
							</View>
						))}
						{signed.length === 0 ? (
							<Text variant="bodySm" style={{ color: c.hero }}>
								Nobody signed this one.
							</Text>
						) : null}
					</View>
				</View>
			</CornerMarks>
			{roundTwo}
		</View>
	)
}

const GAP_DAYS = 4

const s = StyleSheet.create({
	root: { flex: 1, paddingHorizontal: 16 },
	ticks: { flexDirection: 'row', gap: 4 },
	tick: { flex: 1, height: 3, borderRadius: 2 },
	top: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 14
	},
	body: { flex: 1 },
	slide: { flex: 1, gap: 20, paddingTop: 4 },
	flex: { flex: 1 },
	fill: { width: '100%', height: '100%', borderRadius: 4 },
	wallFill: { flex: 1 },
	awards: { flex: 1, justifyContent: 'space-around', paddingBottom: 8 },
	award: { flexDirection: 'row', alignItems: 'center', gap: 16 },
	faces: { flexDirection: 'row' },
	face: {
		borderRadius: 6,
		borderWidth: 2,
		overflow: 'hidden',
		alignItems: 'center',
		justifyContent: 'center'
	},
	center: { flex: 1, justifyContent: 'center', gap: 16 },
	beat: { fontSize: 140, lineHeight: 140 },
	loser: { flex: 1, justifyContent: 'space-between', gap: 16 },
	loserPhoto: { flex: 1, minHeight: 160 },
	days: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP_DAYS },
	dayTile: { borderRadius: 3 },
	missed: { borderWidth: 1.5, borderStyle: 'dashed' },
	overlap: { marginLeft: -14 },
	signatures: { flex: 1, justifyContent: 'space-evenly', gap: 20 },
	card: { borderRadius: 6, padding: 20, gap: 18 },
	signed: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
	signer: { gap: 4 },
	bottom: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 12 },
	share: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth * 2
	}
})
