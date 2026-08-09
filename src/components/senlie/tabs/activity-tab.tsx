'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Search,
  SlidersHorizontal,
  ReceiptText,
  RotateCcw,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatMoney, maskBalance } from '@/lib/currency'
import { useActivity, useHomeSummary, useHaptic } from '@/hooks/use-senlie-data'
import { useSenlieUI } from '@/lib/store'
import type { ActivityGroup } from '@/lib/types'
import { ActivityTransactionRow } from '@/components/senlie/activity-transaction-row'
import { ActivityFilterSheet } from '@/components/senlie/activity-filter-sheet'
import { useT } from '@/hooks/use-t'

// ---------------------------------------------------------------------------
// Filter pills
// ---------------------------------------------------------------------------

type FilterKey = 'all' | 'expense' | 'income' | 'transfer'

const FILTER_PILL_KEYS: { key: FilterKey; labelKey: string }[] = [
  { key: 'all', labelKey: 'activity.filterAll' },
  { key: 'expense', labelKey: 'activity.filterExpenses' },
  { key: 'income', labelKey: 'activity.filterIncome' },
  { key: 'transfer', labelKey: 'activity.filterTransfers' },
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ActivityTab() {
  const haptic = useHaptic()
  const t = useT()
  const hideBalances = useSenlieUI((s) => s.hideBalances)
  const setAddSheetOpen = useSenlieUI((s) => s.setAddSheetOpen)
  const presetCategory = useSenlieUI((s) => s.activityPresetCategory)
  const setPresetCategory = useSenlieUI((s) => s.setActivityPresetCategory)
  const advancedFilter = useSenlieUI((s) => s.activityAdvancedFilter)
  const setAdvancedFilter = useSenlieUI((s) => s.setActivityAdvancedFilter)

  // Filter + search (debounced ~250ms)
  const [filter, setFilter] = React.useState<FilterKey>('all')
  const [searchInput, setSearchInput] = React.useState('')
  const [search, setSearch] = React.useState('')

  // Filter sheet (advanced filters)
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false)

  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250)
    return () => clearTimeout(t)
  }, [searchInput])

  // Pull currency symbol from home summary (cached) — fallback to RD$
  const home = useHomeSummary()
  const symbol = home.data?.user.currencySymbol || 'RD$'

  const { data: rawData, isLoading, isError, refetch } = useActivity(filter, search || undefined)

  // Apply preset category + advanced filters client-side
  const data = React.useMemo(() => {
    if (!rawData) return rawData
    let result = rawData

    // Preset category (from budget tab tap)
    if (presetCategory) {
      result = result
        .map((g) => ({
          ...g,
          transactions: g.transactions.filter((t) => t.categoryId === presetCategory),
        }))
        .filter((g) => g.transactions.length > 0)
    }

    // Advanced filters
    if (advancedFilter) {
      const { amountMin, amountMax, dateFrom, dateTo, accountId, categoryId, recurringOnly } = advancedFilter
      result = result
        .map((g) => ({
          ...g,
          transactions: g.transactions.filter((t) => {
            if (amountMin && t.amount < parseFloat(amountMin)) return false
            if (amountMax && t.amount > parseFloat(amountMax)) return false
            if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false
            if (dateTo && new Date(t.date) > new Date(dateTo + 'T23:59:59')) return false
            if (accountId && t.accountId !== accountId) return false
            if (categoryId && t.categoryId !== categoryId) return false
            if (recurringOnly && !t.recurringRuleId) return false
            return true
          }),
        }))
        .filter((g) => g.transactions.length > 0)
      // Recompute day totals
      result = result.map((g) => ({
        ...g,
        total: g.transactions
          .filter((t) => t.type !== 'transfer')
          .reduce((s, t) => s + (t.type === 'expense' ? -t.amount : t.amount), 0),
      }))
    }

    return result
  }, [rawData, presetCategory, advancedFilter])

  const activeFilterCount = advancedFilter
    ? [
        advancedFilter.amountMin,
        advancedFilter.amountMax,
        advancedFilter.dateFrom,
        advancedFilter.dateTo,
        advancedFilter.accountId,
        advancedFilter.categoryId,
        advancedFilter.recurringOnly,
      ].filter(Boolean).length
    : 0

  return (
    <div className="mx-auto max-w-md px-5 py-6 space-y-5">
      {/* 1. Header (plain — no glass) */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3"
      >
        <h1 className="text-[30px] font-bold tracking-tight">{t('activity.title')}</h1>
        <div className="relative">
          <Search
            size={17}
            strokeWidth={2.2}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            inputMode="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('activity.search')}
            aria-label={t('activity.search')}
            className="rounded-[14px] bg-card border-0 h-11 pl-10 pr-9 text-[15px] shadow-card placeholder:text-muted-foreground/80"
          />
          {searchInput.length > 0 && (
            <button
              type="button"
              onClick={() => {
                haptic('light')
                setSearchInput('')
              }}
              aria-label={t('activity.clearSearch')}
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={14} strokeWidth={2.4} />
            </button>
          )}
        </div>
      </motion.header>

      {/* Preset category banner */}
      {presetCategory && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-[14px] bg-[var(--senlie-soft)] px-4 py-2.5"
        >
          <span className="text-[13px] font-medium" style={{ color: 'var(--senlie)' }}>
            {t('activity.filteredByCategory')}
          </span>
          <button
            onClick={() => {
              haptic('light')
              setPresetCategory(null)
            }}
            className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground"
          >
            <X size={14} />
            {t('activity.clear')}
          </button>
        </motion.div>
      )}

      {/* Advanced filter banner */}
      {activeFilterCount > 0 && !presetCategory && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-[14px] bg-[var(--senlie-soft)] px-4 py-2.5"
        >
          <span className="text-[13px] font-medium" style={{ color: 'var(--senlie)' }}>
            {t('activity.filtersActive', { count: activeFilterCount })}
          </span>
          <button
            onClick={() => {
              haptic('light')
              setAdvancedFilter(null)
            }}
            className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground"
          >
            <X size={14} />
            {t('activity.clear')}
          </button>
        </motion.div>
      )}

      {/* 2. Filter pills (sticky) */}
      <div className="sticky top-0 z-10 -mx-5 border-b border-border/50 bg-background/80 px-5 py-3 backdrop-blur-md">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {FILTER_PILL_KEYS.map((p) => {
            const active = filter === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  haptic('light')
                  setFilter(p.key)
                }}
                aria-pressed={active}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-colors',
                  active
                    ? 'bg-foreground text-background'
                    : 'bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                {t(p.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Transaction list / states */}
      {isLoading ? (
        <ActivitySkeleton />
      ) : isError ? (
        <ActivityError onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        search || presetCategory || activeFilterCount > 0 ? (
          <NoResults query={search || 'filters'} onClear={() => {
            setSearchInput('')
            setPresetCategory(null)
            setAdvancedFilter(null)
          }} />
        ) : (
          <EmptyState onAdd={() => setAddSheetOpen(true)} />
        )
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {data.map((group, gi) => (
            <ActivityDayGroup
              key={group.date}
              group={group}
              symbol={symbol}
              hideBalances={hideBalances}
              startIndex={gi * 10}
            />
          ))}
        </motion.div>
      )}

      {/* 3. Floating Filter button — bottom-right, clears tab bar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center">
        <div className="flex w-full max-w-md justify-end px-5">
          <motion.button
            type="button"
            onClick={() => {
              haptic('light')
              setFilterSheetOpen(true)
            }}
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="pointer-events-auto flex h-12 items-center gap-2 rounded-full bg-card px-5 text-[13px] font-medium shadow-float"
            aria-label={t('activity.openFilters')}
          >
            <SlidersHorizontal size={20} strokeWidth={2.2} />
            {t('activity.filter')}
            {activeFilterCount > 0 && (
              <span
                className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                style={{ backgroundColor: 'var(--senlie)' }}
              >
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* 5. Filter sheet */}
      <ActivityFilterSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        onApply={(state) => {
          setAdvancedFilter({
            amountMin: state.amountMin,
            amountMax: state.amountMax,
            dateFrom: state.dateFrom,
            dateTo: state.dateTo,
            accountId: state.accountId,
            categoryId: state.categoryId,
            recurringOnly: state.recurringOnly,
          })
          setPresetCategory(null) // clear preset when applying advanced filters
        }}
        onReset={() => {
          setAdvancedFilter(null)
        }}
        initialState={advancedFilter}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Day group
// ---------------------------------------------------------------------------

function ActivityDayGroup({
  group,
  symbol,
  hideBalances,
  startIndex,
}: {
  group: ActivityGroup
  symbol: string
  hideBalances: boolean
  startIndex: number
}) {
  const total = group.total
  const isNegative = total < 0
  const isPositive = total > 0

  // Day total — signed, calm colors. Negative = foreground, positive = positive.
  // 0 → muted (no prefix).
  let totalNode: React.ReactNode
  if (hideBalances) {
    totalNode = (
      <span className="tnum text-[13px] font-semibold text-muted-foreground">
        {maskBalance(symbol)}
      </span>
    )
  } else if (total === 0) {
    totalNode = (
      <span className="tnum text-[13px] font-semibold text-muted-foreground">
        {formatMoney(0, { symbol, decimalPlaces: 0 })}
      </span>
    )
  } else {
    const prefix = isNegative ? '-' : '+'
    const cls = isPositive ? 'text-positive' : 'text-foreground'
    totalNode = (
      <span className={cn('tnum text-[13px] font-semibold', cls)}>
        {prefix}
        {formatMoney(Math.abs(total), { symbol, decimalPlaces: 0 })}
      </span>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(startIndex * 0.005, 0.1), ease: [0.22, 1, 0.36, 1] }}
      className="space-y-1"
    >
      {/* Day header */}
      <div className="flex items-center justify-between px-1 pb-1 pt-0.5">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          {group.label}
        </h2>
        {totalNode}
      </div>
      {/* Transactions */}
      <div className="divide-y divide-border/40">
        {group.transactions.map((tx, i) => (
          <ActivityTransactionRow
            key={tx.id}
            tx={tx}
            symbol={symbol}
            hideBalances={hideBalances}
            index={startIndex + i}
          />
        ))}
      </div>
    </motion.section>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ActivitySkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((g) => (
        <div key={g} className="space-y-2">
          <div className="flex items-center justify-between px-1 pb-1">
            <Skeleton className="h-3.5 w-20 rounded-md" />
            <Skeleton className="h-3.5 w-14 rounded-md" />
          </div>
          <div className="divide-y divide-border/40">
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex items-center gap-3 px-1 py-2.5">
                <Skeleton className="h-10 w-10 rounded-[14px]" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
                <Skeleton className="h-3.5 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state — calm, per spec section 44
// ---------------------------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const haptic = useHaptic()
  const t = useT()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center px-6 pt-20 pb-10 text-center"
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ReceiptText size={28} strokeWidth={1.8} />
      </div>
      <p className="text-[17px] font-semibold tracking-tight">{t('activity.nothingHere')}</p>
      <p className="mt-1.5 max-w-[260px] text-[14px] leading-relaxed text-muted-foreground">
        {t('activity.emptyDesc')}
      </p>
      <button
        type="button"
        onClick={() => {
          haptic('light')
          onAdd()
        }}
        className="mt-6 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white shadow-card transition-transform active:scale-[0.98]"
        style={{ backgroundColor: 'var(--senlie)' }}
      >
        {t('activity.addFirst')}
      </button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// No search results
// ---------------------------------------------------------------------------

function NoResults({ query, onClear }: { query: string; onClear: () => void }) {
  const haptic = useHaptic()
  const t = useT()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center px-6 pt-16 pb-10 text-center"
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Search size={26} strokeWidth={1.8} />
      </div>
      <p className="text-[17px] font-semibold tracking-tight">{t('activity.noResults', { query })}</p>
      <p className="mt-1.5 max-w-[260px] text-[14px] leading-relaxed text-muted-foreground">
        {t('activity.noResultsDesc')}
      </p>
      <button
        type="button"
        onClick={() => {
          haptic('light')
          onClear()
        }}
        className="mt-6 rounded-full bg-secondary px-5 py-2.5 text-[14px] font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80"
      >
        {t('activity.clearSearch')}
      </button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ActivityError({ onRetry }: { onRetry: () => void }) {
  const haptic = useHaptic()
  const t = useT()
  return (
    <div className="flex flex-col items-center px-6 pt-20 pb-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <RotateCcw size={20} strokeWidth={2.2} />
      </div>
      <p className="text-[15px] font-medium text-foreground">{t('activity.couldntLoad')}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {t('activity.retryDesc')}
      </p>
      <button
        type="button"
        onClick={() => {
          haptic('light')
          onRetry()
        }}
        className="mt-5 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white shadow-card"
        style={{ backgroundColor: 'var(--senlie)' }}
      >
        {t('activity.retry')}
      </button>
    </div>
  )
}
