// ABOUTME: Zod validation schemas for all dashboard forms.
// ABOUTME: Used with react-hook-form's zodResolver for client-side form validation.

import { z } from 'zod';

export const loginSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(1, 'Password is required'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
});
export type SignupValues = z.infer<typeof signupSchema>;

export const createProjectSchema = z.object({
	name: z
		.string()
		.min(1, 'Project name is required')
		.max(100, 'Project name must be 100 characters or fewer'),
	mode: z.enum(['waitlist', 'demo-booking']),
});
export type CreateProjectValues = z.infer<typeof createProjectSchema>;

export const projectNameSchema = z.object({
	name: z
		.string()
		.min(1, 'Project name is required')
		.max(100, 'Project name must be 100 characters or fewer'),
});
export type ProjectNameValues = z.infer<typeof projectNameSchema>;

export const apiKeyLabelSchema = z.object({
	label: z.string().max(50, 'Label must be 50 characters or fewer').optional(),
});
export type ApiKeyLabelValues = z.infer<typeof apiKeyLabelSchema>;

export const emailChannelSchema = z.object({
	recipients: z
		.array(z.string().email('Each recipient must be a valid email'))
		.min(1, 'At least one recipient is required')
		.max(10, 'Maximum 10 recipients allowed'),
});
export type EmailChannelValues = z.infer<typeof emailChannelSchema>;

export const webhookChannelSchema = z.object({
	url: z.string().url('Please enter a valid URL'),
});
export type WebhookChannelValues = z.infer<typeof webhookChannelSchema>;

export const slackChannelSchema = z.object({
	webhookUrl: z.string().url('Please enter a valid Slack webhook URL'),
});
export type SlackChannelValues = z.infer<typeof slackChannelSchema>;

export const discordChannelSchema = z.object({
	webhookUrl: z.string().url('Please enter a valid Discord webhook URL'),
});
export type DiscordChannelValues = z.infer<typeof discordChannelSchema>;

export const telegramChannelSchema = z.object({
	botToken: z.string().min(1, 'Bot token is required'),
	chatId: z.string().min(1, 'Chat ID is required'),
});
export type TelegramChannelValues = z.infer<typeof telegramChannelSchema>;
