import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
	ScrollView,
	StyleSheet,
	useWindowDimensions,
	View,
	type NativeScrollEvent,
	type NativeSyntheticEvent
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { CrewTone } from '@app/brand'
import type { PactColor } from '@app/contract'
import { PressableScale } from '@/components/motion/PressableScale'
import { OnFill } from '@/components/pact/CrewHero'
import { Signature } from '@/components/sign/Signature'
import { Button } from '@/components/ui/Button'
import { CornerMarks } from '@/components/ui/CornerMarks'
import { DemoWall } from '@/components/wall/DemoWall'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { track } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'
import { exitFade, fade } from '@/lib/motion'

type Page = {
	one: string
	two: string
	body: string
	color: PactColor
	art: (tone: CrewTone) => ReactNode
}

const PAGES: Page[] = [
	{
		one: 'Make a pact.',
		two: 'Sign it.',
		body: 'One habit, a few friends, a fixed run of days, and a stake for whoever slips. Everyone signs.',
		color: 'coral',
		art: (tone) => <PactArt tone={tone} />
	},
	{
		one: 'One photo a day.',
		two: 'Real proof.',
		body: 'Every day has a challenge to show in your photo, so it’s from today. An AI takes a look, and has opinions.',
		color: 'violet',
		art: (tone) => <WallArt tone={tone} />
	},
	{
		one: 'Everyone in,',
		two: 'or nobody is.',
		body: 'A day only counts when the whole crew is in. Nudge the stragglers. Miss one, and the wall shows it.',
		color: 'ocean',
		art: (tone) => <KeptArt tone={tone} />
	}
]

/**
 * The first-launch intro: three full-screen pages in crew colours (make a pact and sign it → a
 * real photo a day → everyone in, or nobody is), each with the thing itself: the signed card,
 * the wall, a kept row. Swipe or tap through; Skip is always there. Shown once per device
 * (lib/intro.ts). With Reduce Motion the pictures simply appear.
 */
