# Senlie Budget v0.6.1 — Android API / Play Protect fix

- Android builder now finalizes the generated TWA with compile SDK 36 and target SDK 36.
- The SDK patch runs after `bubblewrap update`, so Bubblewrap cannot overwrite it.
- Keeps the Play Billing minimum SDK compatibility fix (API 23).
- Prevents newly rebuilt Senlie APKs from presenting themselves as legacy-target Android apps.
- Prepares the wrapper for Google Play's Android 16 / API 36 target requirement for new apps and updates beginning August 31, 2026.

Important: existing APK files do not change when the PWA is redeployed. Rebuild and reinstall the APK.
