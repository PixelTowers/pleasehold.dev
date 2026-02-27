// ABOUTME: Template variable replacement utility for custom email templates.
// ABOUTME: Replaces {{key}} patterns with HTML-escaped values from a variables map.

export function renderTemplate(template: string, variables: Record<string, string>): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
		const value = variables[key];
		return value !== undefined ? escapeHtml(value) : `{{${key}}}`;
	});
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
