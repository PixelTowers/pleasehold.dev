// ABOUTME: Verification email sender for the double opt-in flow, sends a confirmation link to the submitter.
// ABOUTME: Uses the shared Resend client to deliver a styled HTML email with a confirm button.

import { resend } from './mailer';

const EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@pleasehold.dev';
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export async function sendVerificationEmail(
	email: string,
	verificationToken: string,
	projectName: string,
): Promise<void> {
	const verificationUrl = `${API_URL}/verify/${verificationToken}`;

	const subject = `Confirm your submission to ${projectName}`;

	const textBody = [
		`Please confirm your submission to ${projectName}.`,
		'',
		`Click the link below to verify your email:`,
		verificationUrl,
		'',
		'If you did not submit this, you can safely ignore this email.',
	].join('\n');

	const htmlBody = `
<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a2e;">Confirm your submission</h2>
  <p>You submitted your email to <strong>${escapeHtml(projectName)}</strong>. Please click the button below to confirm.</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${escapeHtml(verificationUrl)}" style="background-color: #5865f2; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">
      Confirm Submission
    </a>
  </div>
  <p style="color: #666; font-size: 14px;">If you did not submit this, you can safely ignore this email.</p>
  <p style="color: #999; font-size: 12px;">Or copy this link: ${escapeHtml(verificationUrl)}</p>
</div>`.trim();

	await resend.emails.send({
		from: EMAIL_FROM,
		to: [email],
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
