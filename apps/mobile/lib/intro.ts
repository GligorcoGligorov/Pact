import { useEffect, useState } from 'react'
import { DeviceEventEmitter } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// The first-launch intro (three screens): shown once per device, before anything else. The
// flag is read with the theme before the splash hides (app/_layout.tsx), so the first frame is
// already the right one.

const KEY = 'pact.intro.seen'
const SHOW_AGAIN = 'pact.intro.show'

let seen = true

/** Reads the flag. If storage can't be read, the intro is skipped rather than shown every launch. */
export async function loadIntroSeen(): Promise<void> {
	try {
		seen = (await AsyncStorage.getItem(KEY)) === '1'
	} catch {
		seen = true
	}
}

async function markSeen(): Promise<void> {
	seen = true
	try {
		await AsyncStorage.setItem(KEY, '1')
	} catch {
		// Shown again next launch at worst.
	}
}

/** Developer settings: show the intro again, now. */
export function showIntroAgain(): void {
	seen = false
	void AsyncStorage.removeItem(KEY).catch(() => {})
	DeviceEventEmitter.emit(SHOW_AGAIN)
}

/** Whether the intro is up, and how it closes. */
export function useIntro(): { visible: boolean; finish: () => void } {
	const [visible, setVisible] = useState(!seen)
	useEffect(() => {
		const sub = DeviceEventEmitter.addListener(SHOW_AGAIN, () => setVisible(true))
		return () => sub.remove()
	}, [])
	return {
		visible,
		finish: () => {
			setVisible(false)
			void markSeen()
		}
	}
}
