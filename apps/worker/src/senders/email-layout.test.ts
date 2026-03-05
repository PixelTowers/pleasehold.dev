// ABOUTME: Unit tests for the email layout wrapper and inline style application.
// ABOUTME: Verifies HTML structure, branding, logo rendering, and semantic tag styling.

import { describe, expect, it } from 'vitest';
import { applyInlineStyles, wrapInLayout } from './email-layout';

describe('wrapInLayout', () => {
	it('wraps body in responsive email-safe HTML', () => {
		const result = wrapInLayout('<p>Hello</p>');

		expect(result).toContain('<!DOCTYPE html>');
		expect(result).toContain('background-color: #f4f4f5');
		expect(result).toContain('border-radius: 12px');
		expect(result).toContain('Hello');
	});

	it('uses default brand color when none provided', () => {
		const result = wrapInLayout('<p>Test</p>');

		expect(result).toContain('#5e6ad2');
	});

	it('applies custom brand color to accent bar', () => {
		const result = wrapInLayout('<p>Test</p>', { brandColor: '#ff6600' });

		expect(result).toContain('#ff6600');
	});

	it('renders logo above the card when logoUrl provided', () => {
		const result = wrapInLayout('<p>Test</p>', {
			logoUrl: 'https://example.com/logo.png',
		});

		expect(result).toContain('logo.png');
		expect(result).toContain('max-height: 48px');
		expect(result).toContain('max-width: 180px');
	});

	it('does not render logo when logoUrl is null', () => {
		const result = wrapInLayout('<p>Test</p>', { logoUrl: null });

		expect(result).not.toContain('<img');
	});

	it('shows company name in footer when provided', () => {
		const result = wrapInLayout('<p>Test</p>', { companyName: 'Acme Corp' });

		expect(result).toContain('Acme Corp');
	});

	it('shows "Powered by pleasehold" when no company name', () => {
		const result = wrapInLayout('<p>Test</p>');

		expect(result).toContain('Powered by pleasehold');
	});

	it('escapes HTML in brand color and logo URL', () => {
		const result = wrapInLayout('<p>Test</p>', {
			brandColor: '#ff6600"><script>',
			logoUrl: 'https://evil.com/"><script>',
		});

		expect(result).not.toContain('<script>');
	});

	it('applies inline styles to body content', () => {
		const result = wrapInLayout('<p>Hello</p><h2>Title</h2>');

		expect(result).toContain('font-size: 15px');
		expect(result).toContain('font-weight: 600');
	});

	it('free plan always shows "Powered by pleasehold" even with company name', () => {
		const result = wrapInLayout('<p>Test</p>', {
			companyName: 'Acme Corp',
			plan: 'free',
		});

		expect(result).toContain('Powered by pleasehold');
		expect(result).not.toContain('Acme Corp');
	});

	it('pro plan shows company name when set', () => {
		const result = wrapInLayout('<p>Test</p>', {
			companyName: 'Acme Corp',
			plan: 'pro',
		});

		expect(result).toContain('Acme Corp');
		expect(result).not.toContain('Powered by pleasehold');
	});

	it('pro plan shows "Powered by pleasehold" when no company name', () => {
		const result = wrapInLayout('<p>Test</p>', { plan: 'pro' });

		expect(result).toContain('Powered by pleasehold');
	});

	it('no plan (self-hosted) shows company name when set', () => {
		const result = wrapInLayout('<p>Test</p>', { companyName: 'Self-Hosted Co' });

		expect(result).toContain('Self-Hosted Co');
		expect(result).not.toContain('Powered by pleasehold');
	});
});

describe('applyInlineStyles', () => {
	it('adds styles to plain <p> tags', () => {
		const result = applyInlineStyles('<p>Hello world</p>');

		expect(result).toContain('font-size: 15px');
		expect(result).toContain('color: #3f3f46');
		expect(result).toContain('line-height: 1.6');
	});

	it('adds styles to <h2> tags', () => {
		const result = applyInlineStyles('<h2>Title</h2>');

		expect(result).toContain('font-size: 20px');
		expect(result).toContain('font-weight: 600');
		expect(result).toContain('color: #18181b');
	});

	it('adds styles to <h1> tags', () => {
		const result = applyInlineStyles('<h1>Big Title</h1>');

		expect(result).toContain('font-size: 24px');
		expect(result).toContain('font-weight: 700');
	});

	it('adds styles to <strong> tags', () => {
		const result = applyInlineStyles('<strong>Bold</strong>');

		expect(result).toContain('color: #18181b');
		expect(result).toContain('font-weight: 600');
	});

	it('adds styles to <a> tags without existing styles', () => {
		const result = applyInlineStyles('<a href="https://example.com">Link</a>');

		expect(result).toContain('color: #0d9488');
		expect(result).toContain('text-decoration: underline');
		expect(result).toContain('href="https://example.com"');
	});

	it('preserves existing style attributes on tags', () => {
		const result = applyInlineStyles('<p style="color: red;">Custom styled</p><p>Auto styled</p>');

		expect(result).toContain('color: red;');
		// Second <p> should get auto styles
		expect(result).toContain('font-size: 15px');
	});

	it('does not double-style tags that already have style attributes', () => {
		const html = '<a style="color: #ff0000;" href="#">Link</a>';
		const result = applyInlineStyles(html);

		expect(result).toContain('color: #ff0000;');
		expect(result).not.toContain('color: #0d9488');
	});

	it('handles lists correctly', () => {
		const result = applyInlineStyles('<ul><li>Item 1</li><li>Item 2</li></ul>');

		expect(result).toContain('padding-left: 24px');
		expect(result).toContain('margin-bottom: 4px');
	});

	it('handles <hr> tags', () => {
		const result = applyInlineStyles('<hr>');

		expect(result).toContain('border: none');
		expect(result).toContain('border-top: 1px solid #e4e4e7');
	});

	it('handles multiple elements in sequence', () => {
		const html = '<h2>Title</h2><p>Para 1</p><p>Para 2</p>';
		const result = applyInlineStyles(html);

		// Count occurrences of p tag styles
		const pMatches = result.match(/font-size: 15px/g);
		expect(pMatches).toHaveLength(2);
	});
});
