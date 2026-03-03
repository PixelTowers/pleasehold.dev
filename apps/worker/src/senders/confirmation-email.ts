// ABOUTME: Confirmation/welcome email sender for the waitlist flow, sent to the submitter after joining.
// ABOUTME: Supports custom templates, project branding, BYOK Resend clients, and custom from addresses.

import type { BrandingContext, EmailSenderOptions, TemplateContext } from '../types';
import { wrapInLayout } from './email-layout';
import { getResendClient } from './mailer';
import { renderTemplate } from './template-renderer';

const DEFAULT_EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@pleasehold.dev';

interface ConfirmationEmailContext {
	emailOptions?: EmailSenderOptions;
	branding?: BrandingContext;
	customTemplate?: TemplateContext | null;
}

interface ConfirmationEmailPayload {
	email: string;
	name?: string | null;
	position: number;
	projectName: string;
	companyName?: string | null;
}

export async function sendConfirmationEmail(
	payload: ConfirmationEmailPayload,
	context?: ConfirmationEmailContext,
): Promise<void> {
	const fromAddress = DEFAULT_EMAIL_FROM;
	const fromName = context?.emailOptions?.fromName;
	const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
	const client = getResendClient(context?.emailOptions?.resendApiKey);

	const variables: Record<string, string> = {
		name: payload.name ?? '',
		email: payload.email,
		position: String(payload.position),
		project_name: payload.projectName,
		company_name: context?.branding?.companyName ?? payload.companyName ?? '',
		logo_url: context?.branding?.logoUrl ?? '',
	};

	let subject: string;
	let htmlBody: string;

	if (context?.customTemplate) {
		subject = renderTemplate(context.customTemplate.subject, variables);
		const renderedBody = renderTemplate(context.customTemplate.bodyHtml, variables);

		// Only render a button if custom template specifies button text
		if (context.customTemplate.buttonText) {
			const buttonText = renderTemplate(context.customTemplate.buttonText, variables);
			const brandColor = context?.branding?.brandColor ?? '#5e6ad2';
			htmlBody = `${renderedBody}<div style="text-align: center; margin: 32px 0 8px;">
    <span style="background-color: ${escapeHtml(brandColor)}; color: #ffffff; padding: 14px 40px; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">
      ${buttonText}
    </span>
  </div>`;
		} else {
			htmlBody = renderedBody;
		}
	} else {
		subject = `You're on the ${payload.projectName} waitlist!`;
		const displayName = payload.name ? escapeHtml(payload.name) : 'there';
		htmlBody = `<h2>You're on the list!</h2>
  <p>Hey ${displayName}, thanks for joining <strong>${escapeHtml(payload.projectName)}</strong>!</p>
  <p>We'll keep you updated as things progress.</p>
  <p>Welcome aboard — we're excited to have you.</p>`;
	}

	const wrappedHtml = wrapInLayout(htmlBody, context?.branding);

	const textBody = [
		`You're on the ${payload.projectName} waitlist!`,
		'',
		"We'll keep you updated as things progress. Welcome aboard!",
	].join('\n');

	await client.emails.send({
		from,
		to: [payload.email],
		subject,
		text: textBody,
		html: wrappedHtml,
	});
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
