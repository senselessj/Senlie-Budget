# Senlie Budget — Supabase OTP + branded email setup

The app code is already configured for six-digit email OTP authentication.

## A. Make Supabase send a code instead of a magic link

In your hosted Supabase project:

1. Go to **Authentication → Email Templates**.
2. Open the **Magic Link / OTP** authentication template.
3. Set the subject to something like:

   `Your Senlie Budget code`

4. Replace the HTML with the contents of `SUPABASE_OTP_EMAIL_TEMPLATE.html`.
5. Save.

The important part is `{{ .Token }}`. Supabase sees that token variable and sends the one-time password code used by Senlie's verification screen.

## B. Brand the sender as Senlie Budget

For production, configure **Authentication → SMTP Settings / Custom SMTP** (the exact dashboard navigation can shift slightly over time).

Use your SMTP provider credentials and set the sender/display name to:

`Senlie Budget`

Recommended sender address once you own/configure the domain:

`no-reply@auth.senlie.tech`

or

`account@senlie.tech`

A production SMTP provider can be Resend, Postmark, AWS SES, SendGrid, Brevo, or another SMTP-compatible provider.

Configure SPF/DKIM/DMARC for your sending domain according to your email provider so authentication mail is less likely to land in spam.

## C. OTP settings

Supabase email OTP is passwordless. Senlie calls:

- `signInWithOtp()` to request the email
- `verifyOtp(..., type: 'email')` to create the session

New email addresses are allowed to create an account automatically.

The app implements a 60-second resend UI timer to match the normal Supabase OTP request cadence.

## D. What the user sees

```text
Senlie Budget
Your money, clearly.

Email
you@example.com

[ Continue with email ]

        ↓

Check your email
We sent a 6-digit Senlie code to yo••••@example.com

[ 4 ][ 8 ][ 2 ][ 1 ][ 9 ][ 7 ]

[ Verify & continue ]
```

No password creation, confirmation-link screen, or password-reset flow is needed for normal sign-in.
