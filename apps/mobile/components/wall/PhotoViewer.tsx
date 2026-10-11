import { useEffect, useState } from 'react'
import { Modal, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import Animated, { FadeIn } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { REACTIONS, type Reaction, type ReactionState } from '@app/contract'
import { PressableScale } from '@/components/motion/PressableScale'
import { REACTION_EMOJI } from '@/components/pact/FeedCard'
import { IconButton } from '@/components/ui/IconButton'
import { Text } from '@/components/ui/Text'
import { useColors } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { track } from '@/lib/analytics'
import { errorMessage } from '@/lib/api'
import { haptic } from '@/lib/haptics'
import { toggled, useToggleReaction } from '@/lib/pacts'
import type { OpenTile } from './WallGrid'

/**
 * A wall tile, full screen: the photo as it was taken, who and which day in mono, the AI's
 * one-liner big, a flag's reason when it has one (R15), and the crew's reactions, toggled at
 * once. Opening it fires `wall_photo_opened`.
 */
export function PhotoViewer({
	pactId,
	tile,
	own,
	onClose
}: {
	pactId: string
	tile: OpenTile | null
	/** The caller's own photo. */
	own: boolean
	onClose: () => void
}) {
	const c = useColors()
	const insets = useSafeAreaInsets()
	const { showToast } = useToast()
	const toggle = useToggleReaction()
	const checkIn = tile?.cell.check_in ?? null
	const [reactions, setReactions] = useState<ReactionState | null>(checkIn?.reactions ?? null)

	useEffect(() => {
		setReactions(checkIn?.reactions ?? null)
		if (checkIn) track('wall_photo_opened', { pact_id: pactId, own })
		// One event per opened tile.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [checkIn?.id])

	function react(reaction: Reaction) {
		if (!checkIn || !reactions) return
		const on = !reactions.mine.includes(reaction)
		const before = reactions
		setReactions(toggled(reactions, reaction))
		toggle.mutate(
			{ checkInId: checkIn.id, reaction, on },
			{
				onSuccess: ({ reactions: next }) => {
					setReactions(next)
					if (on) track('check_in_reacted', { pact_id: pactId, reaction })
				},
				onError: (error) => {
					setReactions(before)
					haptic.error()
					showToast(errorMessage(error), 'error')
				}
			}
		)
	}

	return (
		<Modal visible={!!tile} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
			{tile && checkIn?.photo_url ? (
				<View style={[s.root, { backgroundColor: c.bg }]}>
					<Image source={{ uri: checkIn.photo_url }} style={s.photo} contentFit="cover" />
					<View style={[s.top, { paddingTop: insets.top + 8 }]}>
						<Text variant="mono" style={{ color: c.inkOnArt }}>
							{tile.name} · day {String(tile.dayNumber).padStart(2, '0')}
						</Text>
						<IconButton
							tone="glass"
							accessibilityLabel="Close"
							onPress={onClose}
							icon={(color) => <X size={20} color={color} strokeWidth={2} />}
						/>
					</View>
					<Animated.View
						entering={FadeIn.duration(240)}
						style={[s.bottom, { paddingBottom: insets.bottom + 16, backgroundColor: c.bg }]}
					>
						{checkIn.ai_caption ? <Text variant="h2">“{checkIn.ai_caption}”</Text> : null}
						{checkIn.verdict === 'suspicious' ? (
							<Text variant="bodySm" tone="warning">
								Flagged · {checkIn.ai_reason ?? 'The AI judge has doubts about this one.'}
							</Text>
						) : null}
						{reactions ? (
							<View style={s.reactions}>
								{REACTIONS.map((reaction) => {
									const mine = reactions.mine.includes(reaction)
									return (
										<PressableScale
											key={reaction}
											scaleTo="button"
											haptic="select"
											onPress={() => react(reaction)}
											accessibilityRole="button"
											accessibilityState={{ selected: mine }}
											accessibilityLabel={`${reaction} ${reactions.counts[reaction]}`}
											style={[
												s.reaction,
												{
													borderColor: mine ? c.textPrimary : c.borderSoft,
													backgroundColor: mine ? c.surface2 : 'transparent'
												}
											]}
										>
											<Text style={s.emoji}>{REACTION_EMOJI[reaction]}</Text>
											<Text variant="mono" tone={mine ? 'primary' : 'secondary'}>
												{reactions.counts[reaction]}
											</Text>
										</PressableScale>
									)
								})}
							</View>
						) : null}
					</Animated.View>
				</View>
			) : null}
		</Modal>
	)
}

const s = StyleSheet.create({
	root: { flex: 1 },
	photo: { flex: 1 },
	top: {
		position: 'absolute',
		left: 16,
		right: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	bottom: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
	reactions: { flexDirection: 'row', gap: 8 },
	reaction: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 999,
		borderWidth: StyleSheet.hairlineWidth * 2
	},
	emoji: { fontSize: 18, lineHeight: 22 }
})
