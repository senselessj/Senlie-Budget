'use client'

import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase, supabaseConfigurationError } from '@/lib/supabase'

export interface SenlieUser {
  id: string
  email: string
  name: string
  onboardingComplete: boolean
  termsAccepted: boolean
}

interface AuthState {
  user: SenlieUser | null
  initialized: boolean
  isLoading: boolean
  error: string | null
  pendingEmail: string | null

  initialize: () => Promise<void>
  requestOtp: (email: string) => Promise<void>
  verifyOtp: (email: string, token: string) => Promise<void>
  signOut: () => Promise<void>
  completeOnboarding: () => void
  clearError: () => void
}

let authListenerStarted = false

function calmError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('rate') || m.includes('too many')) return 'Too many code requests. Wait a moment and try again.'
  if (m.includes('expired')) return 'That code expired. Request a new one.'
  if (m.includes('token') && (m.includes('invalid') || m.includes('incorrect'))) return 'That code is not correct. Try again.'
  if (m.includes('email address not authorized')) return 'Supabase email delivery is still in test mode. Add Custom SMTP or use an authorized test email.'
  if (m.includes('network') || m.includes('failed to fetch')) return 'Could not reach Senlie. Check your connection and try again.'
  return message
}

async function mirrorServerSession(session: Session | null) {
  if (!session?.access_token) {
    await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {})
    return
  }
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: session.access_token }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || 'Could not establish the Senlie session.')
  }
}

async function loadProfile(authUser: User): Promise<SenlieUser> {
  if (!supabase) throw new Error(supabaseConfigurationError ?? 'Supabase is not configured.')

  // The auth.users -> public.users trigger is synchronous, but retry briefly so
  // a freshly-created account never flashes a false "missing profile" error.
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await supabase
      .from('users')
      .select('id,email,name,onboarding_complete,terms_accepted')
      .eq('id', authUser.id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (data) {
      return {
        id: data.id,
        email: data.email ?? authUser.email ?? '',
        name: data.name ?? authUser.email?.split('@')[0] ?? 'Friend',
        onboardingComplete: Boolean(data.onboarding_complete),
        termsAccepted: Boolean(data.terms_accepted),
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)))
  }

  throw new Error('Your Senlie profile was not created. Run the latest SUPABASE_SETUP.sql once in Supabase.')
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  initialized: false,
  isLoading: false,
  error: null,
  pendingEmail: null,

  initialize: async () => {
    if (get().initialized) return
    if (!isSupabaseConfigured || !supabase) {
      set({ initialized: true, error: 'Supabase is not configured. Add the values from .env.example to .env.local.' })
      return
    }

    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error

      if (data.session?.user) {
        await mirrorServerSession(data.session)
        const profile = await loadProfile(data.session.user)
        set({ user: profile })
      } else {
        await mirrorServerSession(null)
        set({ user: null })
      }

      if (!authListenerStarted) {
        authListenerStarted = true
        supabase.auth.onAuthStateChange((event, session) => {
          // Do not block Supabase's auth callback. Perform async work outside it.
          queueMicrotask(async () => {
            try {
              await mirrorServerSession(session)
              if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
                const profile = await loadProfile(session.user)
                set({ user: profile, error: null })
              }
              if (event === 'SIGNED_OUT' || !session) set({ user: null })
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Authentication synchronization failed.'
              set({ error: calmError(msg) })
            }
          })
        })
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not restore your session.'
      set({ user: null, error: calmError(msg) })
    } finally {
      set({ initialized: true, isLoading: false })
    }
  },

  requestOtp: async (email) => {
    set({ isLoading: true, error: null })
    try {
      if (!isSupabaseConfigured || !supabase) throw new Error(supabaseConfigurationError ?? 'Supabase is not configured.')
      const cleanEmail = email.trim().toLowerCase()
      if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Enter a valid email address.')

      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      })
      if (error) throw error
      set({ pendingEmail: cleanEmail })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not send the code.'
      set({ error: calmError(msg) })
      throw e
    } finally {
      set({ isLoading: false })
    }
  },

  verifyOtp: async (email, token) => {
    set({ isLoading: true, error: null })
    try {
      if (!isSupabaseConfigured || !supabase) throw new Error(supabaseConfigurationError ?? 'Supabase is not configured.')
      const cleanEmail = email.trim().toLowerCase()
      const cleanToken = token.replace(/\D/g, '')
      if (cleanToken.length !== 6) throw new Error('Enter the 6-digit code from your email.')

      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email',
      })
      if (error) throw error
      if (!data.session || !data.user) throw new Error('Supabase did not return an active session.')

      await mirrorServerSession(data.session)
      const profile = await loadProfile(data.user)
      set({ user: profile, pendingEmail: null, error: null })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not verify the code.'
      set({ error: calmError(msg) })
      throw e
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    try {
      if (isSupabaseConfigured && supabase) await supabase.auth.signOut()
    } finally {
      await mirrorServerSession(null)
      set({ user: null, pendingEmail: null, error: null, isLoading: false })
    }
  },

  completeOnboarding: () => {
    set((s) => ({
      user: s.user ? { ...s.user, onboardingComplete: true } : null,
    }))
  },

  clearError: () => set({ error: null }),
}))
