import { BellRing, Camera } from 'lucide-react-native'

import { ListRow, Section } from '@/components/ui/List'
import { useToast } from '@/contexts/ToastContext'
import { log } from '@/lib/logger'
import { ensureNotificationPermission, scheduleLocalNotification } from '@/lib/notifications'
import { takeProofPhoto, USES_SIMULATOR_LIBRARY_FALLBACK } from '@/lib/proofPhoto'

const TEST_NOTIFICATION_DELAY_SECONDS = 10

/**
 * Checks for the device path (docs/pact-status.md, Phase 0). Settings renders this only when
 * `__DEV__` is true, so it is never in a release build: not a feature, and no events.
 */
export function DevToolsSection() {
	const { showToast } = useToast()

	async function sendTestNotification() {
		try {
			if (!(await ensureNotificationPermission())) {
				showToast('Notifications are off for Pact in iOS Settings', 'error')
				return
			}
			await scheduleLocalNotification(
				{ title: 'Pact', body: 'Test reminder: the device path works.' },
				TEST_NOTIFICATION_DELAY_SECONDS
			)
			showToast(`Scheduled: arrives in ${TEST_NOTIFICATION_DELAY_SECONDS} s`, 'success')
		} catch (error) {
			log.error('Test notification failed', { error })
			showToast('Could not schedule the notification', 'error')
		}
	}

	async function testProofPhoto() {
		try {
			const result = await takeProofPhoto()
			if (result.status === 'taken') {
				showToast(`Photo ${result.asset.width}×${result.asset.height}`, 'success')
			} else if (result.status === 'no_permission') {
				showToast('Camera access is off for Pact in iOS Settings', 'error')
			}
		} catch (error) {
			log.error('Test proof photo failed', { error })
			showToast('Could not open the camera', 'error')
		}
	}

	return (
		<Section title="Developer" footnote="Development builds only.">
			<ListRow
				icon={BellRing}
				title="Test notification"
				subtitle={`A local notification ${TEST_NOTIFICATION_DELAY_SECONDS} seconds from now`}
				onPress={sendTestNotification}
			/>
			<ListRow
				icon={Camera}
				title="Test proof photo"
				subtitle={
					USES_SIMULATOR_LIBRARY_FALLBACK
						? 'Simulator: picks from the library (dev only)'
						: 'Opens the camera'
				}
				onPress={testProofPhoto}
			/>
		</Section>
	)
}
