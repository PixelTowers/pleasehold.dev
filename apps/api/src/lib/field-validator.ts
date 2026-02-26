// ABOUTME: Dynamic Zod schema builder that creates entry validation from project field configuration.
// ABOUTME: Uses z.strictObject() to reject fields the project hasn't enabled (ENTR-02).

import { z } from 'zod';

export interface FieldConfig {
	collectName: boolean;
	collectCompany: boolean;
	collectMessage: boolean;
}

const MAX_METADATA_BYTES = 4096;

const metadataSchema = z
	.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
	.optional()
	.refine(
		(val) => !val || JSON.stringify(val).length <= MAX_METADATA_BYTES,
		{ message: `Metadata must be ${MAX_METADATA_BYTES} bytes or less when serialized` },
	);

export function buildEntrySchema(fieldConfig: FieldConfig) {
	const shape: Record<string, z.ZodTypeAny> = {
		email: z.string().email().max(254),
	};

	if (fieldConfig.collectName) {
		shape.name = z.string().min(1).max(200).optional();
	}
	if (fieldConfig.collectCompany) {
		shape.company = z.string().min(1).max(200).optional();
	}
	if (fieldConfig.collectMessage) {
		shape.message = z.string().min(1).max(2000).optional();
	}

	shape.metadata = metadataSchema;

	return z.strictObject(shape);
}
