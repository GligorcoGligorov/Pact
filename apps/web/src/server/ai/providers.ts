// The judge's providers (docs/pact-status.md, "AI judge on free providers"): each one sends
// the same prompt and photo to its model and hands back the model's text. Everything else,
// the parsing, the fallback, the usage row and the verdict, is ./judge's, so a provider is
// only the HTTP call.

export type ProviderName = 'gemini' | 'groq'

export type VisionRequest = {
	system: string
	user: string
	image: { bytes: Buffer; mimeType: string }
	/** Aborts the call when the judge gives up on it. */
	signal: AbortSignal
}

export type VisionResult = {
	text: string
	inputTokens: number | null
	outputTokens: number | null
}

export interface VisionProvider {
	readonly name: ProviderName
	readonly model: string
	complete(request: VisionRequest): Promise<VisionResult>
}

/** A provider's failure, with a short code for the usage row (never shown to a person). */
export class ProviderError extends Error {
	readonly code: string

	constructor(code: string, message: string, options?: { cause?: unknown }) {
		super(message, options)
		this.name = 'ProviderError'
		this.code = code
	}
}

/**
 * POSTs JSON and returns the parsed answer, turning every way it can fail into a
 * ProviderError with a short code: `timeout`, `network`, `http_<status>` or `bad_json`. The
 * response body of a failure is not kept: it can echo the request, photo included.
 */
export async function postJson(
	url: string,
	headers: Record<string, string>,
	body: unknown,
	signal: AbortSignal
): Promise<unknown> {
	let res: Response
	try {
		res = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json', ...headers },
			body: JSON.stringify(body),
			signal
		})
	} catch (err) {
		const aborted =
			err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')
		throw new ProviderError(aborted ? 'timeout' : 'network', 'the provider did not answer', {
			cause: err
		})
	}
	if (!res.ok) {
		await res.body?.cancel()
		throw new ProviderError(`http_${res.status}`, `the provider answered ${res.status}`)
	}
	try {
		return await res.json()
	} catch (err) {
		throw new ProviderError('bad_json', 'the provider answered something that is not JSON', {
			cause: err
		})
	}
}
