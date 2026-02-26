// ABOUTME: Hono middleware that verifies x-api-key header, resolves project with field config, and attaches to context.
// ABOUTME: Extracts projectId from API key metadata -- the key IS the project selector.

import type { createAuth } from '@pleasehold/auth';
import type { Database } from '@pleasehold/db';
import { type projectFieldConfigs, projects } from '@pleasehold/db';
import { eq } from 'drizzle-orm';
import type { Context, Next } from 'hono';

export type ApiKeyVariables = {
	project: typeof projects.$inferSelect & {
		fieldConfig: typeof projectFieldConfigs.$inferSelect;
	};
	apiKeyId: string;
	db: Database;
};

export function apiKeyAuth(auth: ReturnType<typeof createAuth>, db: Database) {
	return async (c: Context, next: Next) => {
		const apiKey = c.req.header('x-api-key');
		if (!apiKey) {
			return c.json(
				{ error: { code: 'MISSING_API_KEY', message: 'x-api-key header is required' } },
				401,
			);
		}

		const result = await auth.api.verifyApiKey({ body: { key: apiKey } });

		if (!result?.valid || !result.key?.metadata) {
			return c.json(
				{
					error: {
						code: 'INVALID_API_KEY',
						message: 'API key is invalid or revoked',
					},
				},
				401,
			);
		}

		const projectId = (result.key.metadata as Record<string, unknown>).projectId as
			| string
			| undefined;
		if (!projectId) {
			return c.json(
				{
					error: {
						code: 'INVALID_API_KEY',
						message: 'API key is invalid or revoked',
					},
				},
				401,
			);
		}

		const project = await db.query.projects.findFirst({
			where: eq(projects.id, projectId),
			with: { fieldConfig: true },
		});

		if (!project) {
			return c.json({ error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found' } }, 404);
		}

		c.set('project', project);
		c.set('apiKeyId', result.key.id);
		c.set('db', db);

		await next();
	};
}
