import * as Notifications from 'expo-notifications'

/**
 * Local notifications only. The trial's build is signed by a free Apple ID, which can't sign
 * push (app.config.ts drops `aps-environment`), so every reminder is scheduled on the device.
 */

// iOS hides a notification that arrives while the app is open unless the handler says otherwise.
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: true,
		shouldSetBadge: false
	})
})

/** Asks once, in context; afterwards returns what the person already chose. */
export async function ensureNotificationPermission(): Promise<boolean> {
	const current = await Notifications.getPermissionsAsync()
	if (current.granted) return true
	if (!current.canAskAgain) return false
	const asked = await Notifications.requestPermissionsAsync()
	return asked.granted
}

export async function scheduleLocalNotification(
	content: { title: string; body: string },
	secondsFromNow: number
): Promise<string> {
	return Notifications.scheduleNotificationAsync({
		content,
		trigger: {
			type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
			seconds: secondsFromNow
		}
	})
}
