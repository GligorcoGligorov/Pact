import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSequence,
	withSpring,
	withTiming
} from 'react-native-reanimated'
import { EyeOff, MoreHorizontal, ShieldCheck } from 'lucide-react-native'
import { REACTIONS, type FeedEntry, type Reaction } from '@app/contract'
import { PressableScale } from '@/components/motion/PressableScale'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { crewTone } from '@/lib/crew'
import { displayName } from './Avatars'

/** The reactions' faces: the data says fire, clap, laugh; the person sees the emoji. */
export const REACTION_EMOJI: Record<Reaction, string> = { fire: '🔥', clap: '👏', laugh: '😂' }

const POP_SCALE = 1.35
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** "just now", "25m ago", "3h ago", then the weekday: the feed's sense of time. */
export function timeAgo(iso: string, now = Date.now()): string {
	const ms = Math.max(now - Date.parse(iso), 0)
	if (ms < MINUTE_MS) return 'just now'
	if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)}m ago`
	if (ms < DAY_MS) return `${Math.floor(ms / HOUR_MS)}h ago`
	return new Date(iso).toLocaleDateString(undefined, {
		weekday: 'short',
		day: 'numeric',
		month: 'short'
	})
}

/**
 * A crew member's check-in in the feed, photo first: the photo full width, a mono line on it
 * (who, which pact in its colour, when), the AI's line under it big, a suspicious one's flag and
 * reason (R15), and the crew's quick reactions.
 */
export function FeedCard({
	entry,
	myId,
	onReact,
	onMore
}: {
	entry: FeedEntry
	myId: string | null
	onReact: (reaction: Reaction) => void
	/** Report or block, for someone else's check-in. */
	onMore?: () => void
}) {
	const { colors: c } = useTheme()
	const name = displayName(entry)
	const mine = entry.user_id === myId
	const flagged = entry.verdict === 'suspicious'
	const tone = crewTone(c, entry.pact_color)
	const who = mine ? 'You' : name.split(' ')[0]

	return (
		<View style={s.card}>
			<PressableScale
				scaleTo="card"
				haptic={false}
				onPress={() => router.push(`/pact/${entry.pact_id}`)}
				accessibilityRole="button"
				accessibilityLabel={`${who} in ${entry.pact_name}`}
				style={s.header}
			>
				<View style={[s.swatch, { backgroundColor: tone.fill }]} />
				<Text variant="mono" numberOfLines={1} style={s.who}>
					{who} ·{' '}
					<Text variant="mono" style={{ color: tone.line }}>
						{entry.pact_name}
					</Text>
				</Text>
				<Text variant="mono" tone="tertiary">
					{timeAgo(entry.created_at)}
				</Text>
				{!mine && onMore ? (
					<PressableScale
						scaleTo="button"
						haptic="select"
						onPress={onMore}
						hitSlop={10}
						accessibilityRole="button"
						accessibilityLabel={`More for ${name}'s check-in`}
					>
						<MoreHorizontal size={20} color={c.textTertiary} />
					</PressableScale>
				) : null}
			</PressableScale>

			{entry.reported_by_me ? (
				<View style={[s.empty, { borderColor: c.borderSoft }]}>
					<EyeOff size={20} color={c.textTertiary} />
					<Text variant="bodySm" tone="secondary" style={s.flex}>
						You reported this photo, so it’s hidden for you.
					</Text>
				</View>
			) : entry.photo_url ? (
				<Image
					source={{ uri: entry.photo_url }}
					style={[s.photo, { backgroundColor: c.well }]}
					contentFit="cover"
					transition={200}
					accessibilityLabel={`${name}'s check-in photo for ${entry.habit}`}
				/>
			) : entry.kind === 'saver' ? (
				<View style={[s.empty, { borderColor: c.borderSoft }]}>
					<ShieldCheck size={20} color={c.textSecondary} />
					<Text variant="mono" tone="secondary">
						Saver used · the day holds
					</Text>
				</View>
			) : null}

			{entry.ai_caption ? <Text variant="h2">“{entry.ai_caption}”</Text> : null}

			{flagged ? (
				<Text variant="bodySm" tone="warning">
					Flagged · {entry.ai_reason ?? 'The AI judge has doubts about this one.'} It still counts.
				</Text>
			) : null}

			<View style={s.reactions}>
				{REACTIONS.map((reaction) => (
					<ReactionButton
						key={reaction}
						reaction={reaction}
						count={entry.reactions.counts[reaction]}
						selected={entry.reactions.mine.includes(reaction)}
						onPress={() => onReact(reaction)}
					/>
				))}
			</View>
		</View>
	)
}

function ReactionButton({
	reaction,
	count,
	selected,
	onPress
}: {
	reaction: Reaction
	count: number
	selected: boolean
	onPress: () => void
}) {
	const { colors: c } = useTheme()
	const scale = useSharedValue(1)
	const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

	return (
		<PressableScale
			scaleTo="button"
			haptic="select"
			onPress={() => {
				if (!selected) {
					scale.value = withSequence(
						withTiming(POP_SCALE, { duration: 110 }),
						withSpring(1, { damping: 9, stiffness: 260 })
					)
				}
				onPress()
			}}
			accessibilityRole="button"
			accessibilityState={{ selected }}
			accessibilityLabel={`${REACTION_EMOJI[reaction]} ${count}${selected ? ', yours' : ''}`}
			style={[
				s.reaction,
				{
					backgroundColor: selected ? c.surface2 : 'transparent',
					borderColor: selected ? c.textPrimary : c.borderSoft
				}
			]}
		>
			<Animated.Text style={[s.emoji, pop]}>{REACTION_EMOJI[reaction]}</Animated.Text>
			{count > 0 ? (
				<Text variant="mono" tone={selected ? 'primary' : 'secondary'}>
					{count}
				</Text>
			) : null}
		</PressableScale>
	)
}

const s = StyleSheet.create({
	card: { gap: 12 },
	header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	swatch: { width: 10, height: 10, borderRadius: 2 },
	who: { flex: 1 },
	flex: { flex: 1 },
	photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: 6 },
	empty: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		borderRadius: 6,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		paddingHorizontal: 16,
		paddingVertical: 28
	},
	reactions: { flexDirection: 'row', gap: 8, paddingHorizontal: 2 },
	reaction: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		minHeight: 40,
		minWidth: 56,
		justifyContent: 'center',
		paddingHorizontal: 14,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth
	},
	emoji: { fontSize: 18 }
})
