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

function buildButtonHtml(text: string, url: string, brandColor: string): string {
	return `<div style="text-align: center; margin: 32px 0 8px;">
    <a href="${escapeHtml(url)}" style="background-color: ${escapeHtml(brandColor)}; color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
      ${text}
    </a>
  </div>`;
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
	const brandColor = context?.branding?.brandColor ?? '#5e6ad2';

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
			: 'Verify Email Address';
		htmlBody = `${renderedBody}${buildButtonHtml(buttonText, verificationUrl, brandColor)}`;
	} else {
		subject = `Confirm your email for ${projectName}`;
		htmlBody = `<h2>Confirm your email</h2>
  <p>Thanks for signing up for <strong>${escapeHtml(projectName)}</strong>. To complete your submission, please verify your email address by clicking the button below.</p>
  ${buildButtonHtml('Verify Email Address', verificationUrl, brandColor)}
  <p style="font-size: 13px; color: #a1a1aa; margin: 24px 0 0; line-height: 1.5;">This link will expire in 48 hours. If you didn't request this, you can safely ignore this email.</p>
  <p style="font-size: 12px; color: #a1a1aa; margin: 8px 0 0; word-break: break-all;">Or copy this link: ${escapeHtml(verificationUrl)}</p>`;
	}

	const wrappedHtml = wrapInLayout(htmlBody, context?.branding);

	const textBody = [
		`Please confirm your email for ${projectName}.`,
		'',
		'Click the link below to verify your email:',
		verificationUrl,
		'',
		'This link will expire in 48 hours.',
		'If you did not request this, you can safely ignore this email.',
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
