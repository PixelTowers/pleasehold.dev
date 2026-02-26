// ABOUTME: Entries table for the public entry submission API (waitlist signups, demo-booking requests).
// ABOUTME: Each entry is scoped to a project with deduplication on (project_id, email) and atomic queue positioning.

import { index, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const entries = pgTable(
	'entries',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		email: text('email').notNull(),
		name: text('name'),
		company: text('company'),
		message: text('message'),
		metadata: jsonb('metadata').$type<Record<string, unknown>>(),
		position: integer('position').notNull(),
		status: text('status', {
			enum: ['new', 'contacted', 'converted', 'archived', 'pending_verification'],
		})
			.notNull()
			.default('new'),
		verificationToken: text('verification_token'),
		verifiedAt: timestamp('verified_at', { withTimezone: true }),
		verificationExpiresAt: timestamp('verification_expires_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		unique('entries_project_email_unique').on(table.projectId, table.email),
		index('entries_project_id_idx').on(table.projectId),
		index('entries_project_id_position_idx').on(table.projectId, table.position),
		index('entries_project_id_created_at_idx').on(table.projectId, table.createdAt),
		index('entries_verification_token_idx').on(table.verificationToken),
	],
);
