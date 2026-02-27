// ABOUTME: Merged tRPC router combining all sub-routers.
// ABOUTME: Exports the AppRouter type used by clients for end-to-end type safety.

import { apiKeyRouter } from './routers/api-key';
import { emailTemplateRouter } from './routers/email-template';
import { entryRouter } from './routers/entry';
import { notificationRouter } from './routers/notification';
import { projectRouter } from './routers/project';
import { userRouter } from './routers/user';
import { userSettingsRouter } from './routers/user-settings';
import { router } from './trpc';

export const appRouter = router({
	user: userRouter,
	userSettings: userSettingsRouter,
	project: projectRouter,
	apiKey: apiKeyRouter,
	entry: entryRouter,
	notification: notificationRouter,
	emailTemplate: emailTemplateRouter,
});

export type AppRouter = typeof appRouter;
