import { spawnSync } from 'node:child_process'

function normalizeInput(value) {
  let input = String(value || '').trim()

  // Be forgiving if a Markdown-formatted link gets pasted from chat/docs:
  // [https://example.com](https://example.com)
  const markdownLink = input.match(/^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/i)
  if (markdownLink) input = markdownLink[2]

  return input
}

const raw = normalizeInput(process.env.SENLIE_APP_URL || process.argv[2])
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
  console.error(`\nInvalid URL: ${raw}`)
  console.error('Enter the plain HTTPS URL, for example: https://budget.senlie.tech\n')
  process.exit(1)
}

const pwaManifestUrl = `${origin}/manifest.webmanifest`
const manifestUrl = `${origin}/android-manifest.webmanifest`
console.log(`\nChecking the live Senlie PWA:\n${pwaManifestUrl}\n`)

try {
  const response = await fetch(pwaManifestUrl, {
    redirect: 'follow',
    headers: { 'user-agent': 'Senlie-Android-Builder/0.4.6' },
  })

  if (!response.ok) {
    console.error(`The live PWA manifest returned HTTP ${response.status} ${response.statusText}.`)
    console.error('\nThe Android wrapper can only be created after the PWA version is deployed to Vercel.')
    console.error('Push/deploy the current Senlie PWA, then verify this URL opens in your browser:')
    console.error(pwaManifestUrl)
    console.error('\nAfter it displays JSON, run BUILD_ANDROID_APK.bat again.\n')
    process.exit(1)
  }

  const contentType = response.headers.get('content-type') || ''
  const text = await response.text()
  let manifest
  try {
    manifest = JSON.parse(text)
  } catch {
    console.error('The manifest URL responded, but it did not return valid JSON.')
    console.error(`Content-Type: ${contentType || '(none)'}`)
    console.error('\nMake sure Vercel is serving the current Senlie PWA deployment.\n')
    process.exit(1)
  }

  const missing = []
  if (!manifest.name && !manifest.short_name) missing.push('name/short_name')
  if (!manifest.start_url) missing.push('start_url')
  if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) missing.push('icons')
  if (missing.length) {
    console.error(`The manifest is reachable, but is missing: ${missing.join(', ')}`)
    console.error('Deploy the current Senlie PWA build before creating the Android wrapper.\n')
    process.exit(1)
  }

  console.log(`PWA manifest OK: ${manifest.name || manifest.short_name}`)
} catch (error) {
  console.error('Could not reach the live PWA manifest.')
  console.error(error instanceof Error ? error.message : String(error))
  console.error('\nOpen this URL in your browser first:')
  console.error(pwaManifestUrl)
  console.error('If it does not show the Senlie manifest JSON, fix/deploy Vercel first.\n')
  process.exit(1)
}

console.log(`\nChecking the Bubblewrap-safe manifest:\n${manifestUrl}\n`)

try {
  const response = await fetch(manifestUrl, {
    redirect: 'follow',
    headers: { 'user-agent': 'Senlie-Android-Builder/0.4.6' },
  })

  if (!response.ok) {
    console.error(`The Android manifest returned HTTP ${response.status} ${response.statusText}.`)
    console.error('Deploy the current Senlie PWA before running the Android builder.\n')
    process.exit(1)
  }

  const manifest = await response.json()
  const urls = [manifest.start_url, manifest.scope, ...(manifest.icons || []).map((icon) => icon.src)]
  for (const value of urls) {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:' || parsed.origin !== origin) {
      throw new Error(`Manifest contains a non-HTTPS or cross-origin URL: ${value}`)
    }
  }

  const icon512 = (manifest.icons || []).find((icon) => String(icon.sizes || '').includes('512x512'))
  if (!icon512) throw new Error('Android manifest is missing a 512x512 icon.')

  console.log('Bubblewrap manifest OK: all launch/icon URLs are absolute HTTPS URLs.')
} catch (error) {
  console.error('The Bubblewrap-safe manifest is invalid.')
  console.error(error instanceof Error ? error.message : String(error))
  console.error(`\nOpen this URL and make sure the current PWA is deployed:\n${manifestUrl}\n`)
  process.exit(1)
}

console.log(`\nCreating Senlie Budget Android wrapper from:\n${manifestUrl}\n`)

// Use `npm exec` instead of `npx`. On current npm versions this is the
// unambiguous form for running a binary supplied by a temporary package:
//   npm exec --yes --package=@bubblewrap/cli@1.24.1 -- bubblewrap ...
//
// v0.4.1 quoted every npx argument when going through cmd.exe on Windows.
// Some Windows/npm combinations then treated "--yes" as a package/tag,
// producing EINVALIDTAGNAME before Bubblewrap ever launched.
const npmArgs = [
  'exec',
  '--yes',
  '--package=@bubblewrap/cli@1.24.1',
  '--',
  'bubblewrap',
  'init',
  `--manifest=${manifestUrl}`,
]

let result
if (process.platform === 'win32') {
  // npm is a .cmd shim on Windows. Run it through cmd.exe, but only quote the
  // manifest value (which we control as a normalized HTTPS URL), not npm flags.
  const comspec = process.env.ComSpec || 'cmd.exe'
  // IMPORTANT: do not wrap the URL inside --manifest="..." here.
  // Going through npm.cmd -> cmd.exe -> Bubblewrap on Windows can preserve
  // those inner quote characters in the parsed option value. Bubblewrap then
  // receives a value like "https://..." (quotes included), and its URL
  // constructor throws ERR_INVALID_URL before it can even read the manifest.
  // The normalized Senlie URL cannot contain spaces or cmd metacharacters,
  // so pass it as a separate, unquoted argument.
  const commandLine = [
    'npm exec --yes --package=@bubblewrap/cli@1.24.1 -- bubblewrap init --manifest',
    manifestUrl,
  ].join(' ')

  console.log(`Manifest argument (exact): ${JSON.stringify(manifestUrl)}`)
  console.log(`Manifest argument length: ${manifestUrl.length}`)
  console.log(`Running: ${commandLine}\n`)
  result = spawnSync(comspec, ['/d', '/c', commandLine], {
    cwd: new URL('../android-twa/', import.meta.url),
    stdio: 'inherit',
    windowsHide: false,
  })
} else {
  console.log(`Running: npm ${npmArgs.join(' ')}\n`)
  result = spawnSync('npm', npmArgs, {
    cwd: new URL('../android-twa/', import.meta.url),
    stdio: 'inherit',
    shell: false,
  })
}

if (result.error) {
  console.error('\nCould not start Bubblewrap:')
  console.error(result.error)
  process.exit(1)
}

if (result.signal) {
  console.error(`\nBubblewrap was terminated by signal ${result.signal}.`)
  process.exit(1)
}

if (result.status !== 0) {
  console.error(`\nBubblewrap exited with code ${result.status}.`)
  console.error('The actual Bubblewrap/npm error should now be visible above this line.\n')
  process.exit(result.status ?? 1)
}

console.log('\nAndroid project initialized successfully.\n')
