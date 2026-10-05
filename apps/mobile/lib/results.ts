import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pactParams } from '@app/contract'
import { api, ApiError, type ResponseOf } from './api'
import { env } from './env'
import { pactKeys } from './pacts'

// The end of a pact: its results (GET pacts/:id/result), round 2 with the same crew, and the
// public page a crew shares (the web's /results/[pact]).

export type PactResultDetail = ResponseOf<'getPactResult'>

export const resultKeys = {
	result: (id: string) => ['pacts', id, 'result'] as const
}

/**
 * A finished pact's results. `null` when the pact is gone or the caller was never in it (404),
 * and `'not_finished'` while it is still running: both are states, not errors.
 */
export function usePactResult(id: string) {
	return useQuery<PactResultDetail | null | 'not_finished'>({
		queryKey: resultKeys.result(id),
		queryFn: async ({ signal }) => {
			if (!pactParams.safeParse({ id }).success) return null
			try {
				return await api('getPactResult', { params: { id }, signal })
			} catch (error) {
				if (error instanceof ApiError && error.code === 'not_found') return null
				if (error instanceof ApiError && error.code === 'not_finished') return 'not_finished'
				throw error
			}
		}
	})
}

/**
 * "Same crew, new pact". Safe to tap twice: the server keeps one round 2 per finished pact and
 * answers a second tap, or a crewmate's, with the one already started.
 */
export function useRematch(id: string) {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: () => api('rematchPact', { params: { id }, body: {} }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: pactKeys.all })
	})
}

/** The public results page, for the share sheet and link previews. */
export function resultPageUrl(pactId: string): string | null {
	const site = env.EXPO_PUBLIC_SITE_URL
	return site ? `${site.replace(/\/+$/, '')}/results/${pactId}` : null
}
