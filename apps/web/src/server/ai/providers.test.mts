// The judge's providers (./gemini, ./groq, ./registry) against a fake `fetch`: the request each
// one sends (the key in a header, never the URL; the photo attached; JSON asked for), what
// they make of the answer, how each failure is coded, and the order the registry tries them.
// Fake keys only: nothing here reaches a real API.
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createGeminiProvider, GEMINI_MODEL } from './gemini'
import { createGroqProvider, GROQ_MODEL } from './groq'
import { ProviderError, type VisionRequest } from './providers'
import { configuredProviders } from './registry'

const realFetch = globalThis.fetch
let calls: { url: string; init: RequestInit }[]
let answer: () => Response | Promise<Response>

beforeEach(() => {
	calls = []
	globalThis.fetch = (async (url: string, init: RequestInit) => {
		calls.push({ url: String(url), init })
		return answer()
	}) as typeof fetch
})

afterEach(() => {
	globalThis.fetch = realFetch
	delete process.env.GEMINI_API_KEY
	delete process.env.GROQ_API_KEY
})

const request = (): VisionRequest => ({
	system: 'the system prompt',
	user: "<habit>Run</habit>\nToday's challenge: Wave",
	image: { bytes: Buffer.from('fake-jpeg'), mimeType: 'image/jpeg' },
	signal: AbortSignal.timeout(5_000)
})

const JSON_ANSWER = '{"verdict":"pass","reason":"r","caption":"c"}'
const body = () => JSON.parse(String(calls[0].init.body))

async function failsWith(promise: Promise<unknown>, code: string) {
	await assert.rejects(promise, (err) => err instanceof ProviderError && err.code === code)
}

test('gemini: the key in a header, the photo inline, a JSON schema, thinking off', async () => {
	answer = () =>
		Response.json({
			candidates: [{ content: { parts: [{ text: JSON_ANSWER }] } }],
			usageMetadata: { promptTokenCount: 1290, candidatesTokenCount: 31 }
		})
	const result = await createGeminiProvider('fake-gemini-key').complete(request())
	assert.deepEqual(result, { text: JSON_ANSWER, inputTokens: 1290, outputTokens: 31 })

	const [{ url, init }] = calls
	assert.equal(
		url,
		`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
	)
	assert.ok(!url.includes('fake-gemini-key'), 'never in the URL')
	assert.equal((init.headers as Record<string, string>)['x-goog-api-key'], 'fake-gemini-key')
	const sent = body()
	assert.equal(sent.systemInstruction.parts[0].text, 'the system prompt')
	assert.deepEqual(sent.contents[0].parts[0], {
		inlineData: { mimeType: 'image/jpeg', data: Buffer.from('fake-jpeg').toString('base64') }
	})
	assert.equal(sent.contents[0].parts[1].text, request().user)
	assert.equal(sent.generationConfig.responseMimeType, 'application/json')
	assert.deepEqual(sent.generationConfig.responseSchema.properties.verdict.enum, [
		'pass',
		'suspicious'
	])
	assert.equal(sent.generationConfig.thinkingConfig.thinkingBudget, 0)
})

test('groq: a bearer key, the photo as a data URL, JSON mode, Llama 4 Scout', async () => {
	answer = () =>
		Response.json({
			choices: [{ message: { content: JSON_ANSWER } }],
			usage: { prompt_tokens: 900, completion_tokens: 25 }
		})
	const result = await createGroqProvider('fake-groq-key').complete(request())
	assert.deepEqual(result, { text: JSON_ANSWER, inputTokens: 900, outputTokens: 25 })

	const [{ url, init }] = calls
	assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions')
	assert.equal((init.headers as Record<string, string>).authorization, 'Bearer fake-groq-key')
	const sent = body()
	assert.equal(sent.model, GROQ_MODEL)
	assert.deepEqual(sent.response_format, { type: 'json_object' })
	assert.deepEqual(sent.messages[0], { role: 'system', content: 'the system prompt' })
	assert.equal(
		sent.messages[1].content[1].image_url.url,
		`data:image/jpeg;base64,${Buffer.from('fake-jpeg').toString('base64')}`
	)
})

test('failures are coded: http_<status>, bad_json, empty, blocked, network, timeout', async () => {
	const gemini = createGeminiProvider('k')
	answer = () => new Response('slow down', { status: 429 })
	await failsWith(gemini.complete(request()), 'http_429')
	answer = () => new Response('<html>', { status: 200 })
	await failsWith(gemini.complete(request()), 'bad_json')
	answer = () => Response.json({ candidates: [{ content: { parts: [] } }] })
	await failsWith(gemini.complete(request()), 'empty')
	answer = () => Response.json({ promptFeedback: { blockReason: 'SAFETY' } })
	await failsWith(gemini.complete(request()), 'blocked')
	answer = () => {
		throw new TypeError('fetch failed')
	}
	await failsWith(createGroqProvider('k').complete(request()), 'network')
	answer = () => {
		throw new DOMException('The operation timed out.', 'TimeoutError')
	}
	await failsWith(createGroqProvider('k').complete(request()), 'timeout')
	answer = () => Response.json({ choices: [{ message: { content: null } }] })
	await failsWith(createGroqProvider('k').complete(request()), 'empty')
})

test('registry: Gemini then Groq, only those with a key; none means not configured', () => {
	assert.deepEqual(configuredProviders(), [])
	process.env.GROQ_API_KEY = 'k'
	assert.deepEqual(
		configuredProviders().map((p) => p.name),
		['groq']
	)
	process.env.GEMINI_API_KEY = 'k'
	assert.deepEqual(
		configuredProviders().map((p) => p.name),
		['gemini', 'groq']
	)
	process.env.GEMINI_API_KEY = '   '
	assert.deepEqual(
		configuredProviders().map((p) => p.name),
		['groq'],
		'a blank key is no key'
	)
})
