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

/** The marquee's check-ins: whose, what habit, when. */
export const CHECK_INS: { photo: number; name: string; habit: string; time: string }[] = [
	{ photo: 21, name: 'Ana', habit: 'Run', time: '06:42' },
	{ photo: 13, name: 'Ben', habit: 'No sugar', time: '08:15' },
	{ photo: 9, name: 'Cleo', habit: 'Walk 5k', time: '19:03' },
	{ photo: 15, name: 'Dan', habit: 'Tea, not beer', time: '21:58' },
	{ photo: 20, name: 'Maya', habit: 'Commute on foot', time: '08:31' },
	{ photo: 3, name: 'Theo', habit: 'Outside first', time: '07:10' },
	{ photo: 19, name: 'Ines', habit: 'Something red', time: '12:24' },
	{ photo: 22, name: 'Sam', habit: 'Cycle in', time: '07:55' },
	{ photo: 14, name: 'Kofi', habit: 'Read 20 pages', time: '22:40' },
	{ photo: 7, name: 'Lena', habit: 'Run', time: '06:05' },
	{ photo: 25, name: 'Ravi', habit: 'Trail Sunday', time: '10:12' },
	{ photo: 16, name: 'Noor', habit: 'Write 300 words', time: '09:47' },
	{ photo: 6, name: 'Jules', habit: 'Woods walk', time: '17:20' },
	{ photo: 30, name: 'Mia', habit: 'Water the plants', time: '18:02' },
	{ photo: 24, name: 'Omar', habit: 'Run', time: '06:58' },
	{ photo: 17, name: 'Bea', habit: 'Call grandma', time: '19:30' },
	{ photo: 2, name: 'Finn', habit: 'Stairs, not lift', time: '08:49' },
	{ photo: 29, name: 'Zoe', habit: 'Coffee at home', time: '07:22' },
	{ photo: 26, name: 'Leo', habit: '10k steps', time: '20:11' },
	{ photo: 18, name: 'Ada', habit: 'Phone-free hour', time: '21:05' }
]
