# Senlie Budget — Windows / npm setup

## What you need

- Node.js 20.9+ (Node 22 LTS is a good target)
- npm
- one Supabase project

No Bun. No Prisma. No database CLI.

## 1. Create the Supabase database

Open your project in Supabase → **SQL Editor** → **New query**.

Paste the full contents of `SUPABASE_SETUP.sql` and press **Run** once.

That creates the Senlie tables, indexes, Auth profile trigger, RLS rules and API grants.

If you already ran the v0.2.x `SUPABASE_SETUP.sql` successfully, the schema is compatible; the current file is safe to keep as the canonical setup for new projects.

## 2. Create `.env.local`

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_PUBLISHABLE_OR_ANON_KEY"
```

That is it. **Do not add a `DATABASE_URL`.** Senlie no longer opens a direct PostgreSQL/Prisma connection.

You can find the URL and publishable/anon key in the Supabase project API settings.

## 3. Configure email OTP

Follow `SUPABASE_AUTH_SETUP.md`.

For quick testing, Supabase's default mailer may be enough for project-team/test addresses. For actual users, configure Custom SMTP.

## 4. Run Senlie

First time:

```powershell
npm install
npm run dev
```

After that:

```powershell
npm run dev
```

Or double-click `START_SENLIE.bat`.

Open `http://localhost:3000`.

## Data flow

```text
Save expense
   ↓
Next.js Senlie API
   ↓
verified Supabase session
   ↓
Supabase Data API
   ↓
RLS checks auth.uid()
   ↓
Postgres
```

There is no delayed upload job. Saves happen immediately.

Open finance screens poll every 5 seconds to pull changes from other tabs/devices.

## Adding tables later

Create a normal SQL migration in `supabase/migrations/`, for example:

`202609010001_add_debts.sql`

Run that SQL once in Supabase SQL Editor. Keep the migration file in the repo as the schema history.

## If onboarding returns 500

Open the terminal running Next.js and read the actual error returned after the request. The old Prisma-specific `URL must start with file:` error cannot occur in v0.3.0 because Prisma is no longer a dependency.

Useful Supabase checks:

```sql
select to_regclass('public.users');
```

should return `users` / `public.users`.

```sql
select id, email, name, onboarding_complete
from public.users;
```

A verified Supabase Auth user should have the same UUID in `auth.users` and `public.users` because the setup installs an automatic profile trigger.
