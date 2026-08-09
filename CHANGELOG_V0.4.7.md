# Senlie Budget v0.4.7

## Android / Play Billing build fix

- Detects Bubblewrap Play Billing support before Android builds.
- Raises `minSdkVersion` to 23 when Play Billing is enabled because Android Browser Helper Billing 1.2.0 requires API 23+.
- Runs `bubblewrap update --skipVersionUpgrade` after changing `twa-manifest.json`, keeping Bubblewrap as the source of truth instead of manually patching generated Gradle files.
- Keeps the normal PWA and web app unchanged.
