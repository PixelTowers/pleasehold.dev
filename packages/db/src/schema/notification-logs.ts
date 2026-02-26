// ABOUTME: Notification delivery logs for auditing every send attempt per channel and entry.
// ABOUTME: Tracks status (pending/sent/failed), error messages, attempt counts, and timing.

import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { entries } from './entries';
import { notificationChannels } from './notification-channels';

export const notificationLogs = pgTable(
	'notification_logs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		channelId: uuid('channel_id')
			.notNull()
			.references(() => notificationChannels.id, { onDelete: 'cascade' }),
		entryId: uuid('entry_id')
			.notNull()
			.references(() => entries.id, { onDelete: 'cascade' }),
		status: text('status', { enum: ['pending', 'sent', 'failed'] })
			.notNull()
			.default('pending'),
		error: text('error'),
		attemptCount: integer('attempt_count').notNull().default(0),
		sentAt: timestamp('sent_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('notification_logs_channel_id_idx').on(table.channelId),
		index('notification_logs_entry_id_idx').on(table.entryId),
	],
);
