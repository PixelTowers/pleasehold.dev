// ABOUTME: Resend client factory supporting both the platform singleton and per-user BYOK clients.
// ABOUTME: Configured from RESEND_API_KEY env var; getResendClient() creates BYOK clients on demand.

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
	console.warn(`[pleasehold] Resend is not configured -- the following features will not work:
  - Email notifications (channel type: email)
  - Double opt-in verification emails

  To enable email, set these environment variables:
    RESEND_API_KEY=re_your_api_key
    EMAIL_FROM=noreply@yourdomain.com

  Set these in your .env file or docker-compose.yml environment block.`);
}

export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export function getResendClient(apiKey?: string | null): Resend {
	if (apiKey) {
		return new Resend(apiKey);
	}
	if (!resend) {
		throw new Error('Resend is not configured. Set RESEND_API_KEY environment variable.');
	}
	return resend;
}
