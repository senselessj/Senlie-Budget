# Senlie Budget v0.4.9

## Starting balance / current money
- Onboarding now explicitly asks for the **current balance** of every account.
- Users must enter a balance (including `0`) so the starting point is intentional.
- The onboarding account step shows the combined **Money you have right now** total.
- The final onboarding summary includes starting money separately from monthly income.
- Creating an account later also explains that its current/opening balance is a starting point and is not income.
- No database migration is required: Senlie already stores `opening_balance` and `current_balance`.

## Mobile sheet/layout fixes
- Bottom navigation is hidden while any Senlie drawer is open, preventing it from covering blue save/create buttons.
- Drawers now use dynamic viewport height (`dvh`), safe-area-aware footers, contained scrolling, and higher modal stacking.
- Activity filters use the same app navigation state as the other sheets.
- Improved iOS standalone PWA safe-area behavior and added `viewport-fit=cover`.

## Android / iOS navigation
- Added an app-owned browser history stack for tabs, transaction details/editing, Settings, add-entity sheets, and Activity filters.
- Android system Back and iOS browser/PWA back gestures now unwind the current in-app view before leaving Senlie.
- In installed standalone mode, the root uses a back-exit guard and asks for a second quick Back press before requesting app close.
- Transaction editing now sits logically above transaction details, so Back from Edit returns to Details.
