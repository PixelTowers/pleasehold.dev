// ABOUTME: Email notification sender that delivers formatted entry alerts to configured recipients via Nodemailer.
// ABOUTME: Sends both HTML and plain text versions with entry details (email, name, position, project).

import type { EntryPayload } from '../types';
import { transporter } from './mailer';

const SMTP_FROM = process.env.SMTP_FROM ?? 'notifications@pleasehold.dev';

export async function sendEmailNotification(
	recipients: string[],
	entry: EntryPayload,
): Promise<void> {
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

	await transporter.sendMail({
		from: SMTP_FROM,
		to: recipients.join(', '),
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
