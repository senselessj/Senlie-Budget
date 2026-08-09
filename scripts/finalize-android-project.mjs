import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(here, '..')
const twaDir = path.join(projectRoot, 'android-twa')
const gradlePath = path.join(twaDir, 'app', 'build.gradle')

const TARGET_API = 36

if (!existsSync(gradlePath)) {
  console.error('android-twa/app/build.gradle does not exist. Run Bubblewrap update first.')
  process.exit(1)
}

let gradle = await readFile(gradlePath, 'utf8')
const original = gradle

if (!/compileSdkVersion\s+\d+/.test(gradle)) {
  console.error('Could not find compileSdkVersion in generated Android build.gradle.')
  process.exit(1)
}
if (!/targetSdkVersion\s+\d+/.test(gradle)) {
  console.error('Could not find targetSdkVersion in generated Android build.gradle.')
  process.exit(1)
}

gradle = gradle
  .replace(/compileSdkVersion\s+\d+/, `compileSdkVersion ${TARGET_API}`)
  .replace(/targetSdkVersion\s+\d+/, `targetSdkVersion ${TARGET_API}`)

if (gradle !== original) {
  await writeFile(gradlePath, gradle, 'utf8')
}

console.log(`Android wrapper finalized for Android 16 / API ${TARGET_API}.`)
console.log('compileSdkVersion = 36')
console.log('targetSdkVersion  = 36')
