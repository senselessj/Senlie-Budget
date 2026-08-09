'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSenlieUI } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { AuthScreen } from '@/components/senlie/auth-screen'
import { OnboardingFlow } from '@/components/senlie/onboarding-flow'
import { BottomTabBar } from '@/components/senlie/bottom-tab-bar'
import { SenlieFooter } from '@/components/senlie/senlie-footer'
import { HomeTab } from '@/components/senlie/tabs/home-tab'
import { ActivityTab } from '@/components/senlie/tabs/activity-tab'
import { BudgetTab } from '@/components/senlie/tabs/budget-tab'
import { InsightsTab } from '@/components/senlie/tabs/insights-tab'
import { AddTransactionSheet } from '@/components/senlie/add-transaction-sheet'
import { TransactionDetailSheet } from '@/components/senlie/transaction-detail-sheet'
import { SettingsSheet } from '@/components/senlie/settings-sheet'
import { AddEntitySheet } from '@/components/senlie/add-entity-sheet'
import { AppNavigationGuard } from '@/components/pwa/app-navigation-guard'
import { EditGoalSheet } from '@/components/senlie/edit-goal-sheet'
import { BiometricLockGate } from '@/components/senlie/biometric-lock-gate'
import { AppWalkthrough } from '@/components/senlie/app-walkthrough'

export default function Home() {
  const activeTab = useSenlieUI((s) => s.activeTab)
  const user = useAuth((s) => s.user)
  const initialized = useAuth((s) => s.initialized)
  const initialize = useAuth((s) => s.initialize)
  const setLanguage = useSenlieUI((s) => s.setLanguage)
  const language = useSenlieUI((s) => s.language)
  const addSheetOpen = useSenlieUI((s) => s.addSheetOpen)
  const editingTransactionId = useSenlieUI((s) => s.editingTransactionId)
  const editingGoalId = useSenlieUI((s) => s.editingGoalId)
  const settingsOpen = useSenlieUI((s) => s.settingsOpen)
  const addEntityType = useSenlieUI((s) => s.addEntityType)
  const selectedTransactionId = useSenlieUI((s) => s.selectedTransactionId)
  const activityFilterOpen = useSenlieUI((s) => s.activityFilterOpen)

  const appSheetOpen = Boolean(
    addSheetOpen ||
    editingTransactionId ||
    editingGoalId ||
    settingsOpen ||
    addEntityType ||
    selectedTransactionId ||
    activityFilterOpen
  )

  // Restore the Supabase browser session before deciding whether to show
  // authentication, onboarding, or the budget UI.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  React.useEffect(() => { initialize().catch(() => {}) }, [initialize])
  React.useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = language
    document.documentElement.dir = 'ltr'
  }, [language])
  React.useEffect(() => {
    if (!user?.onboardingComplete) return
    setLanguage(user.language)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = user.language
      document.documentElement.dir = 'ltr'
    }
  }, [user?.id, user?.onboardingComplete, user?.language, setLanguage])

  if (!mounted || !initialized) {
    return <div className="min-h-screen bg-background" />
  }

  if (!user) {
    return <AuthScreen />
  }

  if (!user.onboardingComplete) {
    return <OnboardingFlow />
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background">
      <AppNavigationGuard />
      <BiometricLockGate />
      <AppWalkthrough />
      <main className="flex-1 pb-32 pt-[env(safe-area-inset-top)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab === 'home' && <HomeTab />}
            {activeTab === 'activity' && <ActivityTab />}
            {activeTab === 'budget' && <BudgetTab />}
            {activeTab === 'insights' && <InsightsTab />}
          </motion.div>
        </AnimatePresence>
        <SenlieFooter />
      </main>

      {!appSheetOpen && <BottomTabBar />}

      {/* Sheets — detail renders underneath the editor so Back can reveal it. */}
      <TransactionDetailSheet />
      <AddTransactionSheet />
      <SettingsSheet />
      <AddEntitySheet />
      <EditGoalSheet />
    </div>
  )
}
