# Senlie Budget v0.4.8

## Profile self-healing

- Added `public.senlie_ensure_profile()` as an authenticated, security-definer repair RPC.
- Existing Auth users are still backfilled by `SUPABASE_SETUP.sql`.
- The browser now repairs a missing `public.users` profile automatically when possible.
- Server API routes also attempt the same repair before failing.
- The RPC can only act on `auth.uid()` and cannot create or modify another user profile.
- Improved errors when the project is running an older/missing Senlie database setup.

The Auth trigger remains the primary profile creation mechanism. The repair RPC exists for older accounts or partially migrated projects.
