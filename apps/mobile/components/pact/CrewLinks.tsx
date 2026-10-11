import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedProps,
	useSharedValue,
	withRepeat,
	withTiming
} from 'react-native-reanimated'
import Svg, { Rect } from 'react-native-svg'
import type { TodayBoard } from '@app/contract'
import { PressableScale } from '@/components/motion/PressableScale'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { useReducedMotion } from '@/lib/motion'

type BoardMember = TodayBoard['members'][number]

export type NudgeControl = { sent: boolean; sending: boolean; onPress: () => void }

const STATE_LABEL = { in: 'In', saver: 'Saver', out: 'Not yet' } as const
/** Cells per row: four across a phone, wrapping for a bigger crew. */
const PER_ROW = 4
const GLYPH = { w: 40, h: 25, stroke: 3 }
/** An open link breathes on the same period as today's link in the chain. */
const BREATHE_MS = 1600

/**
 * Today's crew, everyone at once: each member's own link (closed in the crew's colour once
 * they're in, the saver's in ink, open and breathing while they're not), their first name and
 * their state in mono. A member who's out gets a Nudge (R20), never yourself. A suspicious
 * check-in is flagged in the cell, and its reason listed under the crew for everyone (R15).
 */
export function CrewLinks({
	members,
	myId,
	color,
	nudgeFor
}: {
	members: BoardMember[]
	myId: string | null
	/** The crew's colour as a line on the paper (`crewTone(...).line`). */
	color: string
	nudgeFor: (member: BoardMember) => NudgeControl
}) {
	const flagged = members.filter((m) => m.check_in?.verdict === 'suspicious')
	return (
		<View style={s.wrap}>
			<View style={s.grid}>
				{members.map((m) => (
					<Cell
						key={m.user_id}
						member={m}
						isMe={m.user_id === myId}
						color={color}
						nudge={nudgeFor(m)}
					/>
				))}
			</View>
			{flagged.map((m) => (
				<Text key={m.user_id} variant="bodySm" tone="warning">
					{firstName(m)}: {m.check_in?.ai_reason ?? 'The AI judge has doubts about this one.'}
				</Text>
			))}
		</View>
	)
}

function firstName(m: BoardMember): string {
	return m.display_name?.trim().split(/\s+/)[0] || 'A member'
}

function Cell({
	member,
	isMe,
	color,
	nudge
}: {
	member: BoardMember
	isMe: boolean
	color: string
	nudge: NudgeControl
}) {
	const name = isMe ? 'You' : firstName(member)
	const suspicious = member.check_in?.verdict === 'suspicious'
	return (
		<View
			style={s.cell}
			accessible={member.state !== 'out' || isMe}
			accessibilityLabel={`${name}: ${STATE_LABEL[member.state]}${suspicious ? ', flagged' : ''}`}
		>
			<LinkGlyph state={member.state} color={color} />
			<Text variant="label" numberOfLines={1}>
				{name}
			</Text>
			{member.state === 'out' && !isMe ? (
				<NudgeButton nudge={nudge} name={name} />
			) : (
				<Text
					variant="mono"
					tone={suspicious ? 'warning' : member.state === 'out' ? 'tertiary' : 'primary'}
				>
					{suspicious ? 'Flagged' : STATE_LABEL[member.state]}
				</Text>
			)}
		</View>
	)
}

const AnimatedRect = Animated.createAnimatedComponent(Rect)

/** One chain link for a person: closed when they're in, open and breathing while they're not. */
function LinkGlyph({ state, color }: { state: BoardMember['state']; color: string }) {
	const c = useColors()
	const reduced = useReducedMotion()
	const { w, h, stroke } = GLYPH
	const open = state === 'out'
	const breath = useSharedValue(1)
	useEffect(() => {
		if (!open || reduced) {
			cancelAnimation(breath)
			breath.value = 1
			return
		}
		breath.value = withRepeat(
			withTiming(0.35, { duration: BREATHE_MS / 2, easing: Easing.inOut(Easing.sin) }),
			-1,
			true
		)
		return () => cancelAnimation(breath)
	}, [breath, open, reduced])
	const props = useAnimatedProps(() => ({ opacity: breath.value }))
	return (
		<Svg width={w + stroke} height={h + stroke} accessibilityElementsHidden>
			<AnimatedRect
				x={stroke / 2}
				y={stroke / 2}
				width={w}
				height={h}
				rx={h / 2}
				fill="none"
				stroke={open ? c.borderActive : state === 'saver' ? c.textPrimary : color}
				strokeWidth={stroke}
				animatedProps={props}
			/>
		</Svg>
	)
}

/** A small outlined pill: "Nudge", a spinner while it sends, then "Nudged" for the rest of the day. */
function NudgeButton({ nudge, name }: { nudge: NudgeControl; name: string }) {
	const c = useColors()
	if (nudge.sent) {
		return (
			<Text variant="mono" tone="tertiary" accessibilityLabel={`${name} nudged`}>
				Nudged
			</Text>
		)
	}
	return (
		<PressableScale
			scaleTo="button"
			haptic="press"
			disabled={nudge.sending}
			onPress={nudge.onPress}
			accessibilityRole="button"
			accessibilityLabel={`Nudge ${name}`}
			hitSlop={10}
			style={[s.nudge, { borderColor: c.textPrimary }]}
		>
			{nudge.sending ? <ActivityIndicator size="small" color={c.textPrimary} /> : null}
			<Text variant="mono">Nudge</Text>
		</PressableScale>
	)
}

const s = StyleSheet.create({
	wrap: { gap: 12 },
	grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 20 },
	cell: { width: `${100 / PER_ROW}%`, gap: 6, alignItems: 'flex-start', paddingRight: 8 },
	nudge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth * 2
	}
})
