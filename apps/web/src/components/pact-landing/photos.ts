/**
 * The landing's check-in photos, in /public/wall/<n>.jpg: Unsplash photos served by Lorem Picsum,
 * free under the Unsplash licence. 1–12 are the app's onboarding set (Picsum ids 17 57 103 155
 * 177 190 202 203 241 255 278 31, 320px wide); 13–32 come from `npm run demo:photos` (ids 63 30
 * 225 42 129 239 106 22 173 182 196 204 216 254 11 14 113 152 268 74, 480px wide). A demo crew's;
 * the public join and results pages never show a photo (R25, R27).
 */
export const PHOTO_COUNT = 32

export const photoSrc = (n: number) => `/wall/${n}.jpg`

/** The demo crew, in wall order. Dan is always the last one in. */
export const CREW = ['Ana', 'Ben', 'Cleo', 'Dan'] as const

/** Photo n for crew member `member` on day `day`, cycling the whole set without repeats nearby. */
export function photoFor(day: number, member: number): number {
	return ((day * CREW.length + member) % PHOTO_COUNT) + 1
}

/** The marquee's check-ins: whose, what habit, when, and the AI judge's one-liner on it. */
export const CHECK_INS: {
	photo: number
	name: string
	habit: string
	time: string
	line: string
}[] = [
	{ photo: 21, name: 'Ana', habit: 'Run', time: '06:42', line: 'Up before the sun. Noted.' },
	{ photo: 13, name: 'Ben', habit: 'No sugar', time: '08:15', line: 'Milk, no sugar. Allowed.' },
	{
		photo: 9,
		name: 'Cleo',
		habit: 'Walk 5k',
		time: '19:03',
		line: 'A long hill. Walked anyway.'
	},
	{ photo: 15, name: 'Dan', habit: 'Tea, not beer', time: '21:58', line: 'Cutting it close, Dan.' },
	{
		photo: 20,
		name: 'Maya',
		habit: 'Walk to work',
		time: '08:31',
		line: 'Commute: walked. Bus: ignored.'
	},
	{
		photo: 3,
		name: 'Theo',
		habit: 'Outside first',
		time: '07:10',
		line: 'Grass touched, as promised.'
	},
	{
		photo: 19,
		name: 'Ines',
		habit: 'Something red',
		time: '12:24',
		line: 'The challenge, in bloom.'
	},
	{ photo: 22, name: 'Sam', habit: 'Cycle in', time: '07:55', line: 'Windy. Still counts.' },
	{
		photo: 14,
		name: 'Kofi',
		habit: 'Read 20 pages',
		time: '22:40',
		line: 'Mug as a bookmark. Bold.'
	},
	{ photo: 7, name: 'Lena', habit: 'Run', time: '06:05', line: 'Day 12. The trail knows you.' },
	{
		photo: 25,
		name: 'Ravi',
		habit: 'Trail Sunday',
		time: '10:12',
		line: 'Muddy enough to be real.'
	},
	{
		photo: 16,
		name: 'Noor',
		habit: 'Write daily',
		time: '09:47',
		line: 'Corner table. 300 words.'
	},
	{
		photo: 6,
		name: 'Jules',
		habit: 'Woods walk',
		time: '17:20',
		line: 'The path has been walked.'
	},
	{ photo: 30, name: 'Mia', habit: 'Water plants', time: '18:02', line: 'The petunias thank you.' },
	{ photo: 24, name: 'Omar', habit: 'Run', time: '06:58', line: 'Tracks, not treadmill.' },
	{
		photo: 17,
		name: 'Bea',
		habit: 'Call grandma',
		time: '19:30',
		line: 'Bench secured. Call placed.'
	},
	{
		photo: 2,
		name: 'Finn',
		habit: 'Lunch walk',
		time: '08:49',
		line: 'Street, not sofa.'
	},
	{ photo: 29, name: 'Zoe', habit: 'Coffee at home', time: '07:22', line: 'Home brew confirmed.' },
	{ photo: 26, name: 'Leo', habit: '10k steps', time: '20:11', line: 'Late, but legitimate.' },
	{
		photo: 18,
		name: 'Ada',
		habit: 'No-phone hour',
		time: '21:05',
		line: 'A dandelion, not a screen.'
	}
]
