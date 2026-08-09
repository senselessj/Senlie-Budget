# Senlie Budget

Personal budgeting and expense management by **Senlie Technologies**.

## v0.4.3 — Supabase-native + Password Auth + PWA/Android

This build removes Prisma from Senlie Budget's runtime completely.

There is no SQLite database, Prisma client, `DATABASE_URL`, `prisma generate`, `db push`, or local→cloud migration flow.

Runtime architecture:

```text
Senlie Budget
   ├─ Supabase Auth (email + password, optional OTP)
   ├─ HttpOnly verified app session cookie
   ├─ Next.js API financial engine
   └─ Supabase Data API + RLS
            ↓
        Postgres
```

### Setup

1. Create a Supabase project.
2. Open **SQL Editor** and run `SUPABASE_SETUP.sql` once.
3. Copy `.env.example` to `.env.local` and add only your project URL and publishable/anon key.
4. Configure password/email behavior in Supabase using `SUPABASE_AUTH_SETUP.md`. OTP is now optional.
5. Run `npm install` once, then `npm run dev` — or double-click `START_SENLIE.bat` on Windows.

That is the entire application setup.

### Sync behavior

Writes are sent to Supabase immediately. React Query refreshes open finance views every five seconds and when the window regains focus, so changes made from another tab/device are picked up automatically.

### Authentication

Email + password is now the default. Users can create an account or sign in without requesting an OTP. The six-digit email OTP flow is still available as an optional fallback. If Supabase **Confirm Email** is disabled, password signup authenticates immediately; if it is enabled, Senlie waits for the one confirmation email.

For production email delivery, configure Custom SMTP in Supabase and use a sender such as:

`Senlie Budget <no-reply@auth.senlie.tech>`

See `SUPABASE_AUTH_SETUP.md`.


## Deploying to Vercel

See `VERCEL_DEPLOY.md`. This build uses Vercel's native Next.js deployment and requires no custom output directory or standalone server.

## PWA / Android

Senlie Budget v0.4.0 is installable as a Progressive Web App on Android. Deploy it over HTTPS, open it in Chrome, and choose **Install app** / **Add to Home screen**. An install action also appears under **Settings → App** when the browser exposes the native install prompt.

For an Android APK/AAB, use the included Trusted Web Activity workflow after the production URL is live. See `ANDROID_PWA_GUIDE.md` or double-click `BUILD_ANDROID_APK.bat` on Windows.