export function Intro({ onDone }: { onDone: () => void }) {
	const { colors: c, layout } = useTheme()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const scroller = useRef<ScrollView>(null)
	const [page, setPage] = useState(0)
	const last = page === PAGES.length - 1
	const tone = c.crew[PAGES[page]!.color]

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
			style={[StyleSheet.absoluteFill, { backgroundColor: tone.fill }]}
			accessibilityViewIsModal
		>
			<ScrollView
				ref={scroller}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onMomentumScrollEnd={onScrollEnd}
				style={StyleSheet.absoluteFill}
			>
				{PAGES.map((p, i) => {
					const pageTone = c.crew[p.color]
					return (
						<View
							key={p.one}
							style={[
								s.page,
								{
									width,
									backgroundColor: pageTone.fill,
									paddingHorizontal: layout.gutterWide,
									paddingTop: insets.top + 84,
									paddingBottom: insets.bottom + 120
								}
							]}
						>
							{/* Keyed by arrival, so the picture comes in each time its page comes round. */}
							<View style={s.art} key={i === page ? 'here' : 'away'}>
								{i === page ? p.art(pageTone) : null}
							</View>
							<View style={s.copy}>
								<View>
									<OnFill tone={pageTone} variant="display">
										{p.one}
									</OnFill>
									<OnFill tone={pageTone} variant="display" muted>
										{p.two}
									</OnFill>
								</View>
								<OnFill tone={pageTone} variant="lead">
									{p.body}
								</OnFill>
							</View>
						</View>
					)
				})}
			</ScrollView>

			<View style={[s.top, { paddingTop: insets.top + 8, paddingHorizontal: layout.gutter }]}>
				<View style={s.ticks}>
					{PAGES.map((p, i) => (
						<View
							key={p.one}
							style={[s.tick, { backgroundColor: tone.onFill, opacity: i <= page ? 1 : 0.25 }]}
						/>
					))}
				</View>
				<View style={s.topRow}>
					<OnFill tone={tone} variant="mono">
						{`0${page + 1} / 0${PAGES.length}`}
					</OnFill>
					{last ? null : (
						<PressableScale
							onPress={() => finish(true)}
							scaleTo="button"
							accessibilityRole="button"
							accessibilityLabel="Skip the intro"
							hitSlop={12}
						>
							<OnFill tone={tone} variant="mono">
								Skip
							</OnFill>
						</PressableScale>
					)}
				</View>
			</View>

			<View
				style={[s.bottom, { paddingBottom: insets.bottom + 16, paddingHorizontal: layout.gutter }]}
			>
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

/** Three of the demo crew's signatures, as they signed Sunrise Yoga. */
const SIGNATURES = [
	'M27.4 85.0 L27.4 25.0 C67.4 25.0 67.4 85.0 27.4 85.0 M71.4 69.0 C97.4 37.0 115.4 91.0 141.4 65.0 C157.4 49.0 171.4 81.0 199.4 55.0 M10.0 97.0 L211.4 89.0',
	'M27.5 73.9 L37.5 27.9 L45.5 83.9 L53.7 54.0 L61.9 82.7 L69.2 67.1 L76.4 82.6 L84.8 65.1 L93.2 83.1 L97.8 61.9 L102.4 83.6 L107.5 60.7 L112.6 82.3 L120.4 63.9 L128.3 82.4 L132.4 68.4 L136.5 83.3 L144.1 66.7 L151.7 83.7 L221.7 39.9',
	'M18.0 86.1 Q30.0 0.1 36.4 73.2 M32.4 86.1 Q44.4 50.4 50.8 80.7 M46.8 86.1 Q58.8 52.4 67.1 81.0 M63.1 86.1 Q75.1 57.3 82.5 81.8 M78.5 86.1 Q90.5 54.0 100.0 81.3 M96.0 86.1 Q108.0 57.3 114.2 81.8 M110.2 86.1 Q122.2 29.7 130.8 77.6 M126.8 86.1 Q138.8 55.4 147.5 81.5 M153.5 36.1 L154.5 37.1 M18.0 96.1 Q71.8 90.1 159.5 98.1'
]

/** The signed pact card, the way the crew signs it. */
function PactArt({ tone }: { tone: CrewTone }) {
	const { colors: c } = useTheme()
	return (
		<Animated.View entering={FadeInDown.duration(300)}>
			<CornerMarks color={tone.onFill}>
				<View style={[s.card, { backgroundColor: c.inkOnArt }]}>
					<Text variant="mono" style={{ color: c.hero }}>
						Pact · 6am Run Club
					</Text>
					<Text variant="h3" style={{ color: c.hero }}>
						I, Ana, promise: run for 20 minutes, every day for 21 days. If I break it, I buy the
						coffees.
					</Text>
					<View style={s.signed}>
						{SIGNATURES.map((path) => (
							<Signature key={path.slice(0, 12)} path={path} ink={c.hero} width={88} />
						))}
					</View>
				</View>
			</CornerMarks>
		</Animated.View>
	)
}

/** Today's challenge over the wall: the proof is a real photo, and it's from today. */
function WallArt({ tone }: { tone: CrewTone }) {
	return (
		<View style={s.wallArt}>
			<OnFill tone={tone} variant="mono" muted>
				Today’s challenge · include something red
			</OnFill>
			<DemoWall
				tone={tone}
				onFill
				aspect={1.15}
				rows={[{ tiles: [11, 4, 8, { waiting: 'AN' }] }, { tiles: [2, 6, 9, 0], kept: true }]}
			/>
			<OnFill tone={tone} variant="h3">
				“Three fingers, zero excuses.”
			</OnFill>
		</View>
	)
}

/** A kept row, glowing, and today's still waiting on one. */
function KeptArt({ tone }: { tone: CrewTone }) {
	return (
		<View style={s.wallArt}>
			<DemoWall
				tone={tone}
				onFill
				aspect={1}
				rows={[
					{ tiles: [1, 3, 5, { waiting: 'DA' }] },
					{ tiles: [7, 10, 2, 11], kept: true },
					{ tiles: [4, 0, 6, 8], kept: true }
				]}
			/>
			<OnFill tone={tone} variant="mono" muted>
				3 / 4 in · waiting on Dan · 04:12:09 left
			</OnFill>
		</View>
	)
}

const s = StyleSheet.create({
	page: { flex: 1, justifyContent: 'space-between', gap: 24 },
	art: { flex: 1, justifyContent: 'center' },
	copy: { gap: 14 },
	top: { position: 'absolute', left: 0, right: 0, top: 0, gap: 12 },
	ticks: { flexDirection: 'row', gap: 4 },
	tick: { flex: 1, height: 3, borderRadius: 2 },
	topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
	bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
	card: { borderRadius: 6, padding: 18, gap: 14 },
	signed: { flexDirection: 'row', gap: 10 },
	wallArt: { gap: 14 }
})
