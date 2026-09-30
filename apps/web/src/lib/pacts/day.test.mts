// A pact's calendar is the product: a wrong "today" shows the wrong people as out and breaks
// streaks that were kept. These tests pin the day to real instants in real zones, including
// every kind of DST change there is (an hour skipped or repeated, a skipped midnight, a
// skipped date), and then check the invariants for every day of a year in each zone.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
	addDays,
	canonicalTimeZone,
	closesAt,
	dateFromDay,
	dayFromDate,
	daysBetween,
	endDayFor,
	isDay,
	isHeldOn,
	isPactDay,
	joinedDayFor,
	pactDaysThrough,
	pactStatus,
	todayIn,
	type PactCalendar
} from './day'

const at = (iso: string) => new Date(iso)
const HOUR = 3_600_000

const daily: PactCalendar = {
	timezone: 'Europe/Skopje',
	cadence: 'daily',
	startDay: '2026-10-05',
	endDay: '2026-10-11'
}
// 2026-10-05 is a Monday.
const weekdays: PactCalendar = { ...daily, cadence: 'weekdays', endDay: '2026-10-18' }

test('todayIn: the pact-local date, not the UTC one', () => {
	// 22:30 UTC is already tomorrow in Skopje (UTC+2 in summer time).
	assert.equal(todayIn('Europe/Skopje', at('2026-09-30T22:30:00Z')), '2026-10-01')
	assert.equal(todayIn('Europe/Skopje', at('2026-09-30T21:59:59Z')), '2026-09-30')
	// 05:00 UTC is still yesterday in Los Angeles (UTC-7).
	assert.equal(todayIn('America/Los_Angeles', at('2026-10-01T05:00:00Z')), '2026-09-30')
	// Auckland is on UTC+13 from the last Sunday of September.
	assert.equal(todayIn('Pacific/Auckland', at('2026-09-30T11:00:00Z')), '2026-10-01')
	// Offsets that are not whole hours.
	assert.equal(todayIn('Asia/Kathmandu', at('2026-09-30T18:14:59Z')), '2026-09-30')
	assert.equal(todayIn('Asia/Kathmandu', at('2026-09-30T18:15:00Z')), '2026-10-01')
	assert.equal(todayIn('UTC', at('2026-12-31T23:59:59Z')), '2026-12-31')
})

test('closesAt: the next local midnight on an ordinary day', () => {
	assert.deepEqual(closesAt('Europe/Skopje', '2026-09-30'), at('2026-09-30T22:00:00Z'))
	assert.deepEqual(closesAt('America/Los_Angeles', '2026-09-30'), at('2026-10-01T07:00:00Z'))
	assert.deepEqual(closesAt('Asia/Kathmandu', '2026-09-30'), at('2026-09-30T18:15:00Z'))
	assert.deepEqual(closesAt('UTC', '2026-12-31'), at('2027-01-01T00:00:00Z'))
})

test('closesAt: DST in both directions makes 23- and 25-hour days', () => {
	const length = (tz: string, day: string) =>
		(closesAt(tz, day).getTime() - closesAt(tz, addDays(day, -1)).getTime()) / HOUR

	// New York: spring forward 2026-03-08, fall back 2026-11-01, both at 02:00.
	assert.deepEqual(closesAt('America/New_York', '2026-03-08'), at('2026-03-09T04:00:00Z'))
	assert.equal(length('America/New_York', '2026-03-08'), 23)
	assert.deepEqual(closesAt('America/New_York', '2026-11-01'), at('2026-11-02T05:00:00Z'))
	assert.equal(length('America/New_York', '2026-11-01'), 25)

	// Europe: last Sunday of March and of October.
	assert.equal(length('Europe/Skopje', '2026-03-29'), 23)
	assert.equal(length('Europe/Skopje', '2026-10-25'), 25)
	assert.equal(length('Europe/Skopje', '2026-10-26'), 24)

	// The southern hemisphere runs the other way round.
	assert.equal(length('Pacific/Auckland', '2026-09-27'), 23)
	assert.equal(length('Pacific/Auckland', '2026-04-05'), 25)
})

