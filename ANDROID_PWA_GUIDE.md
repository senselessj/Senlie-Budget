# Senlie Budget — Android / PWA guide (v0.4.3)

## First: deploy the PWA

The Android wrapper reads the Web App Manifest from the LIVE HTTPS deployment. Before running the Android builder, this URL must open and show JSON:

`https://YOUR_DOMAIN/manifest.webmanifest`

If that URL is 404, deploy this PWA version to Vercel first. An older Senlie deployment from before v0.4.0 does not have the manifest needed by Bubblewrap.

## PWA

Deploy Senlie Budget over HTTPS. On Android Chrome, open the site and choose **Install app** / **Add to Home screen**. Senlie also exposes an **Install Senlie Budget** action in Settings when the browser provides the native install prompt.

The app includes:

- Next.js App Router manifest at `/manifest.webmanifest`
- 192px, 512px, maskable and Apple icons
- `display: standalone`
- a service worker at `/sw.js`
- a safe offline page
- service-worker caching limited to static app assets; Senlie API/auth/financial responses are intentionally not cached

## APK / Google Play package

Senlie uses a Trusted Web Activity (TWA) for the Android package. It displays the deployed PWA fullscreen using the Android browser runtime while keeping the same Next.js + Supabase deployment.

### Windows route

1. Deploy this version to Vercel.
2. Confirm `https://YOUR_DOMAIN/manifest.webmanifest` displays JSON.
3. Double-click `BUILD_ANDROID_APK.bat`.
4. Paste the plain HTTPS URL, e.g. `https://budget.senlie.tech`.
5. On Bubblewrap's first run, allow it to configure/download the required JDK and Android SDK if prompted.
6. Confirm the app values and create/choose a signing key when Bubblewrap asks.
7. Accept Android SDK licenses during the first build if prompted.

The builder now performs a manifest preflight and prints the real Bubblewrap process error instead of failing silently.

### Outputs

A successful build creates these in `android-twa`:

- `app-release-signed.apk` — direct Android install/testing
- `app-release-bundle.aab` — Google Play upload

## Digital Asset Links

A TWA must prove the website and Android package are controlled by the same owner. After initialization/building, use the signing certificate fingerprint to create:

`public/.well-known/assetlinks.json`

A template is at:

`public/.well-known/assetlinks.json.example`

The deployed file must be reachable at:

`https://YOUR_DOMAIN/.well-known/assetlinks.json`

Package name used by Senlie: `tech.senlie.budget`.

Without successful Digital Asset Links verification, Android can fall back to browser/custom-tab UI instead of the fully trusted fullscreen experience.

## Common failures

### `manifest.webmanifest` is 404
The deployed website is still an older Senlie version. Push/deploy this PWA build first.

### Builder stopped immediately after printing the manifest URL
v0.4.0 had a Windows process-launch bug around `npx.cmd`. v0.4.2 runs it through `cmd.exe` and reports process errors.

### Java / JDK / Android SDK error
Let Bubblewrap install/configure its external dependencies on first run, or configure existing JDK/Android SDK paths. `bubblewrap doctor` can validate the environment.

### Signing key prompt
This is expected. Keep the keystore and passwords safe. You need the same signing identity for future updates to the same Android app.


## v0.4.3 branding note

The Android/PWA icon set now uses the same Senlie `S` symbol shown inside the app. If an already-installed PWA still shows the old Z.ai placeholder, uninstall the existing PWA once and reinstall it after the v0.4.3 deployment. Re-run Bubblewrap init/build for a fresh APK/AAB so Android packages the new manifest icons.

## v0.4.5: `cli ERROR Invalid URL` during `bubblewrap init`

Senlie now exposes two manifests:

- `/manifest.webmanifest` — browser/PWA installation manifest.
- `/android-manifest.webmanifest` — minimal Bubblewrap/TWA manifest with absolute HTTPS launch and icon URLs.

If Bubblewrap reports `Invalid URL` immediately after "Initializing application from Web Manifest", deploy v0.4.5 first, verify both URLs return JSON, and rerun `BUILD_ANDROID_APK.bat`.


## v0.4.6: Windows `Invalid URL` after manifest preflight

v0.4.6 changes how the manifest URL is handed from `cmd.exe`/npm to Bubblewrap. The URL is validated by Node first, then passed as a separate unquoted `--manifest` argument. This avoids literal quote characters surviving the Windows command-shim chain.

If v0.4.5 is already deployed and both manifest preflight checks pass, this specific fix is local-only; you can run the v0.4.6 builder without another Vercel deployment.


## Play Billing minimum Android version

When Play Billing is enabled, Android Browser Helper Billing requires API 23 or newer. Senlie v0.4.7 automatically sets `minSdkVersion` to 23 in `android-twa/twa-manifest.json` and regenerates the Bubblewrap project before building. Do not use `tools:overrideLibrary` to bypass this requirement; that can allow installation on Android versions where the billing library may fail at runtime.
