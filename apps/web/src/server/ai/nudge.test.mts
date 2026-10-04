// The nudge's line (R20): short, kind and about the habit, or the fixed one. The model's answer
// is checked here, never trusted.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { acceptableLine, fallbackNudge, writeNudge } from './nudge'

test('a good line is kept, in JSON or plain text, without quotes', () => {
	assert.equal(
		acceptableLine('{"line": "NAME, the running shoes are asking about you."}', 'Dan Petrov'),
		'Dan, the running shoes are asking about you.'
	)
	assert.equal(
		acceptableLine('"NAME, find a window? Shoes are restless."', 'Dan'),
		'Dan, find a window? Shoes are restless.'
	)
})

test('a line is refused when it shames, talks about bodies, runs long or forgets the name', () => {
	assert.equal(
		acceptableLine('{"line": "Dan, the shoes miss you."}', 'Dan'),
		null,
		'the model never sees the name, so a line with a name instead of NAME is made up'
	)
	for (const bad of [
		'{"line": "NAME, the scale says you need this run."}'.replace('scale says', 'weight says'),
		'{"line": "NAME, stop being lazy and run."}',
		'{"line": "NAME, your belly misses the run."}',
		'{"line": "NAME, one two three four five six seven eight nine ten eleven twelve thirteen fourteen."}',
		'{"line": "The running shoes are asking about you."}',
		'{"line": ""}',
		'not json and not a line about anyone'
	]) {
		assert.equal(acceptableLine(bad, 'Dan'), null, bad)
	}
})

test('the fixed line is kind and uses the first name', () => {
	assert.equal(fallbackNudge('Ana Petrova'), 'Ana, your crew is saving you a spot today.')
})

test('without a Groq key the nudge still goes, with the fixed line', async () => {
	const key = process.env.GROQ_API_KEY
	delete process.env.GROQ_API_KEY
	try {
		const result = await writeNudge({
			fromUserId: 'x',
			toName: 'Dan',
			habit: 'Run',
			challenge: null
		})
		assert.deepEqual(result, {
			text: 'Dan, your crew is saving you a spot today.',
			source: 'fallback'
		})
	} finally {
		if (key !== undefined) process.env.GROQ_API_KEY = key
	}
})
