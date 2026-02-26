// ABOUTME: Background worker entry point for processing notification jobs via BullMQ.
// ABOUTME: Connects to Redis, validates eviction policy, and listens on the 'notifications' queue with graceful shutdown.

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { processNotification } from './processor';

const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT ?? '6380');

const connection = {
	host: REDIS_HOST,
	port: REDIS_PORT,
	maxRetriesPerRequest: null,
};

async function validateRedisPolicy(): Promise<void> {
	const redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
	try {
		const result = await redis.config('GET', 'maxmemory-policy');
		const policy = Array.isArray(result) ? result[1] : undefined;
		if (policy !== 'noeviction') {
			console.warn(
				`WARNING: Redis maxmemory-policy is '${policy ?? 'unknown'}', expected 'noeviction'. BullMQ may lose jobs under memory pressure.`,
			);
		} else {
			console.log('Redis maxmemory-policy validated: noeviction');
		}
	} catch (err) {
		console.warn('WARNING: Could not validate Redis maxmemory-policy:', err);
	} finally {
		await redis.quit();
	}
}

const worker = new Worker('notifications', processNotification, {
	connection,
	concurrency: 5,
});

worker.on('completed', (job) => {
	console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
	console.error(`Job ${job?.id} failed: ${err.message}`);
});

worker.on('error', (err) => {
	console.error('Worker error:', err);
});

async function shutdown(): Promise<void> {
	console.log('Shutting down worker...');
	await worker.close();
	process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

await validateRedisPolicy();
console.log('Worker started, listening on notifications queue');
