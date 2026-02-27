// ABOUTME: BullMQ job processor that routes notification jobs to channel-specific sender functions.
// ABOUTME: Handles entry_created (multi-channel fan-out) and verification_email job types with delivery logging.

import {
	createDb,
	entries,
	notificationChannels,
	notificationLogs,
	projects,
	userSettings,
} from '@pleasehold/db';
import type { Job } from 'bullmq';
import { and, eq } from 'drizzle-orm';
import { sendDiscordNotification } from './senders/discord';
import { sendEmailNotification } from './senders/email';
import { sendSlackNotification } from './senders/slack';
import { sendTelegramNotification } from './senders/telegram';
import { sendVerificationEmail } from './senders/verification-email';
import { sendWebhookNotification } from './senders/webhook';
import type { EmailSenderOptions, EntryPayload } from './types';

interface NotificationJobData {
	entryId: string;
	projectId: string;
	type: 'entry_created' | 'verification_email';
}

const db = createDb(process.env.DATABASE_URL!);

async function getEmailSenderOptions(userId: string): Promise<EmailSenderOptions> {
	const settings = await db.query.userSettings.findFirst({
		where: eq(userSettings.userId, userId),
	});
	if (!settings) return {};
	return {
		resendApiKey: settings.resendApiKey,
		fromAddress: settings.emailFromAddress,
		fromName: settings.emailFromName,
	};
}

export async function processNotification(job: Job<NotificationJobData>): Promise<void> {
	const { data } = job;

	if (data.type === 'entry_created') {
		await processEntryCreated(data);
	} else if (data.type === 'verification_email') {
		await processVerificationEmail(data);
	} else {
		console.warn(`Unknown job type: ${(data as unknown as Record<string, unknown>).type}`);
	}
}

async function processEntryCreated(data: NotificationJobData): Promise<void> {
	const entry = await db.query.entries.findFirst({
		where: eq(entries.id, data.entryId),
	});

	if (!entry) {
		console.warn(`Entry ${data.entryId} not found -- may have been deleted. Skipping.`);
		return;
	}

	const project = await db.query.projects.findFirst({
		where: eq(projects.id, data.projectId),
	});

	if (!project) {
		console.warn(`Project ${data.projectId} not found. Skipping.`);
		return;
	}

	const channels = await db
		.select()
		.from(notificationChannels)
		.where(
			and(
				eq(notificationChannels.projectId, data.projectId),
				eq(notificationChannels.enabled, true),
			),
		);

	if (channels.length === 0) {
		console.log(`No enabled channels for project ${data.projectId}. Nothing to send.`);
		return;
	}

	const emailOptions = await getEmailSenderOptions(project.userId);

	const entryPayload: EntryPayload = {
		email: entry.email,
		name: entry.name,
		company: entry.company,
		position: entry.position,
		projectName: project.name,
	};

	const failures: Array<{ channelId: string; error: string }> = [];

	for (const channel of channels) {
		// Skip channels that already have a 'sent' log for this entry (prevents duplicates on retry)
		const existingLog = await db.query.notificationLogs.findFirst({
			where: and(
				eq(notificationLogs.channelId, channel.id),
				eq(notificationLogs.entryId, data.entryId),
				eq(notificationLogs.status, 'sent'),
			),
		});

		if (existingLog) {
			console.log(`Channel ${channel.id} already sent for entry ${data.entryId}. Skipping.`);
			continue;
		}

		try {
			await dispatchToChannel(channel, entryPayload, emailOptions);

			await db.insert(notificationLogs).values({
				channelId: channel.id,
				entryId: data.entryId,
				status: 'sent',
				attemptCount: 1,
				sentAt: new Date(),
			});
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			console.error(`Failed to send to channel ${channel.id} (${channel.type}): ${errorMessage}`);

			await db.insert(notificationLogs).values({
				channelId: channel.id,
				entryId: data.entryId,
				status: 'failed',
				error: errorMessage,
				attemptCount: 1,
			});

			failures.push({ channelId: channel.id, error: errorMessage });
		}
	}

	if (failures.length > 0) {
		throw new Error(
			`${failures.length} channel(s) failed: ${failures.map((f) => `${f.channelId}: ${f.error}`).join('; ')}`,
		);
	}
}

async function dispatchToChannel(
	channel: typeof notificationChannels.$inferSelect,
	entry: EntryPayload,
	emailOptions?: EmailSenderOptions,
): Promise<void> {
	const config = channel.config as Record<string, unknown>;

	switch (channel.type) {
		case 'email': {
			const recipients = config.recipients as string[];
			await sendEmailNotification(recipients, entry, emailOptions);
			break;
		}
		case 'slack': {
			const webhookUrl = config.webhookUrl as string;
			await sendSlackNotification(webhookUrl, entry);
			break;
		}
		case 'discord': {
			const webhookUrl = config.webhookUrl as string;
			await sendDiscordNotification(webhookUrl, entry);
			break;
		}
		case 'telegram': {
			const botToken = config.botToken as string;
			const chatId = config.chatId as string;
			await sendTelegramNotification(botToken, chatId, entry);
			break;
		}
		case 'webhook': {
			const url = config.url as string;
			const secret = config.secret as string;
			await sendWebhookNotification(url, secret, {
				event: 'entry.created',
				entry: {
					email: entry.email,
					name: entry.name,
					company: entry.company,
					position: entry.position,
				},
				project: {
					name: entry.projectName,
				},
			});
			break;
		}
		default: {
			console.warn(`Unknown channel type: ${channel.type}`);
		}
	}
}

async function processVerificationEmail(data: NotificationJobData): Promise<void> {
	const entry = await db.query.entries.findFirst({
		where: eq(entries.id, data.entryId),
	});

	if (!entry) {
		console.warn(`Entry ${data.entryId} not found for verification email. Skipping.`);
		return;
	}

	if (!entry.verificationToken) {
		console.warn(`Entry ${data.entryId} has no verification token. Skipping.`);
		return;
	}

	const project = await db.query.projects.findFirst({
		where: eq(projects.id, data.projectId),
	});

	if (!project) {
		console.warn(`Project ${data.projectId} not found. Skipping.`);
		return;
	}

	const emailOptions = await getEmailSenderOptions(project.userId);
	await sendVerificationEmail(entry.email, entry.verificationToken, project.name, emailOptions);
	console.log(`Verification email sent to ${entry.email} for project ${project.name}`);
}
