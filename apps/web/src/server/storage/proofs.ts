import { randomUUID } from 'node:crypto'
import { PROOF_CONTENT_TYPES, proofPathSchema, type AvatarContentType } from '@app/contract'
import { createSecretKeyClient } from '@/lib/supabase/secret-key'
import { UPLOADS_BUCKET, type AvatarUpload } from './avatars'

// Check-in proof photos (R12): the same private `user-uploads` bucket as avatars, with the
// same types and 5 MiB limit, under `<user id>/proofs/`. The route picks every path, so the
// path itself says whose photo it is, and a check-in only accepts a path in the caller's own
// folder that exists in storage. The judge downloads the photo from here, never from a
// request body (R13).

// Supabase's fixed validity for a signed upload URL (as in ./avatars).
const UPLOAD_URL_VALID_MS = 2 * 60 * 60 * 1000

export function proofFolder(userId: string): string {
	return `${userId}/proofs`
}

/** Whether `path` is a proof upload of this person's, in the shape the upload route hands out. */
export function isOwnProofPath(userId: string, path: string): boolean {
	return proofPathSchema.safeParse(path).success && path.startsWith(`${proofFolder(userId)}/`)
}

function bucket() {
	return createSecretKeyClient().storage.from(UPLOADS_BUCKET)
}

/** A signed URL the device PUTs one proof photo to, at a fresh path under the person's folder. */
export async function createProofUpload(
	userId: string,
	contentType: AvatarContentType
): Promise<AvatarUpload> {
	const path = `${proofFolder(userId)}/${randomUUID()}.${PROOF_CONTENT_TYPES[contentType]}`
	const expiresAt = new Date(Date.now() + UPLOAD_URL_VALID_MS)
	const { data, error } = await bucket().createSignedUploadUrl(path)
	if (error) throw error
	return { bucket: UPLOADS_BUCKET, path, signedUrl: data.signedUrl, token: data.token, expiresAt }
}

/** Whether the file was uploaded. Throws when storage fails. */
export async function proofExists(path: string): Promise<boolean> {
	// A missing file is `data: false` WITH an error (storage answers 400 or 404); any other
	// failure throws inside the SDK. So only `data` decides.
	const { data } = await bucket().exists(path)
	return data
}

/** The photo's bytes and type, for the judge. Throws when storage fails or it's gone. */
export async function downloadProof(path: string): Promise<{ bytes: Buffer; mimeType: string }> {
	const { data, error } = await bucket().download(path)
	if (error) throw error
	return { bytes: Buffer.from(await data.arrayBuffer()), mimeType: data.type || 'image/jpeg' }
}
