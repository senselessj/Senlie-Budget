# Senlie Budget v0.4.4

- Clarifies that passwords are managed by Supabase Auth, not `public.users`.
- Adds Settings → Account → Set or change password.
- Existing OTP/passwordless users can sign in with a code once, then attach a password with `supabase.auth.updateUser({ password })`.
- Improves invalid-password and already-registered messages for older OTP-created accounts.
- No SQL migration is required.
