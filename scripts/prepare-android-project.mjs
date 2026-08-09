import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(here, '..')
const twaDir = path.join(projectRoot, 'android-twa')
const manifestPath = path.join(twaDir, 'twa-manifest.json')

if (!existsSync(manifestPath)) {
  console.error('android-twa/twa-manifest.json does not exist yet. Run Android initialization first.')
  process.exit(1)
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const playBillingEnabled = manifest?.features?.playBilling?.enabled === true
const currentMinSdk = Number(manifest.minSdkVersion ?? 0)

if (playBillingEnabled && currentMinSdk < 23) {
  manifest.minSdkVersion = 23
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`Play Billing detected: raised Bubblewrap minSdkVersion from ${currentMinSdk || '(unset)'} to 23.`)
  console.log('Android 6.0 (API 23) or newer will be required for the APK.')
} else if (playBillingEnabled) {
  console.log(`Play Billing detected: minSdkVersion ${currentMinSdk} is already compatible.`)
} else {
  console.log('Play Billing is disabled; no minSdkVersion change was needed.')
}
