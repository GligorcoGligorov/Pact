import { postJson, ProviderError, type VisionProvider } from './providers'

// Groq, the judge's fallback: Qwen 3.8 27B, which takes images, on Groq's free tier, through its
// OpenAI-compatible chat endpoint. The photo goes as a data URL; JSON mode holds the answer to
// an object, and ./prompt parses and checks it. (The plan named Llama 4 Scout; Groq no longer
// offers it to this account, so Qwen was chosen on 2026-10-01 after a test image came back
// right.)
//
// Groq refuses an image payload over 4 MB (a base64 photo over ~3 MB): that answers
// `http_413`, and the check-in's verdict is `error` if Gemini failed too. The app sends
// compressed JPEGs, well under it.

export const GROQ_MODEL = 'qwen/qwen3.8-27b'

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

const MAX_COMPLETION_TOKENS = 400
// As in ./gemini: some variety in the caption.
const TEMPERATURE = 0.8

type GroqResponse = {
	choices?: { message?: { content?: string | null } }[]
	usage?: { prompt_tokens?: number; completion_tokens?: number }
}

export function createGroqProvider(apiKey: string): VisionProvider {
	return {
		name: 'groq',
		model: GROQ_MODEL,
		async complete({ system, user, image, signal }) {
			const answer = (await postJson(
				ENDPOINT,
				{ authorization: `Bearer ${apiKey}` },
				{
					model: GROQ_MODEL,
					messages: [
						{ role: 'system', content: system },
						{
							role: 'user',
							content: [
								{ type: 'text', text: user },
								{
									type: 'image_url',
									image_url: {
										url: `data:${image.mimeType};base64,${image.bytes.toString('base64')}`
									}
								}
							]
						}
					],
					response_format: { type: 'json_object' },
					temperature: TEMPERATURE,
					max_completion_tokens: MAX_COMPLETION_TOKENS
				},
				signal
			)) as GroqResponse

			const text = answer.choices?.[0]?.message?.content?.trim()
			if (!text) throw new ProviderError('empty', 'Groq answered with no text')
			return {
				text,
				inputTokens: answer.usage?.prompt_tokens ?? null,
				outputTokens: answer.usage?.completion_tokens ?? null
			}
		}
	}
}
