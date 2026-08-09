'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/lib/i18n'

export type TabKey = 'home' | 'activity' | 'budget' | 'insights'

// Which sub-view is open inside the Settings sheet.
export type SettingsView =
  | null
  | 'accounts'
  | 'categories'
  | 'recurring'
  | 'goals'
  | 'currency'
  | 'paySchedule'
  | 'startOfMonth'
  | 'budgetPrefs'
  | 'notifications'
  | 'export'
  | 'language'
  | 'legal'
  | 'profile'

// What kind of entity the AddEntitySheet is creating.
export type AddEntityType = 'category' | 'account' | 'goal' | 'recurring'

export interface SenlieNavigationSnapshot {
  activeTab: TabKey
  addSheetOpen: boolean
  editingTransactionId: string | null
  editingGoalId: string | null
  settingsOpen: boolean
  settingsView: SettingsView
  addEntityType: AddEntityType | null
  selectedTransactionId: string | null
  activityFilterOpen: boolean
}

export const SENLIE_HISTORY_KEY = '__senlieNavigation'
let historyBridgeReady = false

export function setSenlieHistoryBridgeReady(ready: boolean) {
  historyBridgeReady = ready
}

export function makeNavigationSnapshot(state: SenlieUIState): SenlieNavigationSnapshot {
  return {
    activeTab: state.activeTab,
    addSheetOpen: state.addSheetOpen,
    editingTransactionId: state.editingTransactionId,
    editingGoalId: state.editingGoalId,
    settingsOpen: state.settingsOpen,
    settingsView: state.settingsView,
    addEntityType: state.addEntityType,
    selectedTransactionId: state.selectedTransactionId,
    activityFilterOpen: state.activityFilterOpen,
  }
}

function pushHistory(snapshot: SenlieNavigationSnapshot) {
  if (!historyBridgeReady || typeof window === 'undefined') return
  window.history.pushState({ [SENLIE_HISTORY_KEY]: true, snapshot }, '', window.location.href)
}

function requestHistoryBack(fallback: () => void, steps = 1) {
  if (
    historyBridgeReady &&
    typeof window !== 'undefined' &&
    (window.history.state?.[SENLIE_HISTORY_KEY] || window.history.state?.__senlieRoot)
  ) {
    window.history.go(-Math.max(1, steps))
    return
  }
  fallback()
}

interface SenlieUIState {
  activeTab: TabKey
  setActiveTab: (t: TabKey) => void

  hideBalances: boolean
  toggleHideBalances: () => void
  setHideBalances: (v: boolean) => void

  language: Language
  setLanguage: (l: Language) => void

  addSheetOpen: boolean
  setAddSheetOpen: (v: boolean) => void

  // Transaction being edited (if any). When set, AddTransactionSheet opens in edit mode.
  editingTransactionId: string | null
  setEditingTransactionId: (id: string | null) => void

  editingGoalId: string | null
  setEditingGoalId: (id: string | null) => void

  settingsOpen: boolean
  setSettingsOpen: (v: boolean) => void

  settingsView: SettingsView
  setSettingsView: (v: SettingsView) => void
  openSettingsView: (v: SettingsView) => void

  // Add-entity sheet (used by Settings sub-views)
  addEntityType: AddEntityType | null
  openAddEntity: (t: AddEntityType) => void
  closeAddEntity: () => void

  selectedTransactionId: string | null
  setSelectedTransactionId: (id: string | null) => void

  activityFilterOpen: boolean
  setActivityFilterOpen: (v: boolean) => void

  // Restores a UI snapshot from browser/app history without creating new history.
  restoreNavigation: (snapshot: SenlieNavigationSnapshot) => void

  // Preset filter for Activity tab (e.g. when tapping a budget category)
  activityPresetCategory: string | null
  setActivityPresetCategory: (id: string | null) => void

  // Advanced activity filters (from the filter sheet)
  activityAdvancedFilter: {
    amountMin: string
    amountMax: string
    dateFrom: string
    dateTo: string
    accountId: string | null
    categoryId: string | null
    recurringOnly: boolean
  } | null
  setActivityAdvancedFilter: (f: SenlieUIState['activityAdvancedFilter']) => void

  // bump this to force a refetch of all financial data after a mutation
  dataVersion: number
  bumpData: () => void
}

