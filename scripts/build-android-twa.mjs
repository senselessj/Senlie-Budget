import { spawnSync } from 'node:child_process'

const raw = process.env.SENLIE_APP_URL || process.argv[2]
if (!raw) {
  console.error('\nSenlie Android builder needs your deployed HTTPS URL.\n')
  console.error('Example: npm run android:init -- https://budget.senlie.tech\n')
  process.exit(1)
}

let origin
try {
  const url = new URL(raw)
  if (url.protocol !== 'https:') throw new Error('HTTPS required')
  origin = url.origin
} catch {
  console.error('SENLIE_APP_URL must be a valid HTTPS URL.')
  process.exit(1)
}

const manifestUrl = `${origin}/manifest.webmanifest`
console.log(`\nCreating Senlie Budget Android wrapper from:\n${manifestUrl}\n`)

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const result = spawnSync(command, ['--yes', '--package', '@bubblewrap/cli@1.24.1', 'bubblewrap', 'init', `--manifest=${manifestUrl}`], {
  cwd: new URL('../android-twa/', import.meta.url),
  stdio: 'inherit',
  shell: false,
})

process.exit(result.status ?? 1)
