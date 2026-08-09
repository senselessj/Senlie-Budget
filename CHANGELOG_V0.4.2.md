# Senlie Budget v0.4.2

## Android builder fix

- Replaced the Windows `npx` wrapper invocation with the canonical `npm exec` form.
- Uses `--package=@bubblewrap/cli@1.24.1 -- bubblewrap` so npm cannot misread `--yes` as a package/tag.
- Fixed both Android initialization and build commands.
- Keeps the live PWA manifest preflight from v0.4.1.
- Prints the exact command being launched before Bubblewrap starts.

This fixes the Windows error:

```text
npm error code EINVALIDTAGNAME
npm error Invalid tag name "\"--yes\"" of package "\"--yes\""
```
