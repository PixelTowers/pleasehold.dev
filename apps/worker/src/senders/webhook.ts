// ABOUTME: Generic webhook notification sender with HMAC-SHA256 signature for payload verification.
// ABOUTME: Includes SSRF protection via DNS resolution and private IP blocking, plus timestamp-based replay prevention.

import crypto from 'node:crypto';
import dns from 'node:dns';
import { URL } from 'node:url';

/**
 * Check whether an IP address belongs to a private, loopback, or reserved range.
 * Blocks SSRF attempts that target internal infrastructure.
 */
function isPrivateIp(ip: string): boolean {
	// IPv4 private/reserved ranges
	if (
		ip.startsWith('10.') ||
		ip.startsWith('127.') ||
		ip.startsWith('169.254.') ||
		ip.startsWith('192.168.') ||
		ip === '0.0.0.0'
	) {
		return true;
	}

	// 172.16.0.0 - 172.31.255.255
	if (ip.startsWith('172.')) {
		const second = Number.parseInt(ip.split('.')[1], 10);
		if (second >= 16 && second <= 31) return true;
	}

	// IPv6 loopback and private
	if (
		ip === '::1' ||
		ip === '::' ||
		ip.startsWith('fc') ||
		ip.startsWith('fd') ||
		ip.startsWith('fe80')
	) {
		return true;
	}

	// IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
	if (ip.startsWith('::ffff:')) {
		const mapped = ip.slice(7);
		return isPrivateIp(mapped);
	}

	return false;
}

export async function sendWebhookNotification(
	url: string,
	secret: string,
	payload: Record<string, unknown>,
): Promise<void> {
	// SSRF protection: resolve hostname and block private/reserved IPs
	const parsedUrl = new URL(url);
	const { address } = await dns.promises.lookup(parsedUrl.hostname);
	if (isPrivateIp(address)) {
		throw new Error(
			`Webhook delivery blocked: resolved IP ${address} is in a private/reserved range`,
		);
	}

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
