import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withTiming
} from 'react-native-reanimated'
import { AlertModal } from '@/components/ui/AppModal'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { track } from '@/lib/analytics'
import { errorCode, errorMessage } from '@/lib/api'
import { haptic } from '@/lib/haptics'
import { useReducedMotion } from '@/lib/motion'
import { useSaver } from '@/lib/pacts'

/** "About to break": the last three hours before the day closes, when the reminder fires too. */
export const SAVER_URGENT_MS = 3 * 60 * 60 * 1000
const TICK_MS = 60_000
/** One slow bob of the ring buoy: calm, never an alarm. */
const BOB_MS = 1400

/** Hours and minutes left, "2h 15m" or "40m". */
function left(ms: number): string {
	const minutes = Math.max(1, Math.round(ms / 60_000))
	const h = Math.floor(minutes / 60)
	return h > 0 ? `${h}h ${minutes % 60}m` : `${minutes}m`
}

/**
 * R17 on the board, while the caller still owes today: their one streak saver. All day it's a
 * quiet line ("can't make it today?"); in the last three hours it becomes the card that says the
 * day is about to break, with the buoy bobbing. Using it asks once, because there's only one.
 * Once it's spent, the line says so. Crew colour stays off it: the saver is an action.
 */
export function SaverCard({
	pactId,
	closesAt,
	available
}: {
	pactId: string
	closesAt: string
	/** R17: one per pact; false once used. */
	available: boolean
}) {
	const { colors: c, elevation } = useTheme()
	const { showToast } = useToast()
	const saver = useSaver(pactId)
	const [confirming, setConfirming] = useState(false)
	const [now, setNow] = useState(() => Date.now())
	const offered = useRef(false)

	useEffect(() => {
		const timer = setInterval(() => setNow(Date.now()), TICK_MS)
		return () => clearInterval(timer)
	}, [])

	const remaining = new Date(closesAt).getTime() - now
	const urgent = available && remaining > 0 && remaining <= SAVER_URGENT_MS

	useEffect(() => {
		if (!urgent || offered.current) return
		offered.current = true
		track('saver_offered', { pact_id: pactId })
	}, [pactId, urgent])

	function use() {
		setConfirming(false)
		saver.mutate(undefined, {
			onSuccess: () => {
				haptic.success()
				track('check_in_submitted', { kind: 'saver', pact_id: pactId })
				showToast('Saved 🛟 The chain lives on.', 'success')
			},
			onError: (error) => {
				haptic.error()
				const code = errorCode(error)
				showToast(
					code === 'saver_used'
						? 'Your saver is already used in this pact.'
						: code === 'already_checked_in'
							? "You're already in today."
							: errorMessage(error),
					'error'
				)
			}
		})
	}

	if (!available) {
		return (
			<Text variant="caption" tone="tertiary" style={s.center}>
				🛟 Your saver is used for this pact. Today needs a photo.
			</Text>
		)
	}

	return (
		<>
			{urgent ? (
				<Card
					padding="normal"
					style={[
						s.card,
						elevation.card,
						{ backgroundColor: c.warningSoft, borderColor: c.warning }
					]}
				>
					<View style={s.row}>
						<Buoy />
						<View style={s.text}>
							<Text variant="h3">The day&apos;s about to break</Text>
							<Text variant="bodySm" tone="secondary">
								{left(remaining)} left. Your saver keeps the chain alive, no photo needed. One per
								pact.
							</Text>
						</View>
					</View>
					<Button
						label="Use your saver"
						variant="secondary"
						fullWidth
						loading={saver.isPending}
						onPress={() => setConfirming(true)}
					/>
				</Card>
			) : (
				<View style={s.quiet}>
					<Text variant="bodySm" tone="secondary" style={s.quietText}>
						🛟 Can&apos;t make it today? Your one saver keeps the chain alive.
					</Text>
					<Button
						label="Use saver"
						variant="ghost"
						size="sm"
						loading={saver.isPending}
						onPress={() => setConfirming(true)}
					/>
				</View>
			)}
			<AlertModal
				visible={confirming}
				title="Use your saver? 🛟"
				message="It keeps today without a photo, and your crew sees you used it. You get one per pact, so this is it."
				buttons={[
					{ text: 'Use it', onPress: use },
					{ text: 'Not now', style: 'cancel' }
				]}
				onDismiss={() => setConfirming(false)}
			/>
		</>
	)
}

/** 🛟, bobbing gently. Still under Reduce Motion. */
function Buoy() {
	const reduced = useReducedMotion()
	const t = useSharedValue(0)
	useEffect(() => {
		if (reduced) return
		t.value = withRepeat(
			withTiming(1, { duration: BOB_MS / 2, easing: Easing.inOut(Easing.sin) }),
			-1,
			true
		)
		return () => cancelAnimation(t)
	}, [reduced, t])
	const style = useAnimatedStyle(() => ({
		transform: [{ translateY: -3 * t.value }, { rotate: `${-6 + 12 * t.value}deg` }]
	}))
	return (
		<Animated.Text style={[s.buoy, style]} allowFontScaling={false} accessibilityElementsHidden>
			🛟
		</Animated.Text>
	)
}

const s = StyleSheet.create({
	card: { gap: 14, borderWidth: 1.5 },
	row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
	text: { flex: 1, gap: 3 },
	buoy: { fontSize: 40, lineHeight: 48 },
	quiet: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
	quietText: { flex: 1 },
	center: { textAlign: 'center' }
})
