// ABOUTME: Verification email sender for the double opt-in flow, sends a confirmation link to the submitter.
// ABOUTME: Supports custom templates, project branding, BYOK Resend clients, and custom from addresses.

import type { BrandingContext, EmailSenderOptions, TemplateContext } from '../types';
import { wrapInLayout } from './email-layout';
import { getResendClient } from './mailer';
import { renderTemplate } from './template-renderer';

const DEFAULT_EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@pleasehold.dev';
const API_URL = process.env.API_URL ?? 'http://localhost:3001';

interface VerificationEmailContext {
	emailOptions?: EmailSenderOptions;
	branding?: BrandingContext;
	customTemplate?: TemplateContext | null;
}

export async function sendVerificationEmail(
	email: string,
	verificationToken: string,
	projectName: string,
	context?: VerificationEmailContext,
): Promise<void> {
	const verificationUrl = `${API_URL}/verify/${verificationToken}`;
	const fromAddress = context?.emailOptions?.fromAddress ?? DEFAULT_EMAIL_FROM;
	const fromName = context?.emailOptions?.fromName;
	const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
	const client = getResendClient(context?.emailOptions?.resendApiKey);

	const variables: Record<string, string> = {
		name: '',
		email,
		project_name: projectName,
		verification_url: verificationUrl,
		logo_url: context?.branding?.logoUrl ?? '',
		company_name: context?.branding?.companyName ?? '',
	};

	let subject: string;
	let htmlBody: string;

	if (context?.customTemplate) {
		subject = renderTemplate(context.customTemplate.subject, variables);
		const renderedBody = renderTemplate(context.customTemplate.bodyHtml, variables);
		const buttonText = context.customTemplate.buttonText
			? renderTemplate(context.customTemplate.buttonText, variables)
			: 'Confirm Submission';
		const buttonHtml = `<div style="text-align: center; margin: 32px 0;">
    <a href="${escapeHtml(verificationUrl)}" style="background-color: ${escapeHtml(context?.branding?.brandColor ?? '#5e6ad2')}; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">
      ${buttonText}
    </a>
  </div>`;
		htmlBody = `${renderedBody}${buttonHtml}`;
	} else {
		subject = `Confirm your submission to ${projectName}`;
		htmlBody = `<h2 style="color: #1a1a2e; margin: 0 0 16px;">Confirm your submission</h2>
  <p>You submitted your email to <strong>${escapeHtml(projectName)}</strong>. Please click the button below to confirm.</p>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${escapeHtml(verificationUrl)}" style="background-color: ${escapeHtml(context?.branding?.brandColor ?? '#5e6ad2')}; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold;">
      Confirm Submission
    </a>
  </div>
  <p style="color: #666; font-size: 14px;">If you did not submit this, you can safely ignore this email.</p>
  <p style="color: #999; font-size: 12px;">Or copy this link: ${escapeHtml(verificationUrl)}</p>`;
	}

	const wrappedHtml = wrapInLayout(htmlBody, context?.branding);

	const textBody = [
		`Please confirm your submission to ${projectName}.`,
		'',
		'Click the link below to verify your email:',
		verificationUrl,
		'',
		'If you did not submit this, you can safely ignore this email.',
	].join('\n');

	await client.emails.send({
		from,
		to: [email],
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
