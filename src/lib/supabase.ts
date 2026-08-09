// Senlie Budget — browser Supabase client.
// Auth and browser-side profile reads use the public/publishable key. All
// user-data access is protected by Supabase Row Level Security.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)?.trim()

function isPlaceholder(value?: string) {
  if (!value) return true
  return /YOUR[_-]?PROJECT|YOUR[_-]?(PUBLISHABLE|ANON)|REPLACE[_-]?ME|example\.com/i.test(value)
}

function isUsableUrl(value?: string) {
  if (!value || isPlaceholder(value)) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && Boolean(parsed.hostname)
  } catch {
    return false
  }
}

export const supabaseConfigurationError = (() => {
  if (!supabaseUrl) {
    return 'Missing NEXT_PUBLIC_SUPABASE_URL in .env.local.'
  }
  if (!isUsableUrl(supabaseUrl)) {
    return 'NEXT_PUBLIC_SUPABASE_URL is still a placeholder or is not a valid HTTPS URL. Paste your real Supabase Project URL into .env.local.'
  }
  if (!supabaseKey || isPlaceholder(supabaseKey)) {
    return 'Missing or placeholder Supabase publishable/anon key in .env.local.'
  }
  return null
})()

export const isSupabaseConfigured = supabaseConfigurationError === null

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
