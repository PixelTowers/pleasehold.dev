// ABOUTME: Shared Resend client singleton for email-based senders (notifications and verification).
// ABOUTME: Configured from RESEND_API_KEY env var; logs a warning if the key is unset.

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

export const resend = new Resend(RESEND_API_KEY);
