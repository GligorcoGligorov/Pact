/** The feed's day sections: one per day, however the feed's instants and days interleave. */
import { groupByDay } from '@/lib/feedDays'

const entry = (id: string, day: string) => ({ id, day })

it('crews in different timezones: one section per day, newest day first', () => {
	// Newest first by instant: LA's 5th, Tokyo's 6th, then LA's 5th again (the bug's shape).
	const groups = groupByDay([
		entry('la-2', '2026-10-05'),
		entry('tokyo', '2026-10-06'),
		entry('la-1', '2026-10-05')
	])
	expect(groups.map((g) => g.day)).toEqual(['2026-10-06', '2026-10-05'])
	expect(groups[1].entries.map((e) => e.id)).toEqual(['la-2', 'la-1'])
	expect(new Set(groups.map((g) => g.day)).size).toBe(groups.length)
})

it('an ordinary feed keeps its order', () => {
	const groups = groupByDay([
		entry('a', '2026-10-06'),
		entry('b', '2026-10-06'),
		entry('c', '2026-10-04')
	])
	expect(groups).toEqual([
		{ day: '2026-10-06', entries: [entry('a', '2026-10-06'), entry('b', '2026-10-06')] },
		{ day: '2026-10-04', entries: [entry('c', '2026-10-04')] }
	])
	expect(groupByDay([])).toEqual([])
})
