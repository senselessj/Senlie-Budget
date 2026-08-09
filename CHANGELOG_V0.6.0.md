# Senlie Budget v0.6.0

## Savings goals
- Existing savings goals are now editable by tapping the goal card.
- Edit name, target amount, amount saved, target date, color and icon.
- Goals can also be deleted from the edit sheet.

## Real available money
- Home `Available` now comes from the user's current non-credit account balances.
- On first setup, this means the balances entered during onboarding become the money actually available at that moment.
- Future income/expense transactions continue changing account balances as before.

## Biometric app lock
- Replaced the old informational "managed by device" placeholder with WebAuthn platform-authenticator setup.
- Supported Android/iOS devices now invoke real platform user verification (fingerprint, Face ID/Touch ID, or the OS secure fallback selected by the device).
- When enabled, Senlie locks at launch and after spending a few seconds in the background.
- The biometric preference/credential is device-local; no fingerprint or face data is sent to Senlie or Supabase.

## Full profile editor
- Settings → Edit now opens a dedicated profile UI instead of `window.prompt`.
- Profile picture upload (Supabase Storage `avatars` bucket), name, pronouns, date of birth, calculated age and read-only email.
- Avatar is reflected in Home and Settings.

## Icons
- Fixed dynamic Lucide icon rendering so stored icon ids no longer collapse to the fallback icon.
- Expanded category/goal icon choices with car, shirt, phone, laptop, monitor, tablet, headphones, camera, watch, keyboard, mouse, printer, bike, furniture, travel and more.

## First-run walkthrough
- New one-time interactive tour after onboarding.
- Explains real available money, adding transactions, Activity, Budget, Insights and Settings.
- Completion is stored in the Senlie user profile so the tour does not repeat after it is finished/skipped.

## Database update
Run the included `SUPABASE_SETUP.sql` once on the existing Supabase project before deploying v0.6.0. It safely adds:
- `users.avatar_url`
- `users.pronouns`
- `users.birth_date`
- `users.walkthrough_completed`
- the `avatars` Storage bucket and per-user upload/update/delete policies.
