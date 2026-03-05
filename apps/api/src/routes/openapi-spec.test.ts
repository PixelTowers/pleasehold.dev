// ABOUTME: Unit test verifying the OpenAPI /doc endpoint returns valid JSON spec.
// ABOUTME: Catches Zod version incompatibilities that silently break API docs (e.g., v3 vs v4).

import { OpenAPIHono } from '@hono/zod-openapi';
import { describe, expect, it } from 'vitest';
import { entriesRoute } from './v1/entries';

describe('OpenAPI spec generation', () => {
	it('returns valid OpenAPI JSON from /doc', async () => {
		const app = new OpenAPIHono();

		// Mount the entries route which registers OpenAPI schemas
		app.route('/api/v1/entries', entriesRoute);

		app.doc('/doc', {
			openapi: '3.0.0',
			info: {
				title: 'pleasehold API',
				version: '1.0.0',
			},
		});

		const res = await app.request('/doc');

		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('application/json');

		const spec = await res.json();
		expect(spec).toHaveProperty('openapi', '3.0.0');
		expect(spec).toHaveProperty('info.title', 'pleasehold API');
		expect(spec).toHaveProperty('paths');

		// The entries route should produce at least one path
		const paths = Object.keys(spec.paths);
		expect(paths.length).toBeGreaterThan(0);
	});

	it('includes schema components from Zod openapi definitions', async () => {
		const app = new OpenAPIHono();
		app.route('/api/v1/entries', entriesRoute);

		app.doc('/doc', {
			openapi: '3.0.0',
			info: { title: 'test', version: '0.0.0' },
		});

		const res = await app.request('/doc');
		const spec = await res.json();

		// Schemas registered via .openapi('Name') should appear in components
		expect(spec).toHaveProperty('components.schemas');
		const schemaNames = Object.keys(spec.components.schemas);
		expect(schemaNames).toContain('EntryRequest');
		expect(schemaNames).toContain('EntryResponse');
		expect(schemaNames).toContain('ErrorResponse');
	});
});
