// ABOUTME: Drizzle ORM relation definitions for eager loading via db.query.
// ABOUTME: Defines one/many relationships between auth, projects, field configs, and API keys.

import { relations } from 'drizzle-orm';
import { accounts, apikeys, authUsers, sessions, verifications } from './auth';
import { entries } from './entries';
import { projectFieldConfigs } from './field-configs';
import { notificationChannels } from './notification-channels';
import { notificationLogs } from './notification-logs';
import { projects } from './projects';

export const authUsersRelations = relations(authUsers, ({ many }) => ({
	sessions: many(sessions),
	accounts: many(accounts),
	apikeys: many(apikeys),
	projects: many(projects),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(authUsers, {
		fields: [sessions.userId],
		references: [authUsers.id],
	}),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(authUsers, {
		fields: [accounts.userId],
		references: [authUsers.id],
	}),
}));

export const verificationsRelations = relations(verifications, () => ({}));

export const apikeysRelations = relations(apikeys, ({ one }) => ({
	user: one(authUsers, {
		fields: [apikeys.userId],
		references: [authUsers.id],
	}),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
	user: one(authUsers, {
		fields: [projects.userId],
		references: [authUsers.id],
	}),
	fieldConfig: one(projectFieldConfigs),
	entries: many(entries),
	notificationChannels: many(notificationChannels),
}));

export const entriesRelations = relations(entries, ({ one }) => ({
	project: one(projects, {
		fields: [entries.projectId],
		references: [projects.id],
	}),
}));

export const projectFieldConfigsRelations = relations(projectFieldConfigs, ({ one }) => ({
	project: one(projects, {
		fields: [projectFieldConfigs.projectId],
		references: [projects.id],
	}),
}));

export const notificationChannelsRelations = relations(notificationChannels, ({ one, many }) => ({
	project: one(projects, {
		fields: [notificationChannels.projectId],
		references: [projects.id],
	}),
	logs: many(notificationLogs),
}));

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
	channel: one(notificationChannels, {
		fields: [notificationLogs.channelId],
		references: [notificationChannels.id],
	}),
	entry: one(entries, {
		fields: [notificationLogs.entryId],
		references: [entries.id],
	}),
}));
