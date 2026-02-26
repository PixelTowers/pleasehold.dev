// ABOUTME: TypeScript types for auth session and user.
// ABOUTME: Used across the API and tRPC context for type-safe auth.

export interface AuthUser {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface AuthSession {
	id: string;
	userId: string;
	token: string;
	expiresAt: Date;
	ipAddress?: string | null;
	userAgent?: string | null;
	createdAt: Date;
	updatedAt: Date;
}
