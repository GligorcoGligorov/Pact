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
import { ShieldCheck, TriangleAlert } from 'lucide-react-native'
import { REACTIONS, type FeedEntry, type Reaction } from '@app/contract'
import { PressableScale } from '@/components/motion/PressableScale'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { Avatar, displayName } from './Avatars'

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
 * A crew member's check-in in the feed: who, which pact, when; the photo in its card; the AI's
 * caption, and a suspicious one's flag and reason (R15); and the crew's quick reactions.
 */
export function FeedCard({
	entry,
	myId,
	onReact
}: {
	entry: FeedEntry
	myId: string | null
	onReact: (reaction: Reaction) => void
}) {
	const { colors: c, elevation } = useTheme()
	const name = displayName(entry)
	const mine = entry.user_id === myId
	const flagged = entry.verdict === 'suspicious'

	return (
		<View
			style={[
				s.card,
				{ backgroundColor: c.surface, borderColor: c.borderHairline },
				elevation.card
			]}
		>
			<PressableScale
				scaleTo="card"
				haptic={false}
				onPress={() => router.push(`/pact/${entry.pact_id}`)}
				accessibilityRole="button"
				accessibilityLabel={`${mine ? 'You' : name} in ${entry.pact_name}`}
				style={s.header}
			>
				<Avatar userId={entry.user_id} name={name} size={38} />
				<View style={s.who}>
					<Text variant="label" numberOfLines={1}>
						{mine ? 'You' : name}
					</Text>
					<Text variant="caption" tone="tertiary" numberOfLines={1}>
						{entry.pact_name} · {timeAgo(entry.created_at)}
					</Text>
				</View>
			</PressableScale>

			{entry.photo_url ? (
				<Image
					source={{ uri: entry.photo_url }}
					style={[s.photo, { backgroundColor: c.well }]}
					contentFit="cover"
					transition={200}
					accessibilityLabel={`${name}'s check-in photo for ${entry.habit}`}
				/>
			) : entry.kind === 'saver' ? (
				<View style={[s.saver, { backgroundColor: c.infoSoft }]}>
					<ShieldCheck size={22} color={c.infoText} />
					<Text variant="label" tone="info">
						Used the streak saver today
					</Text>
				</View>
			) : null}

			{entry.ai_caption ? (
				<Text variant="body" tone="body" style={s.caption}>
					“{entry.ai_caption}”
				</Text>
			) : null}

			{flagged ? (
				<View style={[s.flag, { backgroundColor: c.warningSoft, borderColor: c.warningBorder }]}>
					<TriangleAlert size={16} color={c.warningText} />
					<Text variant="caption" tone="warning" style={s.flagText}>
						{entry.ai_reason ?? 'The AI judge has doubts about this one.'} It still counts.
					</Text>
				</View>
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
					backgroundColor: selected ? c.brandDim : c.surface2,
					borderColor: selected ? c.brandBorder : c.borderHairline
				}
			]}
		>
			<Animated.Text style={[s.emoji, pop]}>{REACTION_EMOJI[reaction]}</Animated.Text>
			{count > 0 ? (
				<Text variant="label" tabular tone={selected ? 'brand' : 'secondary'}>
					{count}
				</Text>
			) : null}
		</PressableScale>
	)
}

const s = StyleSheet.create({
	card: { borderRadius: 26, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 12 },
	header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	who: { flex: 1, gap: 1 },
	photo: { width: '100%', aspectRatio: 4 / 5, borderRadius: 18 },
	saver: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		borderRadius: 18,
		paddingHorizontal: 16,
		paddingVertical: 18
	},
	caption: { fontStyle: 'italic', paddingHorizontal: 4 },
	flag: {
		flexDirection: 'row',
		gap: 8,
		alignItems: 'flex-start',
		borderRadius: 14,
		borderWidth: StyleSheet.hairlineWidth,
		paddingHorizontal: 12,
		paddingVertical: 10
	},
	flagText: { flex: 1 },
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
