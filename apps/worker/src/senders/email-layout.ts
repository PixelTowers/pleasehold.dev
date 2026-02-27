// ABOUTME: Base email layout wrapper that adds logo, brand color header, and footer to email HTML.
// ABOUTME: Produces responsive table-based HTML compatible with major email clients.

interface LayoutOptions {
	logoUrl?: string | null;
	brandColor?: string | null;
	companyName?: string | null;
}

export function wrapInLayout(bodyHtml: string, options: LayoutOptions = {}): string {
	const color = options.brandColor ?? '#5e6ad2';
	const logoHtml = options.logoUrl
		? `<tr><td style="padding: 20px 24px 0;"><img src="${escapeHtml(options.logoUrl)}" alt="" style="max-height: 40px; max-width: 160px;" /></td></tr>`
		: '';
	const footerText = options.companyName
		? escapeHtml(options.companyName)
		: 'Powered by pleasehold';

	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 32px 0;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
<tr><td style="height: 4px; background-color: ${escapeHtml(color)};"></td></tr>
${logoHtml}
<tr><td style="padding: 24px;">${bodyHtml}</td></tr>
<tr><td style="padding: 16px 24px; border-top: 1px solid #eee; text-align: center;">
<p style="margin: 0; font-size: 11px; color: #999;">${footerText}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
