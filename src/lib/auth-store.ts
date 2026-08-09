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

type PasswordSignupResult = 'signed_in' | 'confirmation_required'

interface AuthState {
  user: SenlieUser | null
  initialized: boolean
  isLoading: boolean
  error: string | null
  pendingEmail: string | null

  initialize: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (name: string, email: string, password: string) => Promise<PasswordSignupResult>
  requestOtp: (email: string) => Promise<void>
  verifyOtp: (email: string, token: string) => Promise<void>
  signOut: () => Promise<void>
  completeOnboarding: () => void
  clearError: () => void
}

let authListenerStarted = false

function calmError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (m.includes('email not confirmed')) return 'Confirm your email first, then sign in.'
  if (m.includes('user already registered') || m.includes('already been registered')) return 'An account with this email already exists. Try signing in.'
  if (m.includes('password') && (m.includes('weak') || m.includes('least'))) return 'Choose a stronger password. Use at least 8 characters.'
  if (m.includes('rate') || m.includes('too many')) return 'Too many requests. Wait a moment and try again.'
  if (m.includes('expired')) return 'That code expired. Request a new one.'
  if (m.includes('token') && (m.includes('invalid') || m.includes('incorrect'))) return 'That code is not correct. Try again.'
  if (m.includes('email address not authorized')) return 'Supabase email delivery is still in test mode. Add Custom SMTP or use an authorized test email.'
  if (m.includes('network') || m.includes('failed to fetch')) return 'Could not reach Senlie. Check your connection and try again.'
  return message
}

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(supabaseConfigurationError ?? 'Supabase is not configured.')
  }
  return supabase
}

function cleanCredentials(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Enter a valid email address.')
  if (!password) throw new Error('Enter your password.')
  return { cleanEmail, password }
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
  const client = requireSupabase()

  // The auth.users -> public.users trigger is synchronous, but retry briefly so
  // a freshly-created account never flashes a false "missing profile" error.
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await client
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

async function acceptAuthenticatedSession(session: Session, authUser: User) {
  await mirrorServerSession(session)
  const profile = await loadProfile(authUser)
  return profile
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
                set({ user: profile, pendingEmail: null, error: null })
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

  signInWithPassword: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const client = requireSupabase()
      const { cleanEmail } = cleanCredentials(email, password)
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password,
      })
      if (error) throw error
      if (!data.session || !data.user) throw new Error('Supabase did not return an active session.')

      const profile = await acceptAuthenticatedSession(data.session, data.user)
      set({ user: profile, pendingEmail: null, error: null })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not sign in.'
      set({ error: calmError(msg) })
      throw e
    } finally {
      set({ isLoading: false })
    }
  },

  signUpWithPassword: async (name, email, password) => {
    set({ isLoading: true, error: null })
    try {
      const client = requireSupabase()
      const { cleanEmail } = cleanCredentials(email, password)
      const cleanName = name.trim()
      if (!cleanName) throw new Error('Enter your name.')
      if (password.length < 8) throw new Error('Choose a password with at least 8 characters.')

      // Always use the origin the app is actually running on. Production therefore
      // confirms back to Vercel/custom domain; localhost is only used during local dev.
      const emailRedirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined
      const { data, error } = await client.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name: cleanName },
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        },
      })
      if (error) throw error
      if (!data.user) throw new Error('Supabase did not create the account.')

      // If Confirm Email is OFF, Supabase returns a session immediately: zero auth
      // email is needed. If it is ON, the account waits for one confirmation email.
      if (data.session) {
        const profile = await acceptAuthenticatedSession(data.session, data.user)
        set({ user: profile, pendingEmail: null, error: null })
        return 'signed_in'
      }

      set({ pendingEmail: cleanEmail, error: null })
      return 'confirmation_required'
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not create the account.'
      set({ error: calmError(msg) })
      throw e
    } finally {
      set({ isLoading: false })
    }
  },

  requestOtp: async (email) => {
    set({ isLoading: true, error: null })
    try {
      const client = requireSupabase()
      const cleanEmail = email.trim().toLowerCase()
      if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Enter a valid email address.')

      const { error } = await client.auth.signInWithOtp({
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
      const client = requireSupabase()
      const cleanEmail = email.trim().toLowerCase()
      const cleanToken = token.replace(/\D/g, '')
      if (cleanToken.length !== 6) throw new Error('Enter the 6-digit code from your email.')

      const { data, error } = await client.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email',
      })
      if (error) throw error
      if (!data.session || !data.user) throw new Error('Supabase did not return an active session.')

      const profile = await acceptAuthenticatedSession(data.session, data.user)
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
