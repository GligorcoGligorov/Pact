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
 * The providers that have a key, in the order the judge tries them: Gemini, then Groq. Empty
 * means no AI is configured, and every check-in's verdict is `not_configured` (R14).
 *
 * None yet: the Gemini and Groq calls land once the prompt in ./prompt is agreed.
 */
export function configuredProviders(): VisionProvider[] {
	return []
}
