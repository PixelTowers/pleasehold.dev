// ABOUTME: BullMQ queue singleton for enqueuing notification jobs from the API server.
// ABOUTME: Provides a fire-and-forget enqueueNotification helper with retry/backoff defaults.

import { Queue } from 'bullmq';
import type { Job } from 'bullmq';

export interface NotificationJobData {
	entryId: string;
	projectId: string;
	type: 'entry_created' | 'verification_email';
}

const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT ?? '6380');

export const notificationQueue = new Queue<NotificationJobData>('notifications', {
	connection: {
		host: REDIS_HOST,
		port: REDIS_PORT,
	},
	defaultJobOptions: {
		attempts: 5,
		backoff: {
			type: 'exponential',
			delay: 5000,
		},
		removeOnComplete: {
			count: 1000,
			age: 24 * 60 * 60,
		},
		removeOnFail: {
			count: 5000,
			age: 7 * 24 * 60 * 60,
		},
	},
});

export async function enqueueNotification(data: NotificationJobData): Promise<Job<NotificationJobData>> {
	return notificationQueue.add(data.type, data);
}
