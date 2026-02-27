// ABOUTME: Projects table for the pleasehold multi-project SaaS model.
// ABOUTME: Each project is scoped to a user and configured as either waitlist or demo-booking mode.

import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { authUsers } from './auth';

// Mode is immutable after creation -- enforced at application layer (tRPC update mutation).
export const projects = pgTable(
	'projects',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => authUsers.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		mode: text('mode', { enum: ['waitlist', 'demo-booking'] }).notNull(),
		logoUrl: text('logo_url'),
		brandColor: text('brand_color').default('#5e6ad2'),
		companyName: text('company_name'),
		doubleOptIn: boolean('double_opt_in').notNull().default(false),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('projects_user_id_idx').on(table.userId)],
);
