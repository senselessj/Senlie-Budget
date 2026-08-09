'use client'

import { useQuery } from '@tanstack/react-query'
import { useSenlieUI } from '@/lib/store'
import type {
  HomeSummary,
  ActivityGroup,
  BudgetSummary,
  InsightsSummary,
  RecurringItem,
  GoalRow,
} from '@/lib/types'

// All hooks refetch when `dataVersion` bumps (after a mutation).
// They are staleTime: 0 so they always revalidate on focus/mount.

export function useHomeSummary() {
  const dataVersion = useSenlieUI((s) => s.dataVersion)
  return useQuery<HomeSummary>({
    queryKey: ['senlie', 'home', dataVersion],
    queryFn: async () => {
      const res = await fetch('/api/budget/home', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load home')
      return res.json()
    },
    staleTime: 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })
}

export function useActivity(filter: 'all' | 'expense' | 'income' | 'transfer' = 'all', search?: string) {
  const dataVersion = useSenlieUI((s) => s.dataVersion)
  return useQuery<ActivityGroup[]>({
    queryKey: ['senlie', 'activity', filter, search ?? '', dataVersion],
    queryFn: async () => {
      const params = new URLSearchParams({ filter })
      if (search) params.set('q', search)
      const res = await fetch(`/api/budget/activity?${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load activity')
      return res.json()
    },
    staleTime: 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })
}

export function useBudgetSummary() {
  const dataVersion = useSenlieUI((s) => s.dataVersion)
  return useQuery<BudgetSummary>({
    queryKey: ['senlie', 'budget', dataVersion],
    queryFn: async () => {
      const res = await fetch('/api/budget/budget', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load budget')
      return res.json()
    },
    staleTime: 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })
}

export function useInsights() {
  const dataVersion = useSenlieUI((s) => s.dataVersion)
  return useQuery<InsightsSummary>({
    queryKey: ['senlie', 'insights', dataVersion],
    queryFn: async () => {
      const res = await fetch('/api/budget/insights', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load insights')
      return res.json()
    },
    staleTime: 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })
}

export function useRecurring() {
  const dataVersion = useSenlieUI((s) => s.dataVersion)
  return useQuery<RecurringItem[]>({
    queryKey: ['senlie', 'recurring', dataVersion],
    queryFn: async () => {
      const res = await fetch('/api/budget/recurring', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load recurring')
      return res.json()
    },
    staleTime: 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })
}

export function useGoals() {
  const dataVersion = useSenlieUI((s) => s.dataVersion)
  return useQuery<GoalRow[]>({
    queryKey: ['senlie', 'goals', dataVersion],
    queryFn: async () => {
      const res = await fetch('/api/budget/goals', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load goals')
      return res.json()
    },
    staleTime: 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })
}

export function useAccountsAndCategories(type?: 'expense' | 'income' | 'transfer') {
  const dataVersion = useSenlieUI((s) => s.dataVersion)
  return useQuery<{
    accounts: Array<{ id: string; name: string; type: string; color: string; icon: string; currentBalance: number }>
    categories: Array<{
      id: string
      name: string
      rawName?: string
      icon: string
      color: string
      type: string
      isSystem?: boolean
      sortOrder?: number
    }>
  }>({
    queryKey: ['senlie', 'pickers', type ?? 'all', dataVersion],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (type) params.set('type', type)
      const res = await fetch(`/api/budget/accounts?${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load pickers')
      return res.json()
    },
    staleTime: 0,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  })
}

// haptics — no-op on web, but structured for future native bridge
export function useHaptic() {
  return (intensity: 'light' | 'medium' | 'success' | 'warning' = 'light') => {
    if (typeof window === 'undefined') return
    try {
      const nav = navigator as any
      if (nav.vibrate) {
        const pattern =
          intensity === 'success'
            ? 12
            : intensity === 'warning'
              ? [10, 30, 10]
              : intensity === 'medium'
                ? 8
                : 4
        nav.vibrate(pattern)
      }
    } catch {
      /* ignore */
    }
  }
}
