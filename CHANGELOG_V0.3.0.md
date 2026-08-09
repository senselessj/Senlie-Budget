# Senlie Budget v0.3.0

## Supabase-native runtime + branded email OTP

This release removes Prisma and the local SQLite runtime path from Senlie Budget.

### Authentication
- Replaced password signup/sign-in with six-digit Supabase email OTP.
- Added a premium two-step email/code sign-in UI.
- Added a branded `Senlie Budget` HTML email template.
- Added a verified HttpOnly session bridge for same-origin Next.js API routes.
- Supabase Auth remains the identity authority; `public.users` remains the app profile table.
- Existing Supabase users can sign in with OTP using the same email account.

### Data runtime
- Removed Prisma runtime and `DATABASE_URL` completely.
- Existing finance/API code now executes through the authenticated Supabase Data API.
- Supabase Row Level Security remains the final authorization boundary.
- Writes happen immediately; React Query refetches open data every 5 seconds and on window focus.

### Onboarding
- Terms acceptance is persisted before the wizard advances.
- Users who already accepted the Terms resume after that step if onboarding previously failed.
- Onboarding writes accounts, categories, recurring income rules, and the initial budget to Supabase.

### Setup
- Run `SUPABASE_SETUP.sql` once for a new Supabase project.
- Existing v0.2.x databases created with that same setup are compatible; no schema reset is required.
- `.env.local` only needs the Supabase project URL and public anon/publishable key.
- `START_SENLIE.bat` handles the normal Windows development launch.

### Removed
- `prisma/`
- Prisma dependencies and scripts
- `/api/auth/signin`
- `/api/auth/signup`
- Password auth UI
- Database push/generate commands from startup
