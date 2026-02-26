// ABOUTME: Telegram notification sender that POSTs to the Bot API sendMessage endpoint.
// ABOUTME: Sends Markdown-formatted entry details using a configured bot token and chat ID.

import type { EntryPayload } from '../types';

export async function sendTelegramNotification(
	botToken: string,
	chatId: string,
	entry: EntryPayload,
): Promise<void> {
	const lines = [
		`*New entry on ${escapeMd(entry.projectName)}*`,
		'',
		`Email: ${escapeMd(entry.email)}`,
		entry.name ? `Name: ${escapeMd(entry.name)}` : null,
		entry.company ? `Company: ${escapeMd(entry.company)}` : null,
		`Position: #${entry.position}`,
	]
		.filter(Boolean)
		.join('\n');

	const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			chat_id: chatId,
			text: lines,
			parse_mode: 'Markdown',
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`Telegram API failed with status ${response.status}: ${body}`);
	}
}

function escapeMd(str: string): string {
	return str.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
