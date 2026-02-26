// ABOUTME: Form component for configuring notification channels per type.
// ABOUTME: Renders type-specific fields (email recipients, webhook URLs, bot tokens) with validation.

import { type FormEvent, useState } from 'react';

type ChannelType = 'email' | 'slack' | 'discord' | 'telegram' | 'webhook';

interface NotificationChannelFormProps {
	type: ChannelType;
	initialConfig?: Record<string, unknown>;
	onSubmit: (config: Record<string, unknown>) => void;
	onCancel: () => void;
	isLoading: boolean;
}

function EmailFields({
	recipients,
	onChange,
}: { recipients: string[]; onChange: (recipients: string[]) => void }) {
	const addRecipient = () => {
		if (recipients.length < 10) {
			onChange([...recipients, '']);
		}
	};

	const removeRecipient = (index: number) => {
		onChange(recipients.filter((_, i) => i !== index));
	};

	const updateRecipient = (index: number, value: string) => {
		const updated = [...recipients];
		updated[index] = value;
		onChange(updated);
	};

	return (
		<div>
			<label
				style={{
					display: 'block',
					fontSize: '0.875rem',
					fontWeight: 500,
					marginBottom: '0.5rem',
				}}
			>
				Recipients
			</label>
			<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
				{recipients.map((email, index) => (
					<div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
						<input
							type="email"
							value={email}
							onChange={(e) => updateRecipient(index, e.target.value)}
							placeholder="name@example.com"
							required
							style={{
								flex: 1,
								padding: '0.5rem 0.75rem',
								border: '1px solid #d1d5db',
								borderRadius: '0.375rem',
								fontSize: '0.875rem',
								boxSizing: 'border-box',
							}}
						/>
						{recipients.length > 1 && (
							<button
								type="button"
								onClick={() => removeRecipient(index)}
								style={{
									padding: '0.5rem 0.75rem',
									border: '1px solid #d1d5db',
									borderRadius: '0.375rem',
									backgroundColor: '#fff',
									color: '#dc2626',
									fontSize: '0.875rem',
									cursor: 'pointer',
								}}
							>
								Remove
							</button>
						)}
					</div>
				))}
			</div>
			{recipients.length < 10 && (
				<button
					type="button"
					onClick={addRecipient}
					style={{
						marginTop: '0.5rem',
						padding: '0.375rem 0.75rem',
						border: '1px solid #d1d5db',
						borderRadius: '0.375rem',
						backgroundColor: '#fff',
						fontSize: '0.8125rem',
						color: '#374151',
						cursor: 'pointer',
					}}
				>
					+ Add recipient
				</button>
			)}
			<p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
				Up to 10 email recipients per channel.
			</p>
		</div>
	);
}

function SlackFields({ webhookUrl, onChange }: { webhookUrl: string; onChange: (url: string) => void }) {
	return (
		<div>
			<label
				htmlFor="slack-webhook"
				style={{
					display: 'block',
					fontSize: '0.875rem',
					fontWeight: 500,
					marginBottom: '0.25rem',
				}}
			>
				Webhook URL
			</label>
			<input
				id="slack-webhook"
				type="url"
				value={webhookUrl}
				onChange={(e) => onChange(e.target.value)}
				placeholder="https://hooks.slack.com/services/..."
				required
				style={{
					width: '100%',
					padding: '0.5rem 0.75rem',
					border: '1px solid #d1d5db',
					borderRadius: '0.375rem',
					fontSize: '0.875rem',
					boxSizing: 'border-box',
				}}
			/>
			<p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
				Create an Incoming Webhook in your Slack workspace settings.
			</p>
		</div>
	);
}

function DiscordFields({ webhookUrl, onChange }: { webhookUrl: string; onChange: (url: string) => void }) {
	return (
		<div>
			<label
				htmlFor="discord-webhook"
				style={{
					display: 'block',
					fontSize: '0.875rem',
					fontWeight: 500,
					marginBottom: '0.25rem',
				}}
			>
				Webhook URL
			</label>
			<input
				id="discord-webhook"
				type="url"
				value={webhookUrl}
				onChange={(e) => onChange(e.target.value)}
				placeholder="https://discord.com/api/webhooks/..."
				required
				style={{
					width: '100%',
					padding: '0.5rem 0.75rem',
					border: '1px solid #d1d5db',
					borderRadius: '0.375rem',
					fontSize: '0.875rem',
					boxSizing: 'border-box',
				}}
			/>
			<p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
				Create a webhook in your Discord channel settings under Integrations.
			</p>
		</div>
	);
}

