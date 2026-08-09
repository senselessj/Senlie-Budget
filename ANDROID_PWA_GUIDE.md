# Senlie Budget — Android / PWA guide

## PWA (recommended default)

Deploy Senlie Budget over HTTPS. On Android Chrome, open the site and choose **Install app** / **Add to Home screen**. Senlie also exposes an **Install Senlie Budget** action in Settings when the browser provides the native install prompt.

The app includes:

- Next.js App Router manifest at `/manifest.webmanifest`
- 192px, 512px, maskable and Apple icons
- `display: standalone`
- a service worker at `/sw.js`
- a safe offline page
- service-worker caching limited to static app assets; Senlie API/auth/financial responses are intentionally not cached

## APK / Google Play package

The clean Android package for this web-first app is a **Trusted Web Activity (TWA)**. It displays your deployed PWA fullscreen using Android's browser runtime while keeping the same Next.js + Supabase deployment.

### One-click Windows route

Double-click `BUILD_ANDROID_APK.bat` after the production URL works. Enter a URL such as:

`https://budget.senlie.tech`

The script installs dependencies if necessary, initializes Bubblewrap from Senlie's live manifest, and runs the Android build.

### Digital Asset Links

A TWA must prove the website and Android package are controlled by the same owner. Bubblewrap gives you the signing certificate fingerprint. Copy:

`public/.well-known/assetlinks.json.example`

to:

`public/.well-known/assetlinks.json`

Then replace the placeholder fingerprint with the SHA-256 from the signing certificate and deploy. The final URL must be:

`https://YOUR_DOMAIN/.well-known/assetlinks.json`

Package name used by Senlie: `tech.senlie.budget`.

### Why the APK depends on the deployed PWA

Senlie Budget is a full Next.js app with server API routes. A static APK cannot simply contain the entire Vercel/Next server. The TWA keeps server functions on Vercel and packages the secure HTTPS PWA as an Android application. This avoids maintaining separate web and Android finance code.