test('closesAt: a DST change that skips midnight closes the day at the jump', () => {
	// Santiago springs forward at Saturday 24:00 → Sunday 01:00: no local midnight exists.
	const santiago = closesAt('America/Santiago', '2026-09-05')
	assert.deepEqual(santiago, at('2026-09-06T04:00:00Z'))
	assert.equal(todayIn('America/Santiago', santiago), '2026-09-06')
	assert.equal(todayIn('America/Santiago', new Date(santiago.getTime() - 1)), '2026-09-05')

	// Havana springs forward at 00:00 → 01:00.
	assert.deepEqual(closesAt('America/Havana', '2026-03-07'), at('2026-03-08T05:00:00Z'))

	// Santiago falls back at Sunday 00:00 → Saturday 23:00: Saturday repeats an hour and
	// lasts 25; the date never goes backwards, so it closes once, at the second midnight.
	assert.deepEqual(closesAt('America/Santiago', '2026-04-04'), at('2026-04-05T04:00:00Z'))
})

test('closesAt: a zone that skips a whole date', () => {
	// Samoa crossed the date line: 2011-12-29 23:59:59 (UTC-10) → 2011-12-31 00:00 (UTC+14).
	const jump = at('2011-12-30T10:00:00Z')
	assert.deepEqual(closesAt('Pacific/Apia', '2011-12-29'), jump)
	// The date that never happened closes the instant it would have begun.
	assert.deepEqual(closesAt('Pacific/Apia', '2011-12-30'), jump)
	assert.equal(todayIn('Pacific/Apia', jump), '2011-12-31')
})

test('closesAt and todayIn agree for every day of a year in every kind of zone', () => {
	const zones = [
		'UTC',
		'Europe/Skopje',
		'Europe/London',
		'America/New_York',
		'America/Santiago',
		'America/Havana',
		'Asia/Beirut',
		'Pacific/Auckland',
		'Australia/Lord_Howe', // a 30-minute DST shift
		'Asia/Kathmandu',
		'Pacific/Kiritimati', // UTC+14
		'Pacific/Pago_Pago' // UTC-11
	]
	for (const tz of zones) {
		let previous = closesAt(tz, '2025-12-31')
		for (let day = '2026-01-01'; day <= '2026-12-31'; day = addDays(day, 1)) {
			const closes = closesAt(tz, day)
			// The day begins where the one before closed, and holds every instant until it closes.
			assert.equal(todayIn(tz, previous), day, `${tz} ${day} opens`)
			assert.equal(todayIn(tz, new Date(closes.getTime() - 1)), day, `${tz} ${day} last ms`)
			assert.equal(todayIn(tz, closes), addDays(day, 1), `${tz} ${day} closes`)
			const hours = (closes.getTime() - previous.getTime()) / HOUR
			assert.ok(hours >= 23 && hours <= 25, `${tz} ${day} is ${hours}h`)
			previous = closes
		}
	}
})

test('canonicalTimeZone: IANA names only, in their canonical spelling', () => {
	assert.equal(canonicalTimeZone('Europe/Skopje'), 'Europe/Skopje')
	assert.equal(canonicalTimeZone('europe/skopje'), 'Europe/Skopje')
	// Three-part names are accepted; ICU stores its own (CLDR) spelling of an alias.
	const buenosAires = canonicalTimeZone('America/Argentina/Buenos_Aires')
	assert.ok(buenosAires && canonicalTimeZone(buenosAires) === buenosAires)
	assert.equal(canonicalTimeZone('UTC'), 'UTC')
	for (const bad of ['', 'Mars/Olympus_Mons', '+01:00', 'GMT+1', 'Europe', 'Europe/Skopje; drop']) {
		assert.equal(canonicalTimeZone(bad), null, bad)
	}
})

test('isDay: real dates written YYYY-MM-DD only', () => {
	assert.ok(isDay('2028-02-29'))
	for (const bad of ['2026-02-29', '2026-13-01', '2026-2-3', '2026-10-01T00:00:00Z', '']) {
		assert.equal(isDay(bad), false, bad)
	}
})

