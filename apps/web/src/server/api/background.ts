import { after } from 'next/server'

// Work a route starts after its response is sent: the AI judge (R13), which must never make
// the person wait. An object, not a bare function, so a route suite can replace `run` and
// await the task itself; Next's `after()` throws outside a real request.
export const background = {
	run(task: () => Promise<unknown>): void {
		after(task)
	}
}
