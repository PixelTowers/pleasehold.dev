// ABOUTME: Presigned URL endpoint for direct browser-to-S3/R2 file uploads.
// ABOUTME: Requires authentication; validates file type and generates a unique key for each upload.

import type { createAuth } from '@pleasehold/auth';
import { Hono } from 'hono';
import { createPresignedUploadUrl, isStorageConfigured } from '../../lib/storage';

const ALLOWED_MIME_PREFIXES = ['image/'];
const MAX_FILE_SIZE = 512 * 1024;

export function createUploadRoute(auth: ReturnType<typeof createAuth>) {
	const route = new Hono();

	route.post('/presign', async (c) => {
		const session = await auth.api.getSession({ headers: c.req.raw.headers });
		if (!session?.user) {
			return c.json({ error: 'Unauthorized' }, 401);
		}

		if (!isStorageConfigured()) {
			return c.json({ error: 'File storage is not configured' }, 503);
		}

		const body = await c.req.json<{ contentType?: string; fileName?: string }>();
		const { contentType, fileName } = body;

		if (!contentType || !ALLOWED_MIME_PREFIXES.some((p) => contentType.startsWith(p))) {
			return c.json({ error: 'Only image files are allowed' }, 400);
		}

		const ext = fileName?.split('.').pop() ?? contentType.split('/')[1] ?? 'png';
		const key = `logos/${session.user.id}/${Date.now()}.${ext}`;

		const { uploadUrl, publicUrl } = await createPresignedUploadUrl(
			key,
			contentType,
			MAX_FILE_SIZE,
		);

		return c.json({ uploadUrl, publicUrl });
	});

	return route;
}
