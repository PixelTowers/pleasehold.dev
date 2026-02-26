// ABOUTME: Field configuration table controlling which data fields each project collects.
// ABOUTME: Boolean toggles per project; email is always required (enforced at API layer, no toggle needed).

import { boolean, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';

// One row per project -- seed defaults are set based on mode at project creation time.
// Waitlist mode: all false (email only). Demo-booking mode: all true (full form).
export const projectFieldConfigs = pgTable('project_field_configs', {
	id: uuid('id').primaryKey().defaultRandom(),
	projectId: uuid('project_id')
		.notNull()
		.unique()
		.references(() => projects.id, { onDelete: 'cascade' }),
	collectName: boolean('collect_name').notNull().default(false),
	collectCompany: boolean('collect_company').notNull().default(false),
	collectMessage: boolean('collect_message').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
