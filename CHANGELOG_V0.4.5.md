# Senlie Budget v0.4.5

## Android / Bubblewrap manifest compatibility

- Added `/android-manifest.webmanifest`, a minimal TWA-specific manifest used only by Bubblewrap.
- Android manifest launch, scope, and icon URLs are fully-qualified HTTPS URLs generated from the live request origin.
- Removed browser-only/optional manifest fields from the Bubblewrap input surface.
- Android builder now preflights both the normal PWA manifest and the dedicated Android manifest before launching Bubblewrap.
- Existing browser PWA behavior, password auth, OTP fallback, Supabase data layer, and Senlie icon set are preserved.
