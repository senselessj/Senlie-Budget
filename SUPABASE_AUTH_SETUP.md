# Senlie Budget — Supabase password + OTP authentication

Senlie Budget v0.4.3 uses **email + password as the default auth flow** and keeps the existing six-digit email OTP flow as an optional fallback.

## A. Password sign-in is already implemented

Senlie now uses Supabase Auth directly:

- `signUp({ email, password })` to create an account
- `signInWithPassword({ email, password })` to sign in
- the existing `signInWithOtp()` + `verifyOtp()` flow remains available behind **Use a one-time email code instead**

Passwords are handled by Supabase Auth. They are never written into Senlie's `public.users` table or any budget/transaction table.

The existing `SUPABASE_SETUP.sql` trigger works for both password and OTP signups, so **no database migration is required** for this auth change.

## B. Decide whether signup requires an email confirmation

In Supabase, go to **Authentication → Providers → Email**.

### Option 1 — Confirm Email OFF

Best for development/testing and for avoiding the built-in email rate limit during account creation.

- Creating an account returns an authenticated session immediately.
- No signup email is required.
- Users can enter Senlie immediately after creating the password.

Trade-off: the email address is not verified before the account is usable.

### Option 2 — Confirm Email ON

Better when verified ownership of the email address matters.

- Signup creates the account but does not return an active session yet.
- Supabase sends one confirmation email.
- Senlie shows a **Confirm your email** screen.
- After the confirmation link is opened, Supabase returns the user to the origin Senlie is actually running on.

Senlie explicitly sets the signup `emailRedirectTo` from `window.location.origin`, so a production signup on Vercel points back to the production site rather than hard-coded localhost.

For the current deployment, also set:

```text
Site URL
https://senliebudget-alpha.vercel.app

Redirect URLs
https://senliebudget-alpha.vercel.app/**
http://localhost:3000/**
```

## C. Keep OTP as an optional fallback

If you want the **Use a one-time email code instead** button to work:

1. Go to **Authentication → Email Templates**.
2. Open the Magic Link / OTP template.
3. Use `SUPABASE_OTP_EMAIL_TEMPLATE.html`.
4. Keep `{{ .Token }}` in the template so Senlie receives a six-digit OTP rather than depending on a magic-link-only UI.

The OTP path still has provider/rate limits, but it is no longer required for normal sign-in or normal account creation.

## D. Production email recommendation

Supabase's built-in mail service is intended mainly for testing and is rate-limited. If you keep email confirmation, OTP, or password recovery enabled in production, configure **Custom SMTP** with a provider such as Resend/Postmark/SES/Brevo and use a branded sender such as:

```text
Senlie Budget <account@senlie.tech>
```

Configure SPF/DKIM/DMARC according to the email provider.
