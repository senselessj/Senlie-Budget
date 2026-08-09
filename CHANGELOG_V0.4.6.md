# Senlie Budget v0.4.6

## Android builder URL parsing fix

- Fixed a Windows `cmd.exe` / npm argument-quoting edge case that could pass literal quote characters to Bubblewrap's `--manifest` option.
- The builder now passes `--manifest` and the HTTPS URL as separate unquoted arguments after validating the URL itself.
- Prints the exact JSON-escaped manifest argument and its length before Bubblewrap starts, making hidden characters obvious if a future shell issue appears.
- Keeps the existing PWA and Android-manifest preflight checks.
- No Vercel redeploy is required solely for this local builder fix if v0.4.5 is already live and both manifests pass preflight.
