// ABOUTME: Base email layout wrapper that adds logo, brand color header, and footer to email HTML.
// ABOUTME: Produces responsive table-based HTML compatible with major email clients.

interface LayoutOptions {
	logoUrl?: string | null;
	brandColor?: string | null;
	companyName?: string | null;
	plan?: 'free' | 'pro' | null;
}

export function wrapInLayout(bodyHtml: string, options: LayoutOptions = {}): string {
	const color = options.brandColor ?? '#5e6ad2';
	const styledBody = applyInlineStyles(bodyHtml);

	const logoHtml = options.logoUrl
		? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 520px; margin-bottom: 24px;">
<tr><td align="center">
<img src="${escapeHtml(options.logoUrl)}" alt="" style="max-height: 48px; max-width: 180px; display: block;" />
</td></tr>
</table>`
		: '';

	// Free plan always shows "Powered by pleasehold" regardless of company name.
	// Pro plan shows company name if set, otherwise falls back to "Powered by pleasehold".
	// When plan is not provided (self-hosted/no billing), treat as pro.
	const isFree = options.plan === 'free';
	const footerText =
		!isFree && options.companyName ? escapeHtml(options.companyName) : 'Powered by pleasehold';

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title></title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f4f4f5; padding: 48px 16px;">
<tr><td align="center">
${logoHtml}
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden;">
<tr><td style="height: 4px; background-color: ${escapeHtml(color)};"></td></tr>
<tr><td style="padding: 40px 40px 36px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
${styledBody}
</td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 520px;">
<tr><td style="padding: 24px 0; text-align: center;">
<p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">${footerText}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Adds email-safe inline styles to semantic HTML tags that don't already have styles.
 * This allows TipTap-generated HTML (which uses plain tags) to render beautifully in
 * email clients that strip or ignore CSS classes and style blocks.
 */
export function applyInlineStyles(html: string): string {
	return html
		.replace(
			/<p(?![^>]*style=)([^>]*)>/g,
			'<p style="font-size: 15px; color: #3f3f46; line-height: 1.6; margin: 0 0 16px;"$1>',
		)
		.replace(
			/<h1(?![^>]*style=)([^>]*)>/g,
			'<h1 style="font-size: 24px; font-weight: 700; color: #18181b; line-height: 1.3; margin: 0 0 8px;"$1>',
		)
		.replace(
			/<h2(?![^>]*style=)([^>]*)>/g,
			'<h2 style="font-size: 20px; font-weight: 600; color: #18181b; line-height: 1.3; margin: 0 0 8px;"$1>',
		)
		.replace(
			/<h3(?![^>]*style=)([^>]*)>/g,
			'<h3 style="font-size: 17px; font-weight: 600; color: #18181b; line-height: 1.4; margin: 0 0 8px;"$1>',
		)
		.replace(
			/<strong(?![^>]*style=)([^>]*)>/g,
			'<strong style="color: #18181b; font-weight: 600;"$1>',
		)
		.replace(
			/<a(?![^>]*style=)([^>]*)>/g,
			'<a style="color: #0d9488; text-decoration: underline;"$1>',
		)
		.replace(
			/<ul(?![^>]*style=)([^>]*)>/g,
			'<ul style="margin: 0 0 16px; padding-left: 24px; color: #3f3f46;"$1>',
		)
		.replace(
			/<ol(?![^>]*style=)([^>]*)>/g,
			'<ol style="margin: 0 0 16px; padding-left: 24px; color: #3f3f46;"$1>',
		)
		.replace(
			/<li(?![^>]*style=)([^>]*)>/g,
			'<li style="font-size: 15px; line-height: 1.6; margin-bottom: 4px;"$1>',
		)
		.replace(
			/<hr(?![^>]*style=)([^>]*)>/g,
			'<hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;"$1>',
		);
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
