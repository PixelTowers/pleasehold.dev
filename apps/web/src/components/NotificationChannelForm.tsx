// ABOUTME: Form component for configuring notification channels per type.
// ABOUTME: Renders type-specific fields (email recipients, webhook URLs, bot tokens) with Zod validation.

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
	discordChannelSchema,
	emailChannelSchema,
	slackChannelSchema,
	telegramChannelSchema,
	webhookChannelSchema,
} from '@/lib/schemas';

type ChannelType = 'email' | 'slack' | 'discord' | 'telegram' | 'webhook';

interface NotificationChannelFormProps {
	type: ChannelType;
	initialConfig?: Record<string, unknown>;
	onSubmit: (config: Record<string, unknown>) => void;
	onCancel: () => void;
	isLoading: boolean;
}

const schemaMap = {
	email: emailChannelSchema,
	slack: slackChannelSchema,
	discord: discordChannelSchema,
	telegram: telegramChannelSchema,
	webhook: webhookChannelSchema,
} as const;

function defaultValuesForType(type: ChannelType, initialConfig?: Record<string, unknown>) {
	switch (type) {
		case 'email':
			return { recipients: (initialConfig?.recipients as string[]) ?? [''] };
		case 'slack':
			return { webhookUrl: (initialConfig?.webhookUrl as string) ?? '' };
		case 'discord':
			return { webhookUrl: (initialConfig?.webhookUrl as string) ?? '' };
		case 'telegram':
			return {
				botToken: (initialConfig?.botToken as string) ?? '',
				chatId: (initialConfig?.chatId as string) ?? '',
			};
		case 'webhook':
			return { url: (initialConfig?.url as string) ?? '' };
	}
}

function EmailFields({
	form,
}: {
	form: ReturnType<typeof useForm<z.infer<typeof emailChannelSchema>>>;
}) {
	const recipients = form.watch('recipients');

	const addRecipient = () => {
		if (recipients.length < 10) {
			form.setValue('recipients', [...recipients, '']);
		}
	};

	const removeRecipient = (index: number) => {
		const updated = recipients.filter((_: string, i: number) => i !== index);
		form.setValue('recipients', updated);
	};

	return (
		<div>
			<FormLabel className="mb-2 block">Recipients</FormLabel>
			<div className="flex flex-col gap-2">
				{recipients.map((_: string, index: number) => (
					<div key={`recipient-${index.toString()}`} className="flex items-center gap-2">
						<FormField
							control={form.control}
							name={`recipients.${index}`}
							render={({ field }) => (
								<FormItem className="flex-1">
									<FormControl>
										<Input type="email" placeholder="name@example.com" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
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

function SlackFields({
	form,
}: {
	form: ReturnType<typeof useForm<z.infer<typeof slackChannelSchema>>>;
}) {
	return (
		<FormField
			control={form.control}
			name="webhookUrl"
			render={({ field }) => (
				<FormItem>
					<FormLabel>Webhook URL</FormLabel>
					<FormControl>
						<Input type="url" placeholder="https://hooks.slack.com/services/..." {...field} />
					</FormControl>
					<FormMessage />
					<p className="text-xs text-muted-foreground">
						Create an Incoming Webhook in your Slack workspace settings.
					</p>
				</FormItem>
			)}
		/>
	);
}

function DiscordFields({
	form,
}: {
	form: ReturnType<typeof useForm<z.infer<typeof discordChannelSchema>>>;
}) {
	return (
		<FormField
			control={form.control}
			name="webhookUrl"
			render={({ field }) => (
				<FormItem>
					<FormLabel>Webhook URL</FormLabel>
					<FormControl>
						<Input type="url" placeholder="https://discord.com/api/webhooks/..." {...field} />
					</FormControl>
					<FormMessage />
					<p className="text-xs text-muted-foreground">
						Create a webhook in your Discord channel settings under Integrations.
					</p>
				</FormItem>
			)}
		/>
	);
}

function TelegramFields({
	form,
}: {
	form: ReturnType<typeof useForm<z.infer<typeof telegramChannelSchema>>>;
}) {
	return (
		<div className="flex flex-col gap-4">
			<FormField
				control={form.control}
				name="botToken"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Bot Token</FormLabel>
						<FormControl>
							<Input type="text" placeholder="123456789:ABCDefGhIjKlMnOpQrStUvWxYz" {...field} />
						</FormControl>
						<FormMessage />
						<p className="text-xs text-muted-foreground">
							Get a bot token from @BotFather on Telegram.
						</p>
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="chatId"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Chat ID</FormLabel>
						<FormControl>
							<Input type="text" placeholder="-1001234567890" {...field} />
						</FormControl>
						<FormMessage />
						<p className="text-xs text-muted-foreground">
							Add the bot to a group and use @userinfobot or the Telegram API to find the chat ID.
						</p>
					</FormItem>
				)}
			/>
		</div>
	);
}

function WebhookFields({
	form,
}: {
	form: ReturnType<typeof useForm<z.infer<typeof webhookChannelSchema>>>;
}) {
	return (
		<FormField
			control={form.control}
			name="url"
			render={({ field }) => (
				<FormItem>
					<FormLabel>Endpoint URL</FormLabel>
					<FormControl>
						<Input type="url" placeholder="https://your-server.com/webhook" {...field} />
					</FormControl>
					<FormMessage />
					<p className="mt-2 rounded border bg-accent px-3 py-2 text-xs text-muted">
						An HMAC signing secret will be auto-generated and displayed once after creation. Use it
						to verify incoming webhook payloads.
					</p>
				</FormItem>
			)}
		/>
	);
}

export function NotificationChannelForm({
	type,
	initialConfig,
	onSubmit,
	onCancel,
	isLoading,
}: NotificationChannelFormProps) {
	// biome-ignore lint/suspicious/noExplicitAny: channel type varies at runtime
	const form = useForm<any>({
		resolver: zodResolver(schemaMap[type]),
		defaultValues: defaultValuesForType(type, initialConfig),
	});

	const handleSubmit = (values: Record<string, unknown>) => {
		if (type === 'email') {
			// Filter out empty recipient strings before submitting
			const recipients = (values.recipients as string[]).filter((r) => r.trim() !== '');
			onSubmit({ recipients });
		} else {
			onSubmit(values);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)}>
				<div className="mb-6">
					{type === 'email' && <EmailFields form={form} />}
					{type === 'slack' && <SlackFields form={form} />}
					{type === 'discord' && <DiscordFields form={form} />}
					{type === 'telegram' && <TelegramFields form={form} />}
					{type === 'webhook' && <WebhookFields form={form} />}
				</div>
				<div className="flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
						Cancel
					</Button>
					<Button type="submit" disabled={isLoading}>
						{isLoading ? 'Saving...' : 'Save'}
					</Button>
				</div>
			</form>
		</Form>
	);
}
