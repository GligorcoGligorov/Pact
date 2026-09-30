import { postJson, ProviderError, type VisionProvider } from './providers'

// Google Gemini, the judge's first choice: a Flash model with image input, on the free tier
// of the Generative Language API. The key travels in a header, never in the URL, so it can't
// end up in a log line. The answer's shape is pinned with a response schema as well as the
// prompt; ./prompt still parses and checks it.
//
// The plan named gemini-2.5-flash; Google no longer serves it to new keys ("no longer available
// to new users", 2026-10-01) and names gemini-3.8-flash as its replacement, which answers this
// request as it is.

export const GEMINI_MODEL = 'gemini-3.8-flash'

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// A verdict is a quick look, not a reasoning task: thinking would only add latency and tokens.
const THINKING_BUDGET = 0
const MAX_OUTPUT_TOKENS = 400
// Some variety in the caption; the verdict rules are in the prompt, not the sampling.
const TEMPERATURE = 0.8

const RESPONSE_SCHEMA = {
	type: 'OBJECT',
	properties: {
		verdict: { type: 'STRING', enum: ['pass', 'suspicious'] },
		reason: { type: 'STRING' },
		caption: { type: 'STRING' }
	},
	required: ['verdict', 'reason', 'caption'],
	propertyOrdering: ['verdict', 'reason', 'caption']
}

type GeminiResponse = {
	candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
	promptFeedback?: { blockReason?: string }
	usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
}

export function createGeminiProvider(apiKey: string): VisionProvider {
	return {
		name: 'gemini',
		model: GEMINI_MODEL,
		async complete({ system, user, image, signal }) {
			const answer = (await postJson(
				ENDPOINT,
				{ 'x-goog-api-key': apiKey },
				{
					systemInstruction: { parts: [{ text: system }] },
					contents: [
						{
							role: 'user',
							parts: [
								{ inlineData: { mimeType: image.mimeType, data: image.bytes.toString('base64') } },
								{ text: user }
							]
						}
					],
					generationConfig: {
						responseMimeType: 'application/json',
						responseSchema: RESPONSE_SCHEMA,
						temperature: TEMPERATURE,
						maxOutputTokens: MAX_OUTPUT_TOKENS,
						thinkingConfig: { thinkingBudget: THINKING_BUDGET }
					}
				},
				signal
			)) as GeminiResponse

			if (answer.promptFeedback?.blockReason) {
				throw new ProviderError('blocked', `Gemini blocked the request`)
			}
			const text = answer.candidates?.[0]?.content?.parts
				?.map((part) => part.text ?? '')
				.join('')
				.trim()
			if (!text) throw new ProviderError('empty', 'Gemini answered with no text')
			return {
				text,
				inputTokens: answer.usageMetadata?.promptTokenCount ?? null,
				outputTokens: answer.usageMetadata?.candidatesTokenCount ?? null
			}
		}
	}
}
