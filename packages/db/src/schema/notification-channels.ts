// ABOUTME: Notification channels table defining per-project delivery targets (email, slack, discord, telegram, webhook).
// ABOUTME: Each channel stores type-specific configuration in a JSONB config column with a project foreign key.

import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const notificationChannels = pgTable(
	'notification_channels',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		projectId: uuid('project_id')
			.notNull()
			.references(() => projects.id, { onDelete: 'cascade' }),
		type: text('type', { enum: ['email', 'slack', 'discord', 'telegram', 'webhook'] }).notNull(),
		enabled: boolean('enabled').notNull().default(true),
		config: jsonb('config').notNull().$type<Record<string, unknown>>(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('notification_channels_project_id_type_idx').on(table.projectId, table.type)],
);
