// ABOUTME: Barrel export for the @pleasehold/auth package (server-side).
// ABOUTME: Re-exports auth configuration, middleware, and types.

export type { AuthOptions } from './config';
export { createAuth } from './config';
export { authMiddleware } from './middleware';
export type { AuthSession, AuthUser } from './types';
export { verifyProjectKey } from './verify-project-key';
