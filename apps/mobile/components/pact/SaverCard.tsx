import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { AlertModal } from '@/components/ui/AppModal'
import { Button } from '@/components/ui/Button'
import { Text } from '@/components/ui/Text'
import { useTheme } from '@/contexts/ThemeContext'
import { useToast } from '@/contexts/ToastContext'
import { track } from '@/lib/analytics'
import { errorCode, errorMessage } from '@/lib/api'
import { haptic } from '@/lib/haptics'
import { useSaver } from '@/lib/pacts'

/** "About to break": the last three hours before the day closes, when the reminder fires too. */
export const SAVER_URGENT_MS = 3 * 60 * 60 * 1000
const TICK_MS = 60_000

/** Hours and minutes left, "2h 15m" or "40m". */
function left(ms: number): string {
	const minutes = Math.max(1, Math.round(ms / 60_000))
	const h = Math.floor(minutes / 60)
	return h > 0 ? `${h}h ${minutes % 60}m` : `${minutes}m`
}

/**
 * R17 on the board, while the caller still owes today: their one streak saver. All day it's a
 * quiet line ("can't make it today?"); in the last three hours it becomes the outlined block
 * that says the day is about to break. Using it asks once, because there's only one.
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
	const { colors: c } = useTheme()
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
				showToast('Saved. Your row stays whole.', 'success')
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
			<Text variant="mono" tone="tertiary">
				Saver used · today needs a photo
			</Text>
		)
	}

	return (
		<>
			{urgent ? (
				<View style={[s.urgent, { borderColor: c.warning }]}>
					<Text variant="mono" tone="warning">
						{left(remaining)} left · 1 saver
					</Text>
					<View>
						<Text variant="h2">The day’s about to break.</Text>
						<Text variant="h2" tone="tertiary">
							Your saver keeps your row whole, no photo needed.
						</Text>
					</View>
					<Button
						label="Use your saver"
						variant="secondary"
						fullWidth
						loading={saver.isPending}
						onPress={() => setConfirming(true)}
					/>
				</View>
			) : (
				<View style={s.quiet}>
					<Text variant="bodySm" tone="secondary" style={s.quietText}>
						Can’t make it today? Your one saver keeps your row whole.
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
				title="Use your saver?"
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

const s = StyleSheet.create({
	urgent: { gap: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: 8 },
	quiet: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	quietText: { flex: 1 }
})
