'use client'

import { useCallback } from 'react'
import { useSenlieUI } from '@/lib/store'
import { translate, localeForLanguage, type Language } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-store'

// Translation hook. Returns a `t(key, params?)` function that resolves
// the current language from the store.
export function useT() {
  const language = useSenlieUI((s) => s.language)
  return useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(language, key, params),
    [language]
  )
}

export function useLanguage() {
  const language = useSenlieUI((s) => s.language)
  const setStoreLanguage = useSenlieUI((s) => s.setLanguage)
  const bumpData = useSenlieUI((s) => s.bumpData)
  const user = useAuth((s) => s.user)

  const setLanguage = useCallback(async (next: Language): Promise<boolean> => {
    setStoreLanguage(next)

    if (typeof document !== 'undefined') {
      document.documentElement.lang = next
      document.documentElement.dir = 'ltr'
    }

    // Before sign-in/onboarding, local persistence is enough. Once the account
    // exists and onboarding is complete, mirror the preference to Supabase so
    // the same language follows the user to another device.
    if (!user?.onboardingComplete) return true

    try {
      const res = await fetch('/api/budget/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: next }),
      })
      if (res.ok) bumpData()
      return res.ok
    } catch {
      return false
    }
  }, [setStoreLanguage, bumpData, user?.onboardingComplete])

  return { language, locale: localeForLanguage(language), setLanguage }
}

export type { Language }
