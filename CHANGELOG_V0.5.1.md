# Senlie Budget v0.5.1 — Mobile sheet interaction fix

## Fixed

- Fixed Category, Account, destination-account and Date pickers appearing behind the Vaul drawer overlay.
  - Drawer content uses z-index 100; shared popovers now render at z-index 150.
- Fixed Save/Create buttons visually overlapping the final form rows on short Android, iOS, landscape, and keyboard-constrained viewports.
  - Main app sheets now have an explicit `dvh`-based height.
  - Their central scroll region uses `flex: 1 1 0%` instead of sizing from its contents.
  - Footers are a separate non-shrinking layer and cannot occupy the scroll region.
- Added safe-area-aware footer separation for Android gesture navigation and the iOS home indicator.
- The bottom tab bar is now removed from the React tree while an app sheet is open instead of relying only on CSS `:has()`.
- Main sheets are capped to a comfortable width on tablet/desktop while remaining full-width on phones.

## Database

No Supabase migration is required for this release.
