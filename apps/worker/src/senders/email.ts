// ABOUTME: Email notification sender that delivers formatted entry alerts to configured recipients via Resend.
// ABOUTME: Supports BYOK Resend clients and custom from addresses via EmailSenderOptions.

import type { EmailSenderOptions, EntryPayload } from '../types';
import { getResendClient } from './mailer';

const DEFAULT_EMAIL_FROM = process.env.EMAIL_FROM ?? 'notifications@pleasehold.dev';

export async function sendEmailNotification(
	recipients: string[],
	entry: EntryPayload,
	options?: EmailSenderOptions,
): Promise<void> {
	const fromAddress = options?.fromAddress ?? DEFAULT_EMAIL_FROM;
	const fromName = options?.fromName;
	const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
	const client = getResendClient(options?.resendApiKey);

	const subject = `New entry on ${entry.projectName}: ${entry.email}`;

	const textBody = [
		`New entry on ${entry.projectName}`,
		'',
		`Email: ${entry.email}`,
		entry.name ? `Name: ${entry.name}` : null,
		entry.company ? `Company: ${entry.company}` : null,
		`Position: #${entry.position}`,
	]
		.filter(Boolean)
		.join('\n');

	const htmlBody = `
<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
  <h2 style="color: #1a1a2e;">New entry on ${escapeHtml(entry.projectName)}</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;">${escapeHtml(entry.email)}</td></tr>
    ${entry.name ? `<tr><td style="padding: 8px 0; color: #666;">Name</td><td style="padding: 8px 0;">${escapeHtml(entry.name)}</td></tr>` : ''}
    ${entry.company ? `<tr><td style="padding: 8px 0; color: #666;">Company</td><td style="padding: 8px 0;">${escapeHtml(entry.company)}</td></tr>` : ''}
    <tr><td style="padding: 8px 0; color: #666;">Position</td><td style="padding: 8px 0;">#${entry.position}</td></tr>
  </table>
</div>`.trim();

	await client.emails.send({
		from,
		to: recipients,
		subject,
		text: textBody,
		html: htmlBody,
	});
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
