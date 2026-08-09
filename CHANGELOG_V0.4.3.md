# Senlie Budget v0.4.3

## Authentication

- Email + password is now the default authentication method.
- Added password account creation with name, email, password, and confirmation field.
- Added `signInWithPassword()` and password-based `signUp()` through Supabase Auth.
- Password signup redirects confirmation links to the app's actual runtime origin instead of hard-coding localhost.
- Existing six-digit email OTP remains available as an optional fallback.
- Added a confirmation-email state for Supabase projects that keep **Confirm Email** enabled.
- Improved friendly auth errors for invalid credentials, unconfirmed emails, duplicate accounts, weak passwords, and rate limits.
- No schema migration is required; the existing Auth → `public.users` trigger handles password signups too.

## Branding / PWA / Android

- Removed the leftover Z.ai placeholder artwork completely.
- Rebuilt the PWA icon set from Senlie's actual in-app `SenlieSymbol`.
- Replaced `logo.svg`, 192px, 512px, maskable, Apple Touch, and favicon assets.
- Added an explicit favicon metadata entry.
- Bumped the service-worker static cache so already-loaded browsers fetch the new icon assets.
- Removed the unused `z-ai-web-dev-sdk` dependency and stale `.z-ai-config` ignore entry.

## Version

- App version: 0.4.3
