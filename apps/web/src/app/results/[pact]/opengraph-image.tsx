import { RESULT_CARD_SIZES, resultCardImage } from '@/server/pacts/result-card'
import { getResultPage } from '@/server/pacts/result-page'

export const runtime = 'nodejs'
export const alt = 'How a pact ended on Pact'
export const size = RESULT_CARD_SIZES.wide
export const contentType = 'image/png'

/** The link preview /results/[pact] unfurls into: the crew's colour, the chain, who pays. */
export default async function Image({ params }: { params: Promise<{ pact: string }> }) {
	return resultCardImage(await getResultPage((await params).pact), 'wide')
}
