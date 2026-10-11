// The words a crew reads at the end of a pact, the same in the app, on the web and on the card.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { awardOf, joinNames, pledgeLine, stakeLine } from './results'

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

test('the pledge, in the signer’s voice: the habit, the run of days, and the stake', () => {
	assert.equal(
		pledgeLine('Ana', 'Run for 20 minutes', 'daily', 21, 'Loser buys the coffees'),
		'I, Ana, will run for 20 minutes every day for 21 days. If I break it, I buy the coffees.'
	)
	assert.equal(
		pledgeLine('Ben', 'Read 10 pages.', 'weekdays', 10, 'A round of pizza'),
		'I, Ben, will read 10 pages every weekday for 10 days. If I break it, I owe: a round of pizza.'
	)
	assert.equal(
		pledgeLine('Cleo', 'Stretch', 'daily', 7, null),
		'I, Cleo, will stretch every day for 7 days. If I break it, my crew will know.'
	)
})
