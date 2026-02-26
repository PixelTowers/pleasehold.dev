// ABOUTME: Discord notification sender that POSTs embed messages to a configured webhook URL.
// ABOUTME: Uses native fetch with Discord embed format including blurple color and entry detail fields.

import type { EntryPayload } from '../types';

export async function sendDiscordNotification(
	webhookUrl: string,
	entry: EntryPayload,
): Promise<void> {
	const fields = [
		{ name: 'Email', value: entry.email, inline: true },
		entry.name ? { name: 'Name', value: entry.name, inline: true } : null,
		entry.company ? { name: 'Company', value: entry.company, inline: true } : null,
		{ name: 'Position', value: `#${entry.position}`, inline: true },
	].filter(Boolean);

	const payload = {
		content: `New entry on ${entry.projectName}: ${entry.email}`,
		embeds: [
			{
				title: 'New Entry',
				color: 0x5865f2,
				fields,
			},
		],
	};

	const response = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(`Discord webhook failed with status ${response.status}`);
	}
}
