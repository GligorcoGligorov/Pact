import { router } from 'expo-router'

/**
 * Back, or home when there is nothing to go back to: a screen opened from a deep link or a
 * notification has no history, and a bare `router.back()` there raises "GO_BACK was not handled".
 */
export function goBack(): void {
	if (router.canGoBack()) router.back()
	else router.replace('/')
}
