import { createGeminiProvider } from './gemini'
import { createGroqProvider } from './groq'
import type { VisionProvider } from './providers'

/**
 * The providers that have a key, in the order the judge tries them: Groq, then Gemini. Empty
 * means no AI is configured, and every check-in's verdict is `not_configured` (R14). Read on
 * every call, so a key added to the environment takes effect without a code change.
 */
export function configuredProviders(): VisionProvider[] {
	const providers: VisionProvider[] = []
	const groq = process.env.GROQ_API_KEY?.trim()
	if (groq) providers.push(createGroqProvider(groq))
	const gemini = process.env.GEMINI_API_KEY?.trim()
	if (gemini) providers.push(createGeminiProvider(gemini))
	return providers
}
