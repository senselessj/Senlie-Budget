# Senlie Budget on iPhone / iPad

Senlie Budget v0.4.9 is prepared for iOS standalone PWA use.

## Install
1. Open the deployed Senlie Budget URL in Safari.
2. Tap Share.
3. Tap **Add to Home Screen**.
4. Launch Senlie from its Home Screen icon.

## Mobile behavior included in v0.4.9
- `viewport-fit=cover` for notched / Dynamic Island devices.
- Safe-area-aware top content, bottom navigation, drawers, and sheet buttons.
- Dynamic viewport height so drawers resize better around the software keyboard.
- 16px+ form text where appropriate to avoid Safari input zoom.
- App-owned History API navigation so iOS back/history gestures unwind Senlie views instead of jumping out unexpectedly.
- Bottom tab navigation is suppressed while a modal drawer is open so it cannot cover a Save/Create CTA.

## Native iOS later
This is still the PWA distribution path. If Senlie later needs App Store distribution, native billing, native notifications, or deeper OS integrations, the same web app can be wrapped separately for iOS while keeping these safe-area/navigation rules.
