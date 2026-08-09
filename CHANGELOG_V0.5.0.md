# Senlie Budget v0.5.0 — Language that actually sticks

## Fixed
- Language selection now switches the UI immediately between English and Spanish.
- The selected language is persisted locally and synced to the authenticated Senlie profile in Supabase after onboarding.
- On a new device/sign-in, the account language is restored from the profile.
- Changing language triggers a data refresh so server-generated Home/Activity/Insights text changes too.
- `<html lang>` follows the selected language for accessibility and platform behavior.
- Dates, month names, timeline labels, relative activity times, PWA install copy, settings, onboarding, and transaction UI use the selected locale.
- Default Senlie system category names are localized for display while user-created category names are left untouched.
- Language confirmation/error toasts now appear in the language the user just selected.

## Database
No new migration is required when upgrading from the current v0.4.9 setup: `public.users.language` already exists in `SUPABASE_SETUP.sql`.
