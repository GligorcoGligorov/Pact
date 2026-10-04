import type { z } from 'zod'
import { deleteAccountResponse } from './account'
import { listActivityQuery, listActivityResponse } from './activity'
import { appConfigSchema } from './config'
import {
	createItemBody,
	itemParams,
	itemResponse,
	listItemsQuery,
	listItemsResponse
} from './items'
import {
	addReactionBody,
	listFeedQuery,
	listFeedResponse,
	reactionParams,
	reactionResponse
} from './feed'
import { listNotificationsQuery, listNotificationsResponse } from './notifications'
import {
	blockBody,
	blockParams,
	leavePactBody,
	listBlocksResponse,
	memberParams,
	okResponse,
	reportCheckInBody
} from './safety'
import {
	checkInParams,
	checkInResponse,
	createCheckInBody,
	createCheckInUploadBody,
	createNudgeBody,
	createPactBody,
	inviteParams,
	inviteResponse,
	joinPactBody,
	joinPactResponse,
	nudgeResponse,
	listPactsResponse,
	pactDetailResponse,
	pactParams,
	pactResponse
} from './pacts'
import { profileResponse, updateProfileBody } from './profile'
import { createTaskBody, listTasksQuery, listTasksResponse, taskResponse } from './tasks'
import { createUploadBody, createUploadResponse } from './uploads'

// Every /api/app/v1 route, once: its method, path, who may call it, and the
// schemas for what goes in and what comes back. The web builds each route from
// its entry (src/server/api/app-route.ts); the app's API client
// (apps/mobile/lib/api.ts) calls routes by name and parses responses with the
// same schemas.

export type Endpoint = {
	method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
	/** `:name` marks a path parameter, validated by `params`. */
	path: `/api/app/v1/${string}`
	/** `user`: a Supabase access token as `Authorization: Bearer …`. */
	auth: 'user' | 'public'
	query?: z.ZodType
	params?: z.ZodType
	body?: z.ZodType
	response: z.ZodType
	/** The success status. A POST that finds its `id` already created answers 200. */
	status: 200 | 201
}

