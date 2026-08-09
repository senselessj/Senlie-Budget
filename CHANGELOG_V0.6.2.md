# Senlie Budget v0.6.2 — Category editing

- Categories in Settings are now tappable and open a dedicated editor.
- Edit category name, color, and icon.
- Default Senlie categories can be customized but remain protected from deletion.
- Custom categories can be deleted from the editor.
- Category type is intentionally locked after creation to preserve historical transaction and budget semantics.
- Added PATCH support to `/api/budget/categories` with ownership checks.
- Added `rawName` metadata so editing an icon/color in Spanish does not accidentally overwrite the canonical localized system-category name.
- Category editor participates in Senlie's Android/iOS/browser Back navigation stack.
- No Supabase schema migration is required for this update.
