# Linear-Style Visual Redesign — Phase 7 Planning

## Branch: `feat/linear-redesign`
## Phases 1-6: COMPLETE (all committed)

### Next: Phase 7 — Sonner Toasts + React Hook Form + Zod Validation

Chris requested adding:
1. **Sonner** — wire up toast notifications (already installed as shadcn dep, needs `<Toaster />` in root + replace manual status indicators with toast())
2. **TanStack Query** — already present via tRPC's React Query wrapper, may need standalone usage
3. **React Hook Form** — replace all manual useState form handling with useForm()
4. **Zod** — schema validation for all form inputs, integrated with React Hook Form via @hookform/resolvers

### What needs to happen:
- Install: `react-hook-form`, `zod`, `@hookform/resolvers` in apps/web
- Add `<Toaster />` from sonner to `__root.tsx` or `main.tsx`
- Create Zod schemas for each form (login, signup, create project, new project, settings name, API key create, notification channel forms)
- Refactor each form to use `useForm()` + `zodResolver()` instead of manual useState
- Replace manual save status indicators (saving/saved/error spans) with toast() calls where appropriate
- Keep all existing business logic (tRPC mutations, auth calls) unchanged

### Files to modify:
- `src/routes/__root.tsx` or `src/main.tsx` — add `<Toaster />`
- `src/routes/login.tsx` — useForm + zod schema
- `src/routes/signup.tsx` — useForm + zod schema
- `src/components/CreateProjectFlow.tsx` — useForm per step + zod
- `src/routes/projects/new.tsx` — useForm + zod
- `src/routes/projects/$projectId/settings.tsx` — useForm + toast for save status
- `src/components/ApiKeyCreateDialog.tsx` — useForm + zod
- `src/components/FieldConfigForm.tsx` — toast for save/error status
- `src/components/NotificationChannelForm.tsx` — useForm + zod per channel type
- `src/routes/projects/$projectId/notifications.tsx` — toast for toggle status

### Previous commits (Phases 1-6):
1. `50bd318` - Phase 1: Tooling setup
2. `fb1ccbb` - Phase 2: Sidebar + layout
3. `4ceab08` - Phase 3: Auth pages
4. `223e94b` - Phase 4: Dashboard + project pages
5. `be30f98` - Phase 5: Entries table + detail
6. `ffbd69d` - Phase 6: Settings, keys, notifications