export const endpoints = {
	getConfig: {
		method: 'GET',
		path: '/api/app/v1/config',
		auth: 'public',
		response: appConfigSchema,
		status: 200
	},
	getProfile: {
		method: 'GET',
		path: '/api/app/v1/profile',
		auth: 'user',
		response: profileResponse,
		status: 200
	},
	updateProfile: {
		method: 'PATCH',
		path: '/api/app/v1/profile',
		auth: 'user',
		body: updateProfileBody,
		response: profileResponse,
		status: 200
	},
	listItems: {
		method: 'GET',
		path: '/api/app/v1/items',
		auth: 'user',
		query: listItemsQuery,
		response: listItemsResponse,
		status: 200
	},
	getItem: {
		method: 'GET',
		path: '/api/app/v1/items/:id',
		auth: 'user',
		params: itemParams,
		response: itemResponse,
		status: 200
	},
	createItem: {
		method: 'POST',
		path: '/api/app/v1/items',
		auth: 'user',
		body: createItemBody,
		response: itemResponse,
		status: 201
	},
	listTasks: {
		method: 'GET',
		path: '/api/app/v1/tasks',
		auth: 'user',
		query: listTasksQuery,
		response: listTasksResponse,
		status: 200
	},
	createTask: {
		method: 'POST',
		path: '/api/app/v1/tasks',
		auth: 'user',
		body: createTaskBody,
		response: taskResponse,
		status: 201
	},
	listActivity: {
		method: 'GET',
		path: '/api/app/v1/activity',
		auth: 'user',
		query: listActivityQuery,
		response: listActivityResponse,
		status: 200
	},
	listNotifications: {
		method: 'GET',
		path: '/api/app/v1/notifications',
		auth: 'user',
		query: listNotificationsQuery,
		response: listNotificationsResponse,
		status: 200
	},
	deleteAccount: {
		method: 'DELETE',
		path: '/api/app/v1/account',
		auth: 'user',
		response: deleteAccountResponse,
		status: 200
	},
	createUpload: {
		method: 'POST',
		path: '/api/app/v1/uploads',
		auth: 'user',
		body: createUploadBody,
		response: createUploadResponse,
		status: 201
	},
	listPacts: {
		method: 'GET',
		path: '/api/app/v1/pacts',
		auth: 'user',
		response: listPactsResponse,
		status: 200
	},
	createPact: {
		method: 'POST',
		path: '/api/app/v1/pacts',
		auth: 'user',
		body: createPactBody,
		response: pactResponse,
		status: 201
	},
	getPact: {
		method: 'GET',
		path: '/api/app/v1/pacts/:id',
		auth: 'user',
		params: pactParams,
		response: pactDetailResponse,
		status: 200
	},
	getInvite: {
		method: 'GET',
		path: '/api/app/v1/invites/:code',
		auth: 'user',
		params: inviteParams,
		response: inviteResponse,
		status: 200
	},
	joinPact: {
		method: 'POST',
		path: '/api/app/v1/invites/:code/join',
		auth: 'user',
		params: inviteParams,
		body: joinPactBody,
		response: joinPactResponse,
		status: 201
	},
	createCheckInUpload: {
		method: 'POST',
		path: '/api/app/v1/pacts/:id/check-ins/upload',
		auth: 'user',
		params: pactParams,
		body: createCheckInUploadBody,
		response: createUploadResponse,
		status: 201
	},
	createCheckIn: {
		method: 'POST',
		path: '/api/app/v1/pacts/:id/check-ins',
		auth: 'user',
		params: pactParams,
		body: createCheckInBody,
		response: checkInResponse,
		status: 201
	},
	getCheckIn: {
		method: 'GET',
		path: '/api/app/v1/check-ins/:id',
		auth: 'user',
		params: checkInParams,
		response: checkInResponse,
		status: 200
	},
	createNudge: {
		method: 'POST',
		path: '/api/app/v1/pacts/:id/nudges',
		auth: 'user',
		params: pactParams,
		body: createNudgeBody,
		response: nudgeResponse,
		status: 201
	},
	reportCheckIn: {
		method: 'POST',
		path: '/api/app/v1/check-ins/:id/report',
		auth: 'user',
		params: checkInParams,
		body: reportCheckInBody,
		response: okResponse,
		status: 200
	},
	listBlocks: {
		method: 'GET',
		path: '/api/app/v1/blocks',
		auth: 'user',
		response: listBlocksResponse,
		status: 200
	},
	blockUser: {
		method: 'POST',
		path: '/api/app/v1/blocks/:user',
		auth: 'user',
		params: blockParams,
		body: blockBody,
		response: okResponse,
		status: 200
	},
	unblockUser: {
		method: 'DELETE',
		path: '/api/app/v1/blocks/:user',
		auth: 'user',
		params: blockParams,
		response: okResponse,
		status: 200
	},
	leavePact: {
		method: 'POST',
		path: '/api/app/v1/pacts/:id/leave',
		auth: 'user',
		params: pactParams,
		body: leavePactBody,
		response: okResponse,
		status: 200
	},
	removeMember: {
		method: 'DELETE',
		path: '/api/app/v1/pacts/:id/members/:member',
		auth: 'user',
		params: memberParams,
		response: okResponse,
		status: 200
	},
	listFeed: {
		method: 'GET',
		path: '/api/app/v1/feed',
		auth: 'user',
		query: listFeedQuery,
		response: listFeedResponse,
		status: 200
	},
	addReaction: {
		method: 'POST',
		path: '/api/app/v1/check-ins/:id/reactions/:reaction',
		auth: 'user',
		params: reactionParams,
		body: addReactionBody,
		response: reactionResponse,
		status: 200
	},
	removeReaction: {
		method: 'DELETE',
		path: '/api/app/v1/check-ins/:id/reactions/:reaction',
		auth: 'user',
		params: reactionParams,
		response: reactionResponse,
		status: 200
	}
} as const satisfies Record<string, Endpoint>

export type EndpointName = keyof typeof endpoints
