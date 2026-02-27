// ABOUTME: User-level settings table for BYOK email provider configuration.
// ABOUTME: Stores per-user Resend API key, from address, and from name for custom email sending.

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authUsers } from './auth';

export const userSettings = pgTable('user_settings', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id')
		.notNull()
		.unique()
		.references(() => authUsers.id, { onDelete: 'cascade' }),
	resendApiKey: text('resend_api_key'),
	emailFromAddress: text('email_from_address'),
	emailFromName: text('email_from_name'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
