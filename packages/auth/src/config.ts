// ABOUTME: Better Auth configuration factory with email/password and API key plugin support.
// ABOUTME: Configures session handling, social providers (env-gated), and project-scoped API keys.

import {
	accounts,
	apikeys,
	authUsers,
	type Database,
	sessions,
	verifications,
} from '@pleasehold/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { apiKey } from 'better-auth/plugins';

export interface AuthOptions {
	/** Database instance */
	db: Database;
	/** Auth secret for signing tokens */
	secret: string;
	/** Base URL for auth callbacks (e.g. http://localhost:3000) */
	baseUrl: string;
	/** Origins allowed to make auth requests (e.g. ['http://localhost:5173']). */
	trustedOrigins?: string[];
	/** Google OAuth credentials. Both required to enable. */
	googleClientId?: string;
	googleClientSecret?: string;
	/** GitHub OAuth credentials. Both required to enable. */
	githubClientId?: string;
	githubClientSecret?: string;
	/** Hook called after a new user is created in auth_users. */
	onUserCreated?: (user: { id: string; email: string; name: string }) => Promise<void>;
}

export function createAuth(options: AuthOptions) {
	const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
	if (options.googleClientId && options.googleClientSecret) {
		socialProviders.google = {
			clientId: options.googleClientId,
			clientSecret: options.googleClientSecret,
		};
	}
	if (options.githubClientId && options.githubClientSecret) {
		socialProviders.github = {
			clientId: options.githubClientId,
			clientSecret: options.githubClientSecret,
		};
	}

	return betterAuth({
		trustedOrigins: options.trustedOrigins,
		database: drizzleAdapter(options.db, {
			provider: 'pg',
			schema: {
				user: authUsers,
				session: sessions,
				account: accounts,
				verification: verifications,
				apikey: apikeys,
			},
		}),
		secret: options.secret,
		baseURL: options.baseUrl,
		emailAndPassword: {
			enabled: true,
		},
		session: {
			expiresIn: 60 * 60 * 24 * 7, // 7 days
			updateAge: 60 * 60 * 24, // 1 day
		},
		socialProviders,
		plugins: [
			apiKey({
				defaultPrefix: 'ph_live_',
				enableMetadata: true,
			}),
		],
		databaseHooks: {
			user: {
				create: {
					after: async (user) => {
						if (options.onUserCreated) {
							await options.onUserCreated({
								id: user.id,
								email: user.email,
								name: user.name,
							});
						}
					},
				},
			},
		},
	});
}
