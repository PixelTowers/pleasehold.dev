// ABOUTME: Unit tests for the confirmation email sender function.
// ABOUTME: Verifies default/custom templates, branding, variable substitution, and Resend API calls.

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Resend client before importing the sender
const mockSend = vi.fn().mockResolvedValue({ id: 'mock-email-id' });
vi.mock('./mailer', () => ({
	getResendClient: vi.fn(() => ({
		emails: { send: mockSend },
	})),
}));

import { sendConfirmationEmail } from './confirmation-email';

beforeEach(() => {
	mockSend.mockClear();
});

describe('sendConfirmationEmail', () => {
	const basePayload = {
		email: 'user@example.com',
		name: 'Jane Doe',
		position: 42,
		projectName: 'Acme Waitlist',
		companyName: 'Acme Corp',
	};

	describe('default template', () => {
		it('sends email with correct subject and recipient', async () => {
			await sendConfirmationEmail(basePayload);

			expect(mockSend).toHaveBeenCalledOnce();
			const call = mockSend.mock.calls[0][0];
			expect(call.to).toEqual(['user@example.com']);
			expect(call.subject).toBe("You're on the Acme Waitlist waitlist!");
		});

		it('includes position in the HTML body', async () => {
			await sendConfirmationEmail(basePayload);

			const call = mockSend.mock.calls[0][0];
			expect(call.html).toContain('#42');
		});

		it('includes user name in the HTML body', async () => {
			await sendConfirmationEmail(basePayload);

			const call = mockSend.mock.calls[0][0];
			expect(call.html).toContain('Jane Doe');
		});

		it('includes position in the text body', async () => {
			await sendConfirmationEmail(basePayload);

			const call = mockSend.mock.calls[0][0];
			expect(call.text).toContain('#42');
		});

		it('uses default from address when no options provided', async () => {
			await sendConfirmationEmail(basePayload);

			const call = mockSend.mock.calls[0][0];
			expect(call.from).toContain('noreply@');
		});

		it('falls back to "there" when name is null', async () => {
			await sendConfirmationEmail({ ...basePayload, name: null });

			const call = mockSend.mock.calls[0][0];
			expect(call.html).toContain('Hey there');
		});
	});

	describe('with branding context', () => {
		it('wraps HTML in branded layout', async () => {
			await sendConfirmationEmail(basePayload, {
				branding: {
					logoUrl: 'https://example.com/logo.png',
					brandColor: '#ff6600',
					companyName: 'Acme Corp',
				},
			});

			const call = mockSend.mock.calls[0][0];
			expect(call.html).toContain('#ff6600');
			expect(call.html).toContain('Acme Corp');
			expect(call.html).toContain('logo.png');
		});
	});

	describe('with custom email options', () => {
		it('uses custom from address and name', async () => {
			await sendConfirmationEmail(basePayload, {
				emailOptions: {
					fromAddress: 'hello@acme.com',
					fromName: 'Acme Team',
				},
			});

			const call = mockSend.mock.calls[0][0];
			expect(call.from).toBe('Acme Team <hello@acme.com>');
		});

		it('uses custom from address without name', async () => {
			await sendConfirmationEmail(basePayload, {
				emailOptions: {
					fromAddress: 'hello@acme.com',
				},
			});

			const call = mockSend.mock.calls[0][0];
			expect(call.from).toBe('hello@acme.com');
		});
	});

	describe('with custom template', () => {
		it('renders custom subject with variable substitution', async () => {
			await sendConfirmationEmail(basePayload, {
				customTemplate: {
					subject: 'Welcome to {{project_name}}, {{name}}!',
					bodyHtml: '<p>You are #{{position}} on the list.</p>',
					buttonText: null,
				},
			});

			const call = mockSend.mock.calls[0][0];
			expect(call.subject).toBe('Welcome to Acme Waitlist, Jane Doe!');
			expect(call.html).toContain('You are #42 on the list.');
		});

		it('does not render a button when buttonText is null', async () => {
			await sendConfirmationEmail(basePayload, {
				customTemplate: {
					subject: 'Welcome!',
					bodyHtml: '<p>Hello</p>',
					buttonText: null,
				},
			});

			const call = mockSend.mock.calls[0][0];
			// No button element expected in the body
			expect(call.html).not.toContain('border-radius: 6px');
		});

		it('renders a button when buttonText is provided', async () => {
			await sendConfirmationEmail(basePayload, {
				customTemplate: {
					subject: 'Welcome!',
					bodyHtml: '<p>Hello</p>',
					buttonText: 'Visit {{project_name}}',
				},
				branding: { brandColor: '#0d9488' },
			});

			const call = mockSend.mock.calls[0][0];
			expect(call.html).toContain('Visit Acme Waitlist');
			expect(call.html).toContain('#0d9488');
		});
	});
});
