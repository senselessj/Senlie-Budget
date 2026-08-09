# Senlie Budget Android package (TWA)

Senlie Budget is a PWA first. The Android APK/AAB is generated as a Trusted Web Activity (TWA) around the deployed HTTPS app, so Android and web share one Senlie codebase and one Supabase backend.

## Before building

1. Deploy this repository to Vercel (or your final HTTPS domain).
2. Confirm `https://YOUR_DOMAIN/manifest.webmanifest` loads.
3. From the project root run `npm run android:init -- https://YOUR_DOMAIN` once, or double-click `BUILD_ANDROID_APK.bat` and enter the URL.
4. Bubblewrap will generate this Android project and signing key.
5. Build with `npm run android:build` or the BAT launcher.
6. Copy the signing SHA-256 fingerprint into `public/.well-known/assetlinks.json` using the supplied `.example` as the template, deploy it, then rebuild/test. This removes browser chrome and verifies that the Android app and website have the same owner.

The generated APK is normally `android-twa/app-release-signed.apk`. Google Play prefers an Android App Bundle (AAB) for store distribution.
