'use client'

import { useCallback } from 'react'
import { useSenlieUI } from '@/lib/store'
import { translate, type Language } from '@/lib/i18n'

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
  const setLanguage = useSenlieUI((s) => s.setLanguage)
  return { language, setLanguage }
}

export type { Language }
