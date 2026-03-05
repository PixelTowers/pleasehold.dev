// ABOUTME: Unit tests for the notification processor's confirmation_email job type handling.
// ABOUTME: Verifies that processNotification routes confirmation_email jobs to the sender with correct context.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted so mock references are available inside vi.mock factories
const {
	mockFindFirstEntry,
	mockFindFirstProject,
	mockFindFirstUserSettings,
	mockFindFirstEmailTemplates,
	mockSendConfirmationEmail,
} = vi.hoisted(() => ({
	mockFindFirstEntry: vi.fn(),
	mockFindFirstProject: vi.fn(),
	mockFindFirstUserSettings: vi.fn(),
	mockFindFirstEmailTemplates: vi.fn(),
	mockSendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@pleasehold/db', () => ({
	createDb: () => ({
		query: {
			entries: { findFirst: mockFindFirstEntry },
			projects: { findFirst: mockFindFirstProject },
			userSettings: { findFirst: mockFindFirstUserSettings },
			emailTemplates: { findFirst: mockFindFirstEmailTemplates },
			notificationChannels: { findFirst: vi.fn() },
			notificationLogs: { findFirst: vi.fn() },
		},
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		returning: vi.fn().mockResolvedValue([]),
	}),
	entries: { id: 'entries.id' },
	projects: { id: 'projects.id' },
	userSettings: { userId: 'user_settings.user_id' },
	emailTemplates: { projectId: 'email_templates.project_id', type: 'email_templates.type' },
	notificationChannels: { projectId: 'nc.projectId', enabled: 'nc.enabled' },
	notificationLogs: { channelId: 'nl.channelId', entryId: 'nl.entryId', status: 'nl.status' },
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn((_col, val) => val),
	and: vi.fn((...args) => args),
}));

vi.mock('./senders/confirmation-email', () => ({
	sendConfirmationEmail: mockSendConfirmationEmail,
}));

vi.mock('./senders/verification-email', () => ({
	sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./senders/discord', () => ({
	sendDiscordNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./senders/email', () => ({
	sendEmailNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./senders/slack', () => ({
	sendSlackNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./senders/telegram', () => ({
	sendTelegramNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./senders/webhook', () => ({
	sendWebhookNotification: vi.fn().mockResolvedValue(undefined),
}));

import type { Job } from 'bullmq';
import { processNotification } from './processor';

function makeJob(data: {
	entryId: string;
	projectId: string;
	type: 'entry_created' | 'verification_email' | 'confirmation_email';
}) {
	return { data } as Job<typeof data>;
}

const TEST_ENTRY = {
	id: 'entry-1',
	email: 'user@example.com',
	name: 'Jane',
	company: 'Acme',
	position: 5,
	projectId: 'project-1',
	verificationToken: null,
};

const TEST_PROJECT = {
	id: 'project-1',
	name: 'Test Project',
	userId: 'user-1',
	logoUrl: 'https://example.com/logo.png',
	brandColor: '#0d9488',
	companyName: 'Test Corp',
};

beforeEach(() => {
	mockFindFirstEntry.mockReset();
	mockFindFirstProject.mockReset();
	mockFindFirstUserSettings.mockReset();
	mockFindFirstEmailTemplates.mockReset();
	mockSendConfirmationEmail.mockClear();
});

describe('processNotification — confirmation_email', () => {
	it('calls sendConfirmationEmail with correct payload', async () => {
		mockFindFirstEntry.mockResolvedValue(TEST_ENTRY);
		mockFindFirstProject.mockResolvedValue(TEST_PROJECT);
		mockFindFirstUserSettings.mockResolvedValue(null);
		mockFindFirstEmailTemplates.mockResolvedValue(null);

		await processNotification(
			makeJob({
				entryId: 'entry-1',
				projectId: 'project-1',
				type: 'confirmation_email',
			}),
		);

		expect(mockSendConfirmationEmail).toHaveBeenCalledOnce();
		const [payload, context] = mockSendConfirmationEmail.mock.calls[0];

		expect(payload).toEqual({
			email: 'user@example.com',
			name: 'Jane',
			position: 5,
			projectName: 'Test Project',
			companyName: 'Test Corp',
		});

		expect(context.branding).toEqual({
			logoUrl: 'https://example.com/logo.png',
			brandColor: '#0d9488',
			companyName: 'Test Corp',
			plan: null,
		});
	});

	it('passes custom template when one exists', async () => {
		mockFindFirstEntry.mockResolvedValue(TEST_ENTRY);
		mockFindFirstProject.mockResolvedValue(TEST_PROJECT);
		mockFindFirstUserSettings.mockResolvedValue(null);
		mockFindFirstEmailTemplates.mockResolvedValue({
			subject: 'Custom Subject',
			bodyHtml: '<p>Custom body</p>',
			buttonText: null,
		});

		await processNotification(
			makeJob({
				entryId: 'entry-1',
				projectId: 'project-1',
				type: 'confirmation_email',
			}),
		);

		const [, context] = mockSendConfirmationEmail.mock.calls[0];
		expect(context.customTemplate).toEqual({
			subject: 'Custom Subject',
			bodyHtml: '<p>Custom body</p>',
			buttonText: null,
		});
	});

	it('passes BYOK email options when user has settings', async () => {
		mockFindFirstEntry.mockResolvedValue(TEST_ENTRY);
		mockFindFirstProject.mockResolvedValue(TEST_PROJECT);
		mockFindFirstUserSettings.mockResolvedValue({
			resendApiKey: 're_custom_key',
			emailFromAddress: 'custom@acme.com',
			emailFromName: 'Acme',
		});
		mockFindFirstEmailTemplates.mockResolvedValue(null);

		await processNotification(
			makeJob({
				entryId: 'entry-1',
				projectId: 'project-1',
				type: 'confirmation_email',
			}),
		);

		const [, context] = mockSendConfirmationEmail.mock.calls[0];
		expect(context.emailOptions).toEqual({
			resendApiKey: 're_custom_key',
			fromAddress: 'custom@acme.com',
			fromName: 'Acme',
		});
	});

	it('skips when entry is not found', async () => {
		mockFindFirstEntry.mockResolvedValue(null);

		await processNotification(
			makeJob({
				entryId: 'missing-entry',
				projectId: 'project-1',
				type: 'confirmation_email',
			}),
		);

		expect(mockSendConfirmationEmail).not.toHaveBeenCalled();
	});

	it('skips when project is not found', async () => {
		mockFindFirstEntry.mockResolvedValue(TEST_ENTRY);
		mockFindFirstProject.mockResolvedValue(null);

		await processNotification(
			makeJob({
				entryId: 'entry-1',
				projectId: 'missing-project',
				type: 'confirmation_email',
			}),
		);

		expect(mockSendConfirmationEmail).not.toHaveBeenCalled();
	});
});
