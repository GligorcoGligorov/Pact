import { Share } from 'react-native'
import { resultPageUrl } from './results'

/**
 * R25: shares a finished pact's result card through the system share sheet, with no native
 * module of its own. The web draws the card (GET /results/[pact]/card, a PNG); this downloads
 * it and hands it to React Native's Share as a data URI, which iOS shares as an image, with the
 * page's link in the message. If the card can't be fetched, the link alone goes (its preview is
 * the same card, landscape).
 *
 * Resolves to how it was shared, or null when the person closed the sheet.
 */
export async function shareResult(
	pactId: string,
	pactName: string
): Promise<'image' | 'link' | null> {
	const page = resultPageUrl(pactId)
	if (!page) throw new Error('EXPO_PUBLIC_SITE_URL is not set, so there is no page to share.')
	const message = `${pactName}: the results are in. ${page}`

	let image: string | null = null
	try {
		const res = await fetch(`${page}/card`)
		if (res.ok) image = await asDataUri(await res.blob())
	} catch {
		// Offline, or the card failed to draw: the link still works.
	}

	const result = await Share.share(image ? { url: image, message } : { url: page, message })
	if (result.action === Share.dismissedAction) return null
	return image ? 'image' : 'link'
}

function asDataUri(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(String(reader.result))
		reader.onerror = () => reject(reader.error ?? new Error('could not read the card'))
		reader.readAsDataURL(blob)
	})
}
