// ABOUTME: Email templates table for per-project custom verification and confirmation emails.
// ABOUTME: Stores subject, HTML body, and button config; falls back to platform defaults when absent.

import { boolean, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const emailTemplates = pgTable(
	'email_templates',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		type: text('type', { enum: ['verification', 'confirmation'] }).notNull(),
		subject: text('subject').notNull(),
		bodyHtml: text('body_html').notNull(),
		buttonText: text('button_text'),
		buttonUrl: text('button_url'),
		enabled: boolean('enabled').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [unique('email_templates_project_type_idx').on(table.projectId, table.type)],
);
