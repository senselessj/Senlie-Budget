'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  makeNavigationSnapshot,
  SENLIE_HISTORY_KEY,
  setSenlieHistoryBridgeReady,
  useSenlieUI,
  type SenlieNavigationSnapshot,
} from '@/lib/store'

const ROOT_KEY = '__senlieRoot'
const EXIT_WINDOW_MS = 1800

function rootSnapshot(snapshot: SenlieNavigationSnapshot): SenlieNavigationSnapshot {
  return {
    ...snapshot,
    addSheetOpen: false,
    editingTransactionId: null,
    editingGoalId: null,
    settingsOpen: false,
    settingsView: null,
    addEntityType: null,
    selectedTransactionId: null,
    activityFilterOpen: false,
  }
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  return window.matchMedia?.('(display-mode: standalone)').matches || iosStandalone
}

/**
 * Gives the installed PWA/TWA a native-feeling navigation stack.
 *
 * - Android system Back / iOS history gestures close the top sheet first.
 * - Then they walk through settings sub-views / previous Senlie tabs.
 * - At the app root, the first Back press is guarded; a second quick press
 *   requests that the standalone host close instead of accidentally dumping
 *   the user out on the first tap.
 */
export function AppNavigationGuard() {
  const restoreNavigation = useSenlieUI((s) => s.restoreNavigation)
  React.useEffect(() => {
    const initial = rootSnapshot(makeNavigationSnapshot(useSenlieUI.getState()))

    const installed = isStandalone()

    if (installed) {
      // Keep a base entry plus an app-owned entry. This makes the first Android
      // Back action observable by the installed app instead of closing TWA.
      window.history.replaceState(
        { [ROOT_KEY]: true, snapshot: initial },
        '',
        window.location.href
      )
      window.history.pushState(
        { [SENLIE_HISTORY_KEY]: true, snapshot: initial },
        '',
        window.location.href
      )
    } else {
      // In a normal browser tab, use the current entry as Senlie's root so a
      // single browser Back can still leave the site when no in-app history remains.
      window.history.replaceState(
        { [SENLIE_HISTORY_KEY]: true, snapshot: initial },
        '',
        window.location.href
      )
    }

    setSenlieHistoryBridgeReady(true)
    let lastExitAttempt = 0

    const onPopState = (event: PopStateEvent) => {
      const state = event.state

      if (state?.[SENLIE_HISTORY_KEY] && state.snapshot) {
        restoreNavigation(state.snapshot as SenlieNavigationSnapshot)
        return
      }

      if (state?.[ROOT_KEY]) {
        restoreNavigation((state.snapshot ?? initial) as SenlieNavigationSnapshot)

        // On a normal browser tab, don't aggressively trap the user's browser
        // history. The double-back guard is specifically for installed app mode.
        if (!installed) return

        const now = Date.now()
        if (now - lastExitAttempt <= EXIT_WINDOW_MS) {
          lastExitAttempt = 0
          // Ask the standalone host to close. Some hosts ignore window.close()
          // for pages they did not open via script, so fall back to one more
          // history.back(). In a TWA that final back reaches the host/root and
          // lets Android finish the activity normally.
          window.close()
          window.setTimeout(() => window.history.back(), 50)
          return
        }

        lastExitAttempt = now
        const currentLanguage = useSenlieUI.getState().language
        toast.message(currentLanguage === 'es' ? 'Presiona atrás otra vez para salir' : 'Press back again to exit')
        window.history.pushState(
          { [SENLIE_HISTORY_KEY]: true, snapshot: initial },
          '',
          window.location.href
        )
      }
    }

    window.addEventListener('popstate', onPopState)
    return () => {
      setSenlieHistoryBridgeReady(false)
      window.removeEventListener('popstate', onPopState)
    }
  }, [restoreNavigation])

  return null
}
