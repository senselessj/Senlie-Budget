# Senlie Budget v0.3.1

## Configuration hotfix

- Removed the bundled `.env` file that contained placeholder Supabase credentials.
- `.env.example` now contains blank values instead of a fake hostname.
- Added strict runtime validation so placeholder URLs/keys cannot create fake network requests.
- Added support for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` while retaining `NEXT_PUBLIC_SUPABASE_ANON_KEY` compatibility.
- `START_SENLIE.bat` now refuses to launch when `.env.local` still contains placeholder values.
- Auth errors now surface the actual Supabase configuration problem.
