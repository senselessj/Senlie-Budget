// Senlie Budget — request-scoped Supabase server client
// Uses the verified Supabase access token mirrored into an HttpOnly cookie.
// Every database query therefore runs as the signed-in user and is still
// constrained by the Row Level Security policies in Supabase.

import { cookies } from 'next/headers'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

export const SENLIE_AUTH_COOKIE = 'senlie-access-token'

export class SenlieAuthError extends Error {
  statusCode = 401
  constructor(message = 'Authentication required.') {
    super(message)
    this.name = 'SenlieAuthError'
  }
}

function isPlaceholder(value?: string) {
  if (!value) return true
  return /YOUR[_-]?PROJECT|YOUR[_-]?(PUBLISHABLE|ANON)|REPLACE[_-]?ME|example\.com/i.test(value)
}

function credentials() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim()

  if (!url || isPlaceholder(url)) {
    throw new Error('Supabase Project URL is missing or still a placeholder. Set NEXT_PUBLIC_SUPABASE_URL in .env.local to the real Project URL from Supabase.')
  }
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || !parsed.hostname) throw new Error('invalid')
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL in .env.local is not a valid HTTPS URL.')
  }
  if (!key || isPlaceholder(key)) {
    throw new Error('Supabase publishable/anon key is missing or still a placeholder in .env.local.')
  }
  return { url, key }
}

export function createVerifierClient(): SupabaseClient {
  const { url, key } = credentials()
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export async function getAuthToken(): Promise<string> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SENLIE_AUTH_COOKIE)?.value
  if (!token) throw new SenlieAuthError()
  return token
}

export async function getCurrentAuthUser(): Promise<User> {
  const token = await getAuthToken()
  const verifier = createVerifierClient()
  const { data, error } = await verifier.auth.getUser(token)
  if (error || !data.user) {
    throw new SenlieAuthError('Your session has expired. Sign in again.')
  }
  return data.user
}

export async function getServerSupabase(): Promise<SupabaseClient> {
  const token = await getAuthToken()
  const { url, key } = credentials()
  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
