import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
	type NativeScrollEvent,
	type NativeSyntheticEvent
} from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { PactColor } from '@app/contract'
import { Pop } from '@/components/motion/Pop'
import { Avatar } from '@/components/pact/Avatars'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { track } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'
import { exitFade, fade } from '@/lib/motion'

type Page = { title: string; body: string; art: () => ReactNode }

const PAGES: Page[] = [
	{
		title: 'Make a pact with your crew',
		body: 'One habit, a few friends, a fixed run of days. And a stake: loser buys the coffees.',
		art: () => <CrewArt />
	},
	{
		title: 'A photo every day, with a twist',
		body: 'Every day has a challenge to show in your photo, so it’s from today. An AI takes a look, and has opinions.',
		art: () => <PhotoArt />
	},
	{
		title: 'Keep the chain together',
		body: 'A day only counts when everyone’s in. Nudge the stragglers, save a streak, win together.',
		art: () => <ChainArt />
	}
]

/**
 * The first-launch intro: three short screens (make a pact → a photo every day, with a twist →
 * keep the chain together). Swipe or tap through; Skip is always there. Shown once per device
 * (lib/intro.ts). Each picture pops in as its page arrives, inside the fun pass's 400ms; with
 * Reduce Motion it simply appears.
 */
export function Intro({ onDone }: { onDone: () => void }) {
	const { colors: c, layout } = useTheme()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const scroller = useRef<ScrollView>(null)
	const [page, setPage] = useState(0)
	const last = page === PAGES.length - 1

	useEffect(() => {
		track('intro_step_viewed', { step: page + 1 })
	}, [page])

	function go(next: number) {
		scroller.current?.scrollTo({ x: next * width, animated: true })
		setPage(next)
	}

	function finish(skipped: boolean) {
		haptic.snap()
		track('intro_completed', { skipped })
		onDone()
	}

	function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
		const next = Math.round(e.nativeEvent.contentOffset.x / width)
		if (next !== page) {
			haptic.select()
			setPage(next)
		}
	}

	return (
		<Animated.View
			entering={fade(0, 200)}
			exiting={exitFade()}
			style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}
			accessibilityViewIsModal
		>
			<View style={[s.top, { paddingTop: insets.top + 8, paddingHorizontal: layout.gutter }]}>
				{last ? (
					<View />
				) : (
					<Button label="Skip" variant="ghost" size="sm" onPress={() => finish(true)} />
				)}
			</View>

			<ScrollView
				ref={scroller}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onMomentumScrollEnd={onScrollEnd}
				style={s.pager}
			>
				{PAGES.map((p, i) => (
					<View key={p.title} style={[s.page, { width, paddingHorizontal: layout.gutterWide }]}>
						{/* Keyed by arrival, so the picture pops in each time its page comes round. */}
						<View style={s.art} key={i === page ? 'here' : 'away'}>
							{i === page ? p.art() : null}
						</View>
						<View style={s.copy}>
							<Text variant="eyebrow" tone="brand">
								{i + 1} of {PAGES.length}
							</Text>
							<Text variant="h1">{p.title}</Text>
							<Text variant="lead" tone="secondary">
								{p.body}
							</Text>
						</View>
					</View>
				))}
			</ScrollView>

			<View
				style={[s.bottom, { paddingBottom: insets.bottom + 16, paddingHorizontal: layout.gutter }]}
			>
				<View style={s.dots} accessibilityElementsHidden>
					{PAGES.map((p, i) => (
						<View
							key={p.title}
							style={[
								s.dot,
								{
									width: i === page ? 22 : 8,
									backgroundColor: i === page ? c.brandFill : c.surface3
								}
							]}
						/>
					))}
				</View>
				<Button
					label={last ? 'Let’s go' : 'Next'}
					size="lg"
					fullWidth
					withArrow
					onPress={() => (last ? finish(false) : go(page + 1))}
				/>
			</View>
		</Animated.View>
	)
}

// ─── The pictures ─────────────────────────────────────────────────────────────

function Badge({ color, emoji, size }: { color: PactColor; emoji: string; size: number }) {
	const { colors: c } = useTheme()
	return (
		<View
			style={{
				width: size,
				height: size,
				borderRadius: size / 2,
				backgroundColor: c.crew[color].fill,
				alignItems: 'center',
				justifyContent: 'center'
			}}
		>
			<Text style={{ fontSize: size * 0.48, lineHeight: size * 0.6 }}>{emoji}</Text>
		</View>
	)
}

