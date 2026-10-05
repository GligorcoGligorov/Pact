import type { NextRequest } from 'next/server'
import { resultCardImage } from '@/server/pacts/result-card'
import { getResultPage } from '@/server/pacts/result-page'
import { log } from '@/server/lib/logger'

export const runtime = 'nodejs'

/** A finished pact's results never change, but a name can: an hour is plenty. */
const MAX_AGE_S = 60 * 60

/**
 * GET /results/[pact]/card: the tall share card (1080×1350 PNG) the app sends through the share
 * sheet (R25). Public like the page, and 404 for anything that has no results.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ pact: string }> }) {
	try {
		const page = await getResultPage((await params).pact)
		if (!page) return new Response('Not found', { status: 404 })
		const image = await resultCardImage(page, 'tall')
		image.headers.set('Cache-Control', `public, max-age=${MAX_AGE_S}`)
		return image
	} catch (err) {
		log.error('rendering a result card failed', { source: 'results/card', err })
		return new Response('Could not draw the card', { status: 500 })
	}
}
