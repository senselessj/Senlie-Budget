# Senlie Budget — Vercel deployment

This build is configured for native Vercel + Next.js deployment. There is no standalone server, Caddy configuration, or custom output directory.

## Vercel project settings

- Framework Preset: **Next.js**
- Root Directory: **./** (the folder containing `package.json`)
- Build Command override: **OFF**
- Output Directory override: **OFF**
- Install Command override: **OFF**
- Development Command override: **OFF**

## Environment variables

Add these in Vercel → Project → Settings → Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REAL_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_REAL_PUBLISHABLE_KEY
```

The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported if your Supabase project still uses that key format.

Do not commit `.env.local`.

## Deployment

Push to the GitHub branch connected to Vercel. Vercel will install dependencies and run `next build` automatically.
