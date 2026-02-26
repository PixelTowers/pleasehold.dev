// ABOUTME: Generic webhook notification sender with HMAC-SHA256 signature for payload verification.
// ABOUTME: Includes timestamp in signature payload and headers to prevent replay attacks.

import crypto from 'node:crypto';

export async function sendWebhookNotification(
	url: string,
	secret: string,
	payload: Record<string, unknown>,
): Promise<void> {
	const body = JSON.stringify(payload);
	const timestamp = Math.floor(Date.now() / 1000).toString();
	const signaturePayload = `${timestamp}.${body}`;
	const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-PleaseHold-Signature': signature,
			'X-PleaseHold-Timestamp': timestamp,
		},
		body,
	});

	if (!response.ok) {
		throw new Error(`Webhook delivery failed with status ${response.status}`);
	}
}
