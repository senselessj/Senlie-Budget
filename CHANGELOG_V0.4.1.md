# Senlie Budget v0.4.1

## Android Builder Reliability

- Fixed Windows Bubblewrap launch: `npx.cmd` is now invoked through `cmd.exe` rather than spawned directly with `shell: false`.
- Added a live `/manifest.webmanifest` preflight before Android initialization.
- Added JSON/content validation for the PWA manifest.
- Added friendly diagnostics for undeployed/404 manifests.
- Added support for accidentally pasted Markdown-formatted URLs.
- The builder now prints `spawnSync` errors, exit codes and termination signals instead of failing silently.
- Updated Android setup guide with deployment, JDK/SDK, signing, and Digital Asset Links troubleshooting.
