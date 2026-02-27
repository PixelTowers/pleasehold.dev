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
	const fromAddress = context?.emailOptions?.fromAddress ?? DEFAULT_EMAIL_FROM;
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
			htmlBody = `${renderedBody}<div style="text-align: center; margin: 32px 0;">
    <span style="background-color: ${escapeHtml(brandColor)}; color: #fff; padding: 12px 32px; border-radius: 6px; font-weight: bold; display: inline-block;">
      ${buttonText}
    </span>
  </div>`;
		} else {
			htmlBody = renderedBody;
		}
	} else {
		subject = `You're on the ${payload.projectName} waitlist!`;
		const displayName = payload.name ? escapeHtml(payload.name) : 'there';
		htmlBody = `<h2 style="color: #1a1a2e; margin: 0 0 16px;">You're in!</h2>
  <p>Hey ${displayName}, you've been added to the <strong>${escapeHtml(payload.projectName)}</strong> waitlist.</p>
  <p>Your position is <strong>#${payload.position}</strong>. We'll keep you posted on updates.</p>
  <p style="color: #666; font-size: 14px;">Thanks for your interest — stay tuned!</p>`;
	}

	const wrappedHtml = wrapInLayout(htmlBody, context?.branding);

	const textBody = [
		`You're on the ${payload.projectName} waitlist!`,
		'',
		`Your position is #${payload.position}.`,
		'',
		"We'll keep you posted on updates. Thanks for your interest!",
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