test('day arithmetic crosses months, years and leap days', () => {
	assert.equal(addDays('2028-02-28', 1), '2028-02-29')
	assert.equal(addDays('2026-12-31', 1), '2027-01-01')
	assert.equal(addDays('2026-03-01', -1), '2026-02-28')
	assert.equal(daysBetween('2026-10-05', '2026-10-11'), 6)
	assert.equal(daysBetween('2026-10-11', '2026-10-05'), -6)
	// Across Europe's autumn DST change: calendar days, not 24-hour spans.
	assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2)
	assert.equal(endDayFor('2026-10-05', 7), '2026-10-11')
	assert.equal(dayFromDate(dateFromDay('2026-10-05')), '2026-10-05')
})

test('pactStatus: from the dates, on every read', () => {
	const pact = { ...daily, cancelledAt: null }
	assert.equal(pactStatus(pact, '2026-10-04'), 'lobby')
	assert.equal(pactStatus(pact, '2026-10-05'), 'active')
	assert.equal(pactStatus(pact, '2026-10-11'), 'active')
	assert.equal(pactStatus(pact, '2026-10-12'), 'completed')
	assert.equal(
		pactStatus({ ...pact, cancelledAt: at('2026-10-01T10:00:00Z') }, '2026-10-04'),
		'cancelled'
	)
})

test('isPactDay: within the dates, and Monday to Friday for weekdays', () => {
	assert.ok(isPactDay(daily, '2026-10-10')) // Saturday
	assert.equal(isPactDay(weekdays, '2026-10-10'), false)
	assert.equal(isPactDay(weekdays, '2026-10-11'), false) // Sunday
	assert.ok(isPactDay(weekdays, '2026-10-12'))
	assert.equal(isPactDay(daily, '2026-10-04'), false)
	assert.equal(isPactDay(daily, '2026-10-12'), false)
	assert.deepEqual(pactDaysThrough(weekdays, '2026-10-13'), [
		'2026-10-05',
		'2026-10-06',
		'2026-10-07',
		'2026-10-08',
		'2026-10-09',
		'2026-10-12',
		'2026-10-13'
	])
	assert.deepEqual(pactDaysThrough(daily, '2026-10-04'), [])
	assert.equal(pactDaysThrough(daily, '2027-01-01').length, 7)
})

test('joinedDayFor: lobby joins from the start day, active joins from the next day', () => {
	assert.equal(joinedDayFor(daily, '2026-09-30'), '2026-10-05')
	assert.equal(joinedDayFor(daily, '2026-10-04'), '2026-10-05')
	// Joining on the start day itself, or later, is a late join.
	assert.equal(joinedDayFor(daily, '2026-10-05'), '2026-10-06')
	assert.equal(joinedDayFor(daily, '2026-10-08'), '2026-10-09')
	// On the last day there is nothing left to hold them to: the route refuses it.
	assert.ok(joinedDayFor(daily, '2026-10-11') > daily.endDay)
	// A Friday join to a weekdays pact is held from Monday.
	const friday = joinedDayFor(weekdays, '2026-10-09')
	const member = { userId: 'u', joinedDay: friday, leftDay: null }
	assert.equal(isHeldOn(weekdays, member, '2026-10-09'), false)
	assert.equal(isHeldOn(weekdays, member, '2026-10-10'), false)
	assert.ok(isHeldOn(weekdays, member, '2026-10-12'))
})

test('isHeldOn: from the joined day to the day before they left', () => {
	const member = { userId: 'u', joinedDay: '2026-10-07', leftDay: '2026-10-09' }
	assert.equal(isHeldOn(daily, member, '2026-10-06'), false)
	assert.ok(isHeldOn(daily, member, '2026-10-07'))
	assert.ok(isHeldOn(daily, member, '2026-10-08'))
	assert.equal(isHeldOn(daily, member, '2026-10-09'), false)
	// Never outside the pact, whatever the membership says.
	const early = { userId: 'u', joinedDay: '2026-10-01', leftDay: null }
	assert.equal(isHeldOn(daily, early, '2026-10-04'), false)
	assert.equal(isHeldOn(daily, early, '2026-10-12'), false)
})
