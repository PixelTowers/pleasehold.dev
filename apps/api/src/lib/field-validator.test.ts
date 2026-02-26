// ABOUTME: Unit tests for the dynamic field validator that builds Zod schemas from project field config.
// ABOUTME: Covers email-only, full config, partial config, metadata handling, and edge cases.

import { describe, expect, it } from 'vitest';
import { buildEntrySchema } from './field-validator';

describe('buildEntrySchema', () => {
	describe('email-only config (all collect* = false)', () => {
		const schema = buildEntrySchema({
			collectName: false,
			collectCompany: false,
			collectMessage: false,
		});

		it('accepts a valid email-only payload', () => {
			const result = schema.safeParse({ email: 'test@example.com' });
			expect(result.success).toBe(true);
		});

		it('rejects missing email', () => {
			const result = schema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('rejects invalid email format', () => {
			const result = schema.safeParse({ email: 'not-an-email' });
			expect(result.success).toBe(false);
		});

		it('rejects unexpected field "name" via strictObject', () => {
			const result = schema.safeParse({ email: 'test@example.com', name: 'Jane' });
			expect(result.success).toBe(false);
		});
	});

	describe('full config (all collect* = true)', () => {
		const schema = buildEntrySchema({
			collectName: true,
			collectCompany: true,
			collectMessage: true,
		});

		it('accepts full payload with all optional fields provided', () => {
			const result = schema.safeParse({
				email: 'test@example.com',
				name: 'Jane',
				company: 'Acme',
				message: 'Hello',
			});
			expect(result.success).toBe(true);
		});

		it('accepts email-only when optional fields are omitted', () => {
			const result = schema.safeParse({ email: 'test@example.com' });
			expect(result.success).toBe(true);
		});

		it('rejects unexpected field "phone" via strictObject', () => {
			const result = schema.safeParse({
				email: 'test@example.com',
				phone: '555-1234',
			});
			expect(result.success).toBe(false);
		});
	});

	describe('partial config (only collectName = true)', () => {
		const schema = buildEntrySchema({
			collectName: true,
			collectCompany: false,
			collectMessage: false,
		});

		it('accepts email with name', () => {
			const result = schema.safeParse({ email: 'test@example.com', name: 'Jane' });
			expect(result.success).toBe(true);
		});

		it('rejects company when not enabled', () => {
			const result = schema.safeParse({
				email: 'test@example.com',
				name: 'Jane',
				company: 'Acme',
			});
			expect(result.success).toBe(false);
		});

		it('rejects message when not enabled', () => {
			const result = schema.safeParse({
				email: 'test@example.com',
				message: 'Hello',
			});
			expect(result.success).toBe(false);
		});
	});

	describe('metadata handling', () => {
		const schema = buildEntrySchema({
			collectName: false,
			collectCompany: false,
			collectMessage: false,
		});

		it('accepts flat key-value metadata', () => {
			const result = schema.safeParse({
				email: 'test@example.com',
				metadata: { utm_source: 'google', referral: 'friend' },
			});
			expect(result.success).toBe(true);
		});

		it('accepts metadata with primitive values (string, number, boolean, null)', () => {
			const result = schema.safeParse({
				email: 'test@example.com',
				metadata: { source: 'web', count: 42, active: true, extra: null },
			});
			expect(result.success).toBe(true);
		});

		it('rejects metadata with nested objects', () => {
			const result = schema.safeParse({
				email: 'test@example.com',
				metadata: { nested: { deep: true } },
			});
			expect(result.success).toBe(false);
		});

		it('rejects metadata exceeding 4KB when serialized', () => {
			// Create a metadata object that exceeds 4096 bytes when serialized
			const largeValue = 'x'.repeat(4097);
			const result = schema.safeParse({
				email: 'test@example.com',
				metadata: { big: largeValue },
			});
			expect(result.success).toBe(false);
		});
	});

	describe('edge cases', () => {
		const fullSchema = buildEntrySchema({
			collectName: true,
			collectCompany: true,
			collectMessage: true,
		});

		it('rejects email longer than 254 characters', () => {
			const longEmail = `${'a'.repeat(243)}@example.com`; // 255 chars
			const result = fullSchema.safeParse({ email: longEmail });
			expect(result.success).toBe(false);
		});

		it('accepts email at exactly 254 characters', () => {
			const maxEmail = `${'a'.repeat(242)}@example.com`; // 254 chars
			const result = fullSchema.safeParse({ email: maxEmail });
			expect(result.success).toBe(true);
		});

		it('rejects name longer than 200 characters', () => {
			const result = fullSchema.safeParse({
				email: 'test@example.com',
				name: 'a'.repeat(201),
			});
			expect(result.success).toBe(false);
		});

		it('rejects company longer than 200 characters', () => {
			const result = fullSchema.safeParse({
				email: 'test@example.com',
				company: 'a'.repeat(201),
			});
			expect(result.success).toBe(false);
		});

		it('rejects message longer than 2000 characters', () => {
			const result = fullSchema.safeParse({
				email: 'test@example.com',
				message: 'a'.repeat(2001),
			});
			expect(result.success).toBe(false);
		});
	});
});