function TelegramFields({
	botToken,
	chatId,
	onBotTokenChange,
	onChatIdChange,
}: {
	botToken: string;
	chatId: string;
	onBotTokenChange: (val: string) => void;
	onChatIdChange: (val: string) => void;
}) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
			<div>
				<label
					htmlFor="telegram-bot-token"
					style={{
						display: 'block',
						fontSize: '0.875rem',
						fontWeight: 500,
						marginBottom: '0.25rem',
					}}
				>
					Bot Token
				</label>
				<input
					id="telegram-bot-token"
					type="text"
					value={botToken}
					onChange={(e) => onBotTokenChange(e.target.value)}
					placeholder="123456789:ABCDefGhIjKlMnOpQrStUvWxYz"
					required
					style={{
						width: '100%',
						padding: '0.5rem 0.75rem',
						border: '1px solid #d1d5db',
						borderRadius: '0.375rem',
						fontSize: '0.875rem',
						boxSizing: 'border-box',
					}}
				/>
				<p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
					Get a bot token from @BotFather on Telegram.
				</p>
			</div>
			<div>
				<label
					htmlFor="telegram-chat-id"
					style={{
						display: 'block',
						fontSize: '0.875rem',
						fontWeight: 500,
						marginBottom: '0.25rem',
					}}
				>
					Chat ID
				</label>
				<input
					id="telegram-chat-id"
					type="text"
					value={chatId}
					onChange={(e) => onChatIdChange(e.target.value)}
					placeholder="-1001234567890"
					required
					style={{
						width: '100%',
						padding: '0.5rem 0.75rem',
						border: '1px solid #d1d5db',
						borderRadius: '0.375rem',
						fontSize: '0.875rem',
						boxSizing: 'border-box',
					}}
				/>
				<p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
					Add the bot to a group and use @userinfobot or the Telegram API to find the chat ID.
				</p>
			</div>
		</div>
	);
}

function WebhookFields({ url, onChange }: { url: string; onChange: (url: string) => void }) {
	return (
		<div>
			<label
				htmlFor="webhook-url"
				style={{
					display: 'block',
					fontSize: '0.875rem',
					fontWeight: 500,
					marginBottom: '0.25rem',
				}}
			>
				Endpoint URL
			</label>
			<input
				id="webhook-url"
				type="url"
				value={url}
				onChange={(e) => onChange(e.target.value)}
				placeholder="https://your-server.com/webhook"
				required
				style={{
					width: '100%',
					padding: '0.5rem 0.75rem',
					border: '1px solid #d1d5db',
					borderRadius: '0.375rem',
					fontSize: '0.875rem',
					boxSizing: 'border-box',
				}}
			/>
			<p
				style={{
					fontSize: '0.75rem',
					color: '#6b7280',
					marginTop: '0.5rem',
					padding: '0.5rem 0.75rem',
					backgroundColor: '#f9fafb',
					borderRadius: '0.25rem',
					border: '1px solid #e5e7eb',
				}}
			>
				An HMAC signing secret will be auto-generated and displayed once after creation. Use it to
				verify incoming webhook payloads.
			</p>
		</div>
	);
}

export function NotificationChannelForm({
	type,
	initialConfig,
	onSubmit,
	onCancel,
	isLoading,
}: NotificationChannelFormProps) {
	const [recipients, setRecipients] = useState<string[]>(
		(initialConfig?.recipients as string[]) ?? [''],
	);
	const [webhookUrl, setWebhookUrl] = useState<string>(
		(initialConfig?.webhookUrl as string) ?? '',
	);
	const [url, setUrl] = useState<string>((initialConfig?.url as string) ?? '');
	const [botToken, setBotToken] = useState<string>(
		(initialConfig?.botToken as string) ?? '',
	);
	const [chatId, setChatId] = useState<string>((initialConfig?.chatId as string) ?? '');

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();

		let config: Record<string, unknown>;
		switch (type) {
			case 'email':
				config = { recipients: recipients.filter((r) => r.trim() !== '') };
				break;
			case 'slack':
				config = { webhookUrl };
				break;
			case 'discord':
				config = { webhookUrl };
				break;
			case 'telegram':
				config = { botToken, chatId };
				break;
			case 'webhook':
				config = { url };
				break;
		}

		onSubmit(config);
	};

	return (
		<form onSubmit={handleSubmit}>
			<div style={{ marginBottom: '1.5rem' }}>
				{type === 'email' && <EmailFields recipients={recipients} onChange={setRecipients} />}
				{type === 'slack' && <SlackFields webhookUrl={webhookUrl} onChange={setWebhookUrl} />}
				{type === 'discord' && <DiscordFields webhookUrl={webhookUrl} onChange={setWebhookUrl} />}
				{type === 'telegram' && (
					<TelegramFields
						botToken={botToken}
						chatId={chatId}
						onBotTokenChange={setBotToken}
						onChatIdChange={setChatId}
					/>
				)}
				{type === 'webhook' && <WebhookFields url={url} onChange={setUrl} />}
			</div>

			<div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
				<button
					type="button"
					onClick={onCancel}
					disabled={isLoading}
					style={{
						padding: '0.5rem 1rem',
						border: '1px solid #d1d5db',
						borderRadius: '0.375rem',
						backgroundColor: '#fff',
						fontSize: '0.875rem',
						cursor: isLoading ? 'not-allowed' : 'pointer',
						color: '#374151',
					}}
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isLoading}
					style={{
						padding: '0.5rem 1rem',
						backgroundColor: isLoading ? '#d1d5db' : '#111',
						color: '#fff',
						border: 'none',
						borderRadius: '0.375rem',
						fontSize: '0.875rem',
						fontWeight: 500,
						cursor: isLoading ? 'not-allowed' : 'pointer',
					}}
				>
					{isLoading ? 'Saving...' : 'Save'}
				</button>
			</div>
		</form>
	);
}
