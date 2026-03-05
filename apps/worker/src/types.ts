// ABOUTME: Shared type definitions for the notification worker, consumed by all sender functions.
// ABOUTME: Defines EntryPayload and EmailSenderOptions for BYOK email provider support.

export interface EntryPayload {
	email: string;
	name?: string | null;
	company?: string | null;
	position: number;
	projectName: string;
}

export interface EmailSenderOptions {
	resendApiKey?: string | null;
	fromAddress?: string | null;
	fromName?: string | null;
}

export interface BrandingContext {
	logoUrl?: string | null;
	brandColor?: string | null;
	companyName?: string | null;
	plan?: 'free' | 'pro' | null;
}

export interface TemplateContext {
	subject: string;
	bodyHtml: string;
	buttonText?: string | null;
}
