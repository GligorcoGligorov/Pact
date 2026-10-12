import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pledgeLine } from '@app/contract'
import { DEMO_PACT, PLEDGE, SIGNATURES } from './demo-pact.ts'

test("the landing's typed pledge is the contract's pledge line, word for word", () => {
	assert.equal(
		PLEDGE.map((part) => part.text).join(''),
		pledgeLine(null, DEMO_PACT.habit, 'daily', DEMO_PACT.days, DEMO_PACT.stake)
	)
})

test('the four demo signatures are four different hands', () => {
	assert.equal(new Set(SIGNATURES.map((s) => s.path)).size, 4)
})
