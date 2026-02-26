// ABOUTME: Merged tRPC router combining all sub-routers.
// ABOUTME: Exports the AppRouter type used by clients for end-to-end type safety.

import { apiKeyRouter } from './routers/api-key';
import { entryRouter } from './routers/entry';
import { notificationRouter } from './routers/notification';
import { projectRouter } from './routers/project';
import { userRouter } from './routers/user';
import { router } from './trpc';

export const appRouter = router({
	user: userRouter,
	project: projectRouter,
	apiKey: apiKeyRouter,
	entry: entryRouter,
	notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
