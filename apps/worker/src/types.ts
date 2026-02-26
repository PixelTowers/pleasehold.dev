// ABOUTME: Shared type definitions for the notification worker, consumed by all sender functions.
// ABOUTME: Defines the EntryPayload interface representing the data senders need to format notifications.

export interface EntryPayload {
	email: string;
	name?: string | null;
	company?: string | null;
	position: number;
	projectName: string;
}
