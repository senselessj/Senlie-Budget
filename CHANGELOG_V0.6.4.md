# Senlie Budget v0.6.4 — Full Payday Editor

- Replaced the one-off “change next payday” control with a full payday editor.
- Weekly, biweekly, and monthly schedules now save both the next real payday and amount per paycheck.
- Customized schedules can add, edit, and remove multiple monthly payday + amount rows.
- Added `users.pay_amount` so paycheck amount is stored independently from budget income targets.
- Added `recurring_rules.is_pay_schedule` so Senlie-managed payday rules do not collide with user-created recurring income.
- Existing customized payday rules from prior Senlie versions are backfilled by `SUPABASE_SETUP.sql`.
- The home payday card now uses the configured per-paycheck amount when available.
- Switching away from Customized deactivates old customized payday rules so they do not remain active recurring income.

## Database
Run the updated `SUPABASE_SETUP.sql` once. It safely uses `ADD COLUMN IF NOT EXISTS`.
