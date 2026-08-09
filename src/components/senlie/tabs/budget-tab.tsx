'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, RotateCcw, Wallet } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useBudgetSummary, useHomeSummary, useHaptic } from '@/hooks/use-senlie-data'
import { useSenlieUI } from '@/lib/store'
import { BudgetHeaderCard } from '@/components/senlie/budget-header-card'
import { BudgetCategoryRow } from '@/components/senlie/budget-category-row'
import { BudgetUnassignedCard } from '@/components/senlie/budget-unassigned-card'
import { useT } from '@/hooks/use-t'

// ---------------------------------------------------------------------------
// Budget tab — premium monthly budget overview.
// Layout (top → bottom):
//   1. Header card — "August Budget", hero "RD$X left", horizontal gradient
//      progress + knob, Available / Spent columns, status pill.
//   2. Rollover indicator strip (only if rolloverEnabled).
//   3. "Categories" section header with count badge.
//   4. Category list — staggered card entrance, animated bar fills.
//   5. Footer hint — "Tap a category to see transactions."
//   6. Unassigned money module (only if income > committed).
// ---------------------------------------------------------------------------
export function BudgetTab() {
  const hideBalances = useSenlieUI((s) => s.hideBalances)
  const t = useT()
  const { data, isLoading, isError, refetch } = useBudgetSummary()

  // Pull currency symbol from the cached home summary — fallback to RD$.
  const home = useHomeSummary()
  const symbol = home.data?.user.currencySymbol || 'RD$'

  // ---------- Loading ----------
  if (isLoading) {
    return <BudgetSkeleton />
  }

  // ---------- Error ----------
  if (isError) {
    return <BudgetError onRetry={() => refetch()} />
  }

  // ---------- Empty ----------
  if (!data) {
    return <BudgetEmpty />
  }

  const unassigned = Math.max(0, data.income - data.committed)
  const showUnassigned = unassigned > 0

  return (
    <div className="mx-auto max-w-md px-5 py-6 space-y-5">
      {/* 1. Header card */}
      <BudgetHeaderCard data={data} symbol={symbol} hideBalances={hideBalances} />

      {/* 2. Rollover indicator strip */}
      {data.rolloverEnabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-2 px-1"
        >
          <RefreshCw size={13} strokeWidth={2.2} className="shrink-0 text-muted-foreground" />
          <p className="text-[12px] leading-snug text-muted-foreground">
            {t('budget.rolloverEnabled')}
          </p>
        </motion.div>
      )}

      {/* 3. Section header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <h2 className="text-[20px] font-semibold tracking-tight text-foreground">
          {t('budget.categories')}
        </h2>
        <span className="tnum text-[12px] text-muted-foreground">
          {data.categories.length}
        </span>
      </div>

      {/* 4. Category list */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="space-y-3"
      >
        {data.categories.map((row, i) => (
          <BudgetCategoryRow
            key={row.id}
            row={row}
            symbol={symbol}
            hideBalances={hideBalances}
            index={i}
          />
        ))}
      </motion.div>

      {/* 5. Footer hint */}
      <p className="py-4 text-center text-[12px] text-muted-foreground">
        {t('budget.tapCategory')}
      </p>

      {/* 6. Unassigned money module (optional) */}
      {showUnassigned && (
        <BudgetUnassignedCard
          amount={unassigned}
          symbol={symbol}
          hideBalances={hideBalances}
          delay={0.05}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton — mirrors the real layout
// ---------------------------------------------------------------------------
function BudgetSkeleton() {
  return (
    <div className="mx-auto max-w-md px-5 py-6 space-y-5">
      <Skeleton className="h-56 w-full rounded-[22px]" />
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[18px]" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error state — calm, actionable
// ---------------------------------------------------------------------------
function BudgetError({ onRetry }: { onRetry: () => void }) {
  const haptic = useHaptic()
  const t = useT()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <RotateCcw size={20} strokeWidth={2.2} />
      </div>
      <p className="text-[15px] font-medium text-foreground">
        {t('budget.couldntLoad')}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">{t('budget.tryAgain')}</p>
      <button
        type="button"
        onClick={() => {
          haptic('light')
          onRetry()
        }}
        className="mt-5 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white shadow-card transition-transform active:scale-[0.98]"
        style={{ backgroundColor: 'var(--senlie)' }}
      >
        {t('budget.retry')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state — first-time setup
// ---------------------------------------------------------------------------
function BudgetEmpty() {
  const haptic = useHaptic()
  const t = useT()
  const openSettingsView = useSenlieUI((s) => s.openSettingsView)
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Wallet size={28} strokeWidth={1.8} />
      </div>
      <p className="text-[17px] font-semibold tracking-tight">
        {t('budget.setupFirst')}
      </p>
      <p className="mt-1.5 max-w-[260px] text-[14px] leading-relaxed text-muted-foreground">
        {t('budget.setupDesc')}
      </p>
      <button
        type="button"
        onClick={() => {
          haptic('light')
          openSettingsView('budgetPrefs')
        }}
        className="mt-6 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white shadow-card transition-transform active:scale-[0.98]"
        style={{ backgroundColor: 'var(--senlie)' }}
      >
        {t('budget.createBudget')}
      </button>
    </div>
  )
}
