'use client'

const CREDENTIAL_PREFIX = 'senlie-biometric-credential:'
const ENABLED_PREFIX = 'senlie-biometric-enabled:'

function randomBytes(length = 32) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

function userHandle(userId: string) {
  return new TextEncoder().encode(userId).slice(0, 64)
}

export function biometricEnabled(userId: string) {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(`${ENABLED_PREFIX}${userId}`) === '1'
}

export function hasBiometricCredential(userId: string) {
  if (typeof window === 'undefined') return false
  return Boolean(localStorage.getItem(`${CREDENTIAL_PREFIX}${userId}`))
}

export function disableBiometricUnlock(userId: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(`${ENABLED_PREFIX}${userId}`)
  // Keep the WebAuthn credential id so the user can re-enable without creating
  // a duplicate passkey. Browser/OS credential deletion remains device-managed.
}

export async function platformBiometricsAvailable() {
  if (typeof window === 'undefined' || !window.isSecureContext || !('PublicKeyCredential' in window)) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export async function enableBiometricUnlock(user: { id: string; email: string; name: string }) {
  if (!(await platformBiometricsAvailable())) {
    throw new Error('This device/browser does not expose a biometric or device user-verification authenticator to Senlie.')
  }

  let credentialId = localStorage.getItem(`${CREDENTIAL_PREFIX}${user.id}`)
  const hadCredential = Boolean(credentialId)

  if (!credentialId) {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(),
        rp: { name: 'Senlie Budget' },
        user: {
          id: userHandle(user.id),
          name: user.email || user.id,
          displayName: user.name || 'Senlie user',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'discouraged',
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential | null

    if (!credential) throw new Error('Biometric setup was cancelled.')
    credentialId = toBase64Url(new Uint8Array(credential.rawId))
    localStorage.setItem(`${CREDENTIAL_PREFIX}${user.id}`, credentialId)
  }

  // Creating a platform credential already requires device user verification.
  // When re-enabling an existing credential, verify it again before unlocking.
  if (hadCredential) await verifyBiometricUnlock(user.id)
  localStorage.setItem(`${ENABLED_PREFIX}${user.id}`, '1')
}

export async function verifyBiometricUnlock(userId: string) {
  if (!(await platformBiometricsAvailable())) {
    throw new Error('Biometric unlock is not available on this device.')
  }

  const credentialId = localStorage.getItem(`${CREDENTIAL_PREFIX}${userId}`)
  if (!credentialId) throw new Error('Biometric unlock has not been set up on this device.')

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(),
      allowCredentials: [{
        type: 'public-key',
        id: fromBase64Url(credentialId),
        transports: ['internal'],
      }],
      userVerification: 'required',
      timeout: 60000,
    },
  })

  if (!assertion) throw new Error('Unlock cancelled.')
  return true
}
