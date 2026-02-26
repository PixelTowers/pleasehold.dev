// ABOUTME: Shared Nodemailer transporter singleton for email-based senders (notifications and verification).
// ABOUTME: Configured from SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS env vars; logs a warning if SMTP_HOST is unset.

import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

if (!SMTP_HOST) {
	console.warn(`[pleasehold] SMTP is not configured -- the following features will not work:
  - Email notifications (channel type: email)
  - Double opt-in verification emails

  To enable email, set these environment variables:
    SMTP_HOST=your-smtp-server.com
    SMTP_PORT=587          (default: 587)
    SMTP_USER=your-username
    SMTP_PASS=your-password
    SMTP_FROM=noreply@yourdomain.com

  Set these in your .env file or docker-compose.yml environment block.`);
}

export const transporter = nodemailer.createTransport({
	host: SMTP_HOST,
	port: SMTP_PORT,
	secure: SMTP_PORT === 465,
	auth:
		SMTP_USER && SMTP_PASS
			? {
					user: SMTP_USER,
					pass: SMTP_PASS,
				}
			: undefined,
});
