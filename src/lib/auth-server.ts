// Senlie Budget — verified server-side Auth helpers.
// Identity comes from Supabase Auth; application profile data comes through
// the authenticated Supabase Data API and remains protected by RLS.

import { db } from '@/lib/db'
import {
  getCurrentAuthUser,
  getServerSupabase,
  SenlieAuthError,
  SENLIE_AUTH_COOKIE,
} from '@/lib/supabase-server'

export { SenlieAuthError, SENLIE_AUTH_COOKIE }

export async function getCurrentUserEmail(): Promise<string> {
  const authUser = await getCurrentAuthUser()
  if (!authUser.email) throw new SenlieAuthError('This Senlie account has no email address.')
  return authUser.email.toLowerCase()
}

export async function getCurrentUser() {
  const authUser = await getCurrentAuthUser()
  let user = await db.user.findUnique({ where: { id: authUser.id } })

  if (!user) {
    const supabase = await getServerSupabase()
    const { error } = await supabase.rpc('senlie_ensure_profile')
    if (error) {
      throw new Error('Your Senlie profile is missing and could not be repaired. Run the latest SUPABASE_SETUP.sql once in the Supabase SQL Editor.')
    }
    user = await db.user.findUnique({ where: { id: authUser.id } })
  }

  if (!user) {
    throw new Error('Your Senlie profile is still missing after repair. Re-run SUPABASE_SETUP.sql and sign in again.')
  }
  return user
}