/** Three crews and a stake: what a pact is. */
function CrewArt() {
	const { colors: c, elevation } = useTheme()
	return (
		<View style={s.cluster}>
			<Pop style={[s.at, { left: 18, top: 30 }]}>
				<Badge color="coral" emoji="🏃" size={96} />
			</Pop>
			<Pop delay={70} style={[s.at, { right: 22, top: 8 }]}>
				<Badge color="violet" emoji="🧘" size={76} />
			</Pop>
			<Pop delay={140} style={[s.at, { right: 52, bottom: 76 }]}>
				<Badge color="ocean" emoji="📚" size={84} />
			</Pop>
			<Pop delay={240} style={[s.at, { left: 30, bottom: 22 }]}>
				<View style={[s.chip, elevation.card, { backgroundColor: c.surface }]}>
					<Text variant="label">☕ Loser buys the coffees</Text>
				</View>
			</Pop>
		</View>
	)
}

/** The polaroid, the day's challenge in it, and the AI's verdict. */
function PhotoArt() {
	const { colors: c, elevation } = useTheme()
	return (
		<View style={s.cluster}>
			<Pop style={[s.at, { left: 16, top: 0 }]}>
				<View style={[s.chip, { backgroundColor: c.brandDim }]}>
					<Text variant="label" tone="brand">
						Today: show a peace sign
					</Text>
				</View>
			</Pop>
			<Pop delay={80} style={[s.at, s.polaroidSpot]}>
				<View style={[s.polaroid, elevation.raised, { backgroundColor: c.surface }]}>
					<View style={[s.photo, { backgroundColor: c.crew.sun.dim }]}>
						<Text style={s.photoEmoji}>✌️</Text>
					</View>
					<Text variant="caption" tone="secondary" style={s.center}>
						Day 3 · 7:12
					</Text>
				</View>
			</Pop>
			<Pop delay={260} style={[s.at, { right: 6, bottom: 18 }]}>
				<View style={[s.bubble, elevation.card, { backgroundColor: c.surface }]}>
					<Text variant="bodySm">🤖 “Two fingers, zero excuses.”</Text>
				</View>
			</Pop>
		</View>
	)
}

const CHAIN = 7
const CHAIN_STEP_MS = 45

/** A week of kept days, everyone's face checked, and the flame. */
function ChainArt() {
	const { colors: c } = useTheme()
	const tone = c.crew.sky
	return (
		<View style={[s.cluster, s.chainArt]}>
			<View style={s.chain}>
				{Array.from({ length: CHAIN }, (_, i) => (
					<Pop key={i} delay={i * CHAIN_STEP_MS}>
						<View style={[s.tile, { backgroundColor: tone.fill }]}>
							<Text style={{ color: tone.onFill, fontWeight: '800' }}>✓</Text>
						</View>
					</Pop>
				))}
			</View>
			<View style={s.faces}>
				{['Ana', 'Ben', 'Cleo', 'Dan'].map((name, i) => (
					<View key={name} style={i > 0 ? s.overlap : undefined}>
						<Avatar userId={`intro-${name}`} name={name} size={52} state="in" breathe={false} />
					</View>
				))}
			</View>
			<Pop delay={CHAIN * CHAIN_STEP_MS}>
				<Text style={s.flame}>🔥 7</Text>
			</Pop>
		</View>
	)
}

const s = StyleSheet.create({
	top: { flexDirection: 'row', justifyContent: 'flex-end', minHeight: 52 },
	pager: { flex: 1 },
	page: { flex: 1, justifyContent: 'center', gap: 28 },
	art: { height: 280, justifyContent: 'center' },
	copy: { gap: 10 },
	bottom: { gap: 18 },
	dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
	dot: { height: 8, borderRadius: 4 },
	cluster: { height: 260, position: 'relative' },
	at: { position: 'absolute' },
	chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
	polaroidSpot: { left: 70, top: 46 },
	polaroid: {
		padding: 10,
		paddingBottom: 12,
		borderRadius: 14,
		gap: 8,
		transform: [{ rotate: '-6deg' }]
	},
	photo: {
		width: 150,
		height: 150,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center'
	},
	photoEmoji: { fontSize: 72, lineHeight: 86 },
	bubble: {
		borderRadius: 18,
		borderBottomRightRadius: 4,
		paddingHorizontal: 14,
		paddingVertical: 10
	},
	center: { textAlign: 'center' },
	chainArt: { alignItems: 'center', justifyContent: 'center', gap: 22 },
	chain: { flexDirection: 'row', gap: 6 },
	tile: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	faces: { flexDirection: 'row' },
	overlap: { marginLeft: -12 },
	flame: { fontSize: 34, lineHeight: 42, fontWeight: '800' }
})
