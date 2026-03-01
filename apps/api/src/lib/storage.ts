// ABOUTME: S3-compatible storage client for file uploads (works with Cloudflare R2, AWS S3, MinIO).
// ABOUTME: Provides presigned URL generation for direct browser-to-storage uploads.

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const S3_BUCKET = process.env.S3_BUCKET;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL;

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
	if (!s3Client) {
		if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
			throw new Error(
				'S3/R2 storage is not configured. Set S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.',
			);
		}
		s3Client = new S3Client({
			region: 'auto',
			endpoint: S3_ENDPOINT,
			forcePathStyle: true,
			credentials: {
				accessKeyId: S3_ACCESS_KEY_ID,
				secretAccessKey: S3_SECRET_ACCESS_KEY,
			},
		});
	}
	return s3Client;
}

export function isStorageConfigured(): boolean {
	return !!(S3_BUCKET && S3_ENDPOINT && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY && S3_PUBLIC_URL);
}

export async function createPresignedUploadUrl(
	key: string,
	contentType: string,
	_maxSizeBytes = 512 * 1024,
): Promise<{ uploadUrl: string; publicUrl: string }> {
	const client = getS3Client();

	const command = new PutObjectCommand({
		Bucket: S3_BUCKET!,
		Key: key,
		ContentType: contentType,
	});

	const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
	const publicUrl = `${S3_PUBLIC_URL}/${key}`;

	return { uploadUrl, publicUrl };
}
