// ABOUTME: Slack notification sender that POSTs Block Kit messages to a configured webhook URL.
// ABOUTME: Uses native fetch (no SDK) with mrkdwn-formatted section blocks and a plain text fallback.

import type { EntryPayload } from '../types';

export async function sendSlackNotification(
	webhookUrl: string,
	entry: EntryPayload,
): Promise<void> {
	const lines = [
		`*New entry on ${entry.projectName}*`,
		`Email: ${entry.email}`,
		entry.name ? `Name: ${entry.name}` : null,
		entry.company ? `Company: ${entry.company}` : null,
		`Position: #${entry.position}`,
	]
		.filter(Boolean)
		.join('\n');

	const payload = {
		text: `New entry on ${entry.projectName}: ${entry.email}`,
		blocks: [
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: lines,
				},
			},
		],
	};

	const response = await fetch(webhookUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		throw new Error(`Slack webhook failed with status ${response.status}`);
	}
}
