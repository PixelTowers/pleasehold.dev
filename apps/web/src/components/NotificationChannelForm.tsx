// ABOUTME: Form component for configuring notification channels per type.
// ABOUTME: Renders type-specific fields (email recipients, webhook URLs, bot tokens) with validation.

import { type FormEvent, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
			<Label className="mb-2 block">Recipients</Label>
			<div className="flex flex-col gap-2">
				{recipients.map((email, index) => (
					<div key={index} className="flex items-center gap-2">
						<Input
							type="email"
							value={email}
							onChange={(e) => updateRecipient(index, e.target.value)}
							placeholder="name@example.com"
							required
							className="flex-1"
						/>
						{recipients.length > 1 && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="text-destructive"
								onClick={() => removeRecipient(index)}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						)}
					</div>
				))}
			</div>
			{recipients.length < 10 && (
				<Button type="button" variant="outline" size="sm" className="mt-2" onClick={addRecipient}>
					<Plus className="mr-1 h-3.5 w-3.5" />
					Add recipient
				</Button>
			)}
			<p className="mt-1 text-xs text-muted-foreground">Up to 10 email recipients per channel.</p>
		</div>
	);
}

function SlackFields({ webhookUrl, onChange }: { webhookUrl: string; onChange: (url: string) => void }) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor="slack-webhook">Webhook URL</Label>
			<Input
				id="slack-webhook"
				type="url"
				value={webhookUrl}
				onChange={(e) => onChange(e.target.value)}
				placeholder="https://hooks.slack.com/services/..."
				required
			/>
			<p className="text-xs text-muted-foreground">Create an Incoming Webhook in your Slack workspace settings.</p>
		</div>
	);
}

function DiscordFields({ webhookUrl, onChange }: { webhookUrl: string; onChange: (url: string) => void }) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor="discord-webhook">Webhook URL</Label>
			<Input
				id="discord-webhook"
				type="url"
				value={webhookUrl}
				onChange={(e) => onChange(e.target.value)}
				placeholder="https://discord.com/api/webhooks/..."
				required
			/>
			<p className="text-xs text-muted-foreground">Create a webhook in your Discord channel settings under Integrations.</p>
		</div>
	);
}

function TelegramFields({
	botToken, chatId, onBotTokenChange, onChatIdChange,
}: { botToken: string; chatId: string; onBotTokenChange: (val: string) => void; onChatIdChange: (val: string) => void }) {
	return (
		<div className="flex flex-col gap-4">
			<div className="space-y-1.5">
				<Label htmlFor="telegram-bot-token">Bot Token</Label>
				<Input id="telegram-bot-token" type="text" value={botToken} onChange={(e) => onBotTokenChange(e.target.value)} placeholder="123456789:ABCDefGhIjKlMnOpQrStUvWxYz" required />
				<p className="text-xs text-muted-foreground">Get a bot token from @BotFather on Telegram.</p>
			</div>
			<div className="space-y-1.5">
				<Label htmlFor="telegram-chat-id">Chat ID</Label>
				<Input id="telegram-chat-id" type="text" value={chatId} onChange={(e) => onChatIdChange(e.target.value)} placeholder="-1001234567890" required />
				<p className="text-xs text-muted-foreground">Add the bot to a group and use @userinfobot or the Telegram API to find the chat ID.</p>
			</div>
		</div>
	);
}

function WebhookFields({ url, onChange }: { url: string; onChange: (url: string) => void }) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor="webhook-url">Endpoint URL</Label>
			<Input id="webhook-url" type="url" value={url} onChange={(e) => onChange(e.target.value)} placeholder="https://your-server.com/webhook" required />
			<p className="mt-2 rounded border bg-accent px-3 py-2 text-xs text-muted">
				An HMAC signing secret will be auto-generated and displayed once after creation. Use it to verify incoming webhook payloads.
			</p>
		</div>
	);
}

export function NotificationChannelForm({ type, initialConfig, onSubmit, onCancel, isLoading }: NotificationChannelFormProps) {
	const [recipients, setRecipients] = useState<string[]>((initialConfig?.recipients as string[]) ?? ['']);
	const [webhookUrl, setWebhookUrl] = useState<string>((initialConfig?.webhookUrl as string) ?? '');
	const [url, setUrl] = useState<string>((initialConfig?.url as string) ?? '');
	const [botToken, setBotToken] = useState<string>((initialConfig?.botToken as string) ?? '');
	const [chatId, setChatId] = useState<string>((initialConfig?.chatId as string) ?? '');

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		let config: Record<string, unknown>;
		switch (type) {
			case 'email': config = { recipients: recipients.filter((r) => r.trim() !== '') }; break;
			case 'slack': config = { webhookUrl }; break;
			case 'discord': config = { webhookUrl }; break;
			case 'telegram': config = { botToken, chatId }; break;
			case 'webhook': config = { url }; break;
		}
		onSubmit(config);
	};

	return (
		<form onSubmit={handleSubmit}>
			<div className="mb-6">
				{type === 'email' && <EmailFields recipients={recipients} onChange={setRecipients} />}
				{type === 'slack' && <SlackFields webhookUrl={webhookUrl} onChange={setWebhookUrl} />}
				{type === 'discord' && <DiscordFields webhookUrl={webhookUrl} onChange={setWebhookUrl} />}
				{type === 'telegram' && <TelegramFields botToken={botToken} chatId={chatId} onBotTokenChange={setBotToken} onChatIdChange={setChatId} />}
				{type === 'webhook' && <WebhookFields url={url} onChange={setUrl} />}
			</div>
			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancel</Button>
				<Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save'}</Button>
			</div>
		</form>
	);
}
