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

// What kind of entity the AddEntitySheet is creating.
export type AddEntityType = 'category' | 'account' | 'goal' | 'recurring'

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
    (set) => ({
      activeTab: 'home',
      setActiveTab: (t) => set({ activeTab: t }),

      hideBalances: false,
      toggleHideBalances: () => set((s) => ({ hideBalances: !s.hideBalances })),
      setHideBalances: (v) => set({ hideBalances: v }),

      language: 'en',
      setLanguage: (l) => set({ language: l }),

      addSheetOpen: false,
      setAddSheetOpen: (v) => set({ addSheetOpen: v }),

      editingTransactionId: null,
      setEditingTransactionId: (id) => set({ editingTransactionId: id }),

      settingsOpen: false,
      setSettingsOpen: (v) =>
        set((s) => ({ settingsOpen: v, ...(v ? {} : { settingsView: null }) })),

      settingsView: null,
      setSettingsView: (v) => set({ settingsView: v }),
      openSettingsView: (v) => set({ settingsOpen: true, settingsView: v }),

      addEntityType: null,
      openAddEntity: (t) => set({ addEntityType: t }),
      closeAddEntity: () => set({ addEntityType: null }),

      selectedTransactionId: null,
      setSelectedTransactionId: (id) => set({ selectedTransactionId: id }),

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
