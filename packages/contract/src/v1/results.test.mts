// The words a crew reads at the end of a pact, the same in the app, on the web and on the card.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { awardOf, joinNames, stakeLine } from './results'

test('names: one, two, three', () => {
	assert.equal(joinNames(['Dan']), 'Dan')
	assert.equal(joinNames(['Dan', 'Cleo']), 'Dan and Cleo')
	assert.equal(joinNames(['Ben', 'Cleo', 'Dan']), 'Ben, Cleo and Dan')
})

test('a "loser …" stake reads as who owes it, with the verb agreeing', () => {
	assert.equal(stakeLine(['Dan'], 'Loser buys the coffees ☕'), 'Dan buys the coffees ☕')
	assert.equal(
		stakeLine(['Dan', 'Cleo'], 'Loser buys the coffees ☕'),
		'Dan and Cleo buy the coffees ☕'
	)
	assert.equal(
		stakeLine(['Dan', 'Cleo'], 'The loser does the dishes'),
		'Dan and Cleo do the dishes'
	)
	assert.equal(stakeLine(['Dan', 'Cleo'], 'Losers pass the test'), 'Dan and Cleo pass the test')
	assert.equal(stakeLine(['You'], 'Loser buys the coffees ☕'), 'You buy the coffees ☕')
})

test('any other stake, and no stake at all', () => {
	assert.equal(stakeLine(['Dan'], 'A round of pizza'), 'Dan owes: A round of pizza')
	assert.equal(stakeLine(['Dan', 'Ben'], null), 'Dan and Ben owe the crew a high five')
})

test('an award this build does not know reads as null', () => {
	assert.equal(awardOf('iron_streak')?.emoji, '🔥')
	assert.equal(awardOf('space_cadet'), null)
})