export const useSenlieUI = create<SenlieUIState>()(
  persist(
    (set, get) => ({
      activeTab: 'home',
      setActiveTab: (t) => {
        if (get().activeTab === t) return
        set({ activeTab: t })
        pushHistory(makeNavigationSnapshot(get()))
      },

      hideBalances: false,
      toggleHideBalances: () => set((s) => ({ hideBalances: !s.hideBalances })),
      setHideBalances: (v) => set({ hideBalances: v }),

      language: 'en',
      setLanguage: (l) => set({ language: l }),

      addSheetOpen: false,
      setAddSheetOpen: (v) => {
        if (v === get().addSheetOpen) return
        if (v) {
          set({ addSheetOpen: true })
          pushHistory(makeNavigationSnapshot(get()))
        } else {
          requestHistoryBack(() => set({ addSheetOpen: false }))
        }
      },

      editingTransactionId: null,
      setEditingTransactionId: (id) => {
        const current = get().editingTransactionId
        if (id === current) return
        if (id) {
          set({ editingTransactionId: id })
          pushHistory(makeNavigationSnapshot(get()))
        } else {
          requestHistoryBack(() => set({ editingTransactionId: null }))
        }
      },

      editingGoalId: null,
      setEditingGoalId: (id) => {
        const current = get().editingGoalId
        if (id === current) return
        if (id) {
          set({ editingGoalId: id })
          pushHistory(makeNavigationSnapshot(get()))
        } else {
          requestHistoryBack(() => set({ editingGoalId: null }))
        }
      },

      settingsOpen: false,
      setSettingsOpen: (v) => {
        const state = get()
        if (v === state.settingsOpen) return
        if (v) {
          set({ settingsOpen: true, settingsView: null })
          pushHistory(makeNavigationSnapshot(get()))
        } else {
          const steps = state.settingsView ? 2 : 1
          requestHistoryBack(
            () => set({ settingsOpen: false, settingsView: null, addEntityType: null }),
            steps
          )
        }
      },

      settingsView: null,
      setSettingsView: (v) => {
        const state = get()
        if (v === state.settingsView) return
        if (v) {
          set({ settingsView: v })
          pushHistory(makeNavigationSnapshot(get()))
        } else {
          requestHistoryBack(() => set({ settingsView: null }))
        }
      },
      openSettingsView: (v) => {
        const state = get()
        if (state.settingsOpen) {
          set({ settingsView: v })
          pushHistory(makeNavigationSnapshot(get()))
          return
        }

        // Direct links into a settings sub-view still get a logical Settings root
        // entry underneath them, so Android/iOS back returns naturally.
        set({ settingsOpen: true, settingsView: null })
        pushHistory(makeNavigationSnapshot(get()))
        set({ settingsView: v })
        pushHistory(makeNavigationSnapshot(get()))
      },

      addEntityType: null,
      openAddEntity: (t) => {
        if (get().addEntityType === t) return
        set({ addEntityType: t })
        pushHistory(makeNavigationSnapshot(get()))
      },
      closeAddEntity: () => {
        if (!get().addEntityType) return
        requestHistoryBack(() => set({ addEntityType: null }))
      },

      selectedTransactionId: null,
      setSelectedTransactionId: (id) => {
        const current = get().selectedTransactionId
        if (id === current) return
        if (id) {
          set({ selectedTransactionId: id })
          pushHistory(makeNavigationSnapshot(get()))
        } else {
          requestHistoryBack(() => set({ selectedTransactionId: null }))
        }
      },

      activityFilterOpen: false,
      setActivityFilterOpen: (v) => {
        if (v === get().activityFilterOpen) return
        if (v) {
          set({ activityFilterOpen: true })
          pushHistory(makeNavigationSnapshot(get()))
        } else {
          requestHistoryBack(() => set({ activityFilterOpen: false }))
        }
      },

      restoreNavigation: (snapshot) =>
        set({
          activeTab: snapshot.activeTab,
          addSheetOpen: snapshot.addSheetOpen,
          editingTransactionId: snapshot.editingTransactionId,
          editingGoalId: snapshot.editingGoalId,
          settingsOpen: snapshot.settingsOpen,
          settingsView: snapshot.settingsView,
          addEntityType: snapshot.addEntityType,
          selectedTransactionId: snapshot.selectedTransactionId,
          activityFilterOpen: snapshot.activityFilterOpen ?? false,
        }),

      activityPresetCategory: null,
      setActivityPresetCategory: (id) => set({ activityPresetCategory: id }),

      activityAdvancedFilter: null,
      setActivityAdvancedFilter: (f) => set({ activityAdvancedFilter: f }),

      dataVersion: 0,
      bumpData: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
    }),
    {
      name: 'senlie-ui',
      partialize: (s) => ({ hideBalances: s.hideBalances, language: s.language }),
    }
  )
)
