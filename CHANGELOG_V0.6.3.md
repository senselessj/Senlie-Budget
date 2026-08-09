# Senlie Budget v0.6.3 — Editable payday calendar

- The Payment Schedule settings screen now lets the user set the exact next payday date.
- Weekly, biweekly, and monthly schedules use that date as the recurrence anchor instead of recalculating from the current day on every load.
- Monthly schedules preserve the chosen day-of-month and safely clamp dates such as the 31st in shorter months.
- Customized schedules update the next active income payday when the date is changed.
- Added `users.pay_anchor_date` to Supabase for regular pay schedules.
- Added bilingual English/Spanish copy for the new controls.

## Existing Supabase projects
Run the updated `SUPABASE_SETUP.sql` once. It uses `ADD COLUMN IF NOT EXISTS`, so existing data is preserved.

## Android
This is a web/PWA update. No new APK/AAB is required unless you also changed native Android wrapper code.
