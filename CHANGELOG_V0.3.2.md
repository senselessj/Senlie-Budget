# Senlie Budget v0.3.2

## Vercel-native deployment cleanup

- Removed Next.js `output: "standalone"`.
- Removed `scripts/prepare-standalone.mjs`.
- Removed Caddy/self-host deployment scaffolding (`Caddyfile` and `.zscripts/`).
- Simplified `npm run build` to `next build`.
- Restored standard local production start with `next start -p 3000`.
- Pinned Next.js and `eslint-config-next` to 16.3.0 to match the Vercel build environment used during deployment.
- Pinned Node.js to the Vercel-supported 22.x line instead of an open-ended `>=20.9.0` range.
- Added `VERCEL_DEPLOY.md` with the exact zero-override Vercel settings.

No Senlie Budget UI, Supabase schema, OTP authentication flow, or financial feature code was removed.
