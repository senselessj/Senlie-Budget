'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useInsights, useHomeSummary, useHaptic } from '@/hooks/use-senlie-data'
import { useSenlieUI } from '@/lib/store'
import { formatMoney, maskBalance } from '@/lib/currency'
import { AnimatedNumber } from '@/components/senlie/animated-number'
import { InsightsHeroCard } from '@/components/senlie/insights-hero-card'
import { InsightsCategoryBars } from '@/components/senlie/insights-category-bars'
import {
  InsightsTimelineChart,
  TimelineLegend,
} from '@/components/senlie/insights-timeline-chart'
import { InsightsCards } from '@/components/senlie/insights-cards'
import { useT } from '@/hooks/use-t'

// ---------------------------------------------------------------------------
// Insights tab — monthly spend narrative for Senlie Budget.
// Layout (top → bottom):
//   1. Header — "Insights" (30px bold) + month name (15px muted)
//   2. Hero card — gradient premium card with direction + delta headline
//   3. Spending breakdown — horizontal category bars (sorted desc)
//   4. Spending timeline — Recharts line chart (this month vs last month)
//   5. Senlie Insights cards — stacked insight cards with optional detail
//   6. Monthly totals footer — compact This month / Last month card
// ---------------------------------------------------------------------------
export function InsightsTab() {
  const hideBalances = useSenlieUI((s) => s.hideBalances)
  const t = useT()
  const { data, isLoading, isError, refetch } = useInsights()

  // Pull currency symbol from the cached home summary — fallback to RD$.
  const home = useHomeSummary()
  const symbol = home.data?.user.currencySymbol || 'RD$'

  // ---------- Loading ----------
  if (isLoading) {
    return <InsightsSkeleton />
  }

  // ---------- Error ----------
  if (isError) {
    return <InsightsError onRetry={() => refetch()} />
  }

  // ---------- Empty ----------
  if (!data || (data.totalSpent === 0 && data.categoryBreakdown.length === 0)) {
    return <InsightsEmpty />
  }

  return (
    <div className="mx-auto max-w-md px-5 py-6 space-y-5">
      {/* 1. Header */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-[30px] font-bold tracking-tight text-foreground">
          {t('insights.title')}
        </h1>
        <p className="text-[15px] text-muted-foreground">
          {t(`month.${data.month}`)}
        </p>
      </motion.header>

      {/* 2. Hero card */}
      <InsightsHeroCard data={data} symbol={symbol} hideBalances={hideBalances} />

      {/* 3. Spending breakdown */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[20px] font-semibold tracking-tight text-foreground">
            {t('insights.spendingByCategory')}
          </h2>
        </div>
        <InsightsCategoryBars
          categories={data.categoryBreakdown}
          symbol={symbol}
          hideBalances={hideBalances}
        />
      </section>

      {/* 4. Spending timeline */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[20px] font-semibold tracking-tight text-foreground">
            {t('insights.spendingTimeline')}
          </h2>
          <TimelineLegend />
        </div>
        <InsightsTimelineChart
          timeline={data.timeline}
          symbol={symbol}
          hideBalances={hideBalances}
        />
      </section>

      {/* 5. Senlie Insights cards */}
      {data.insightCards.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[20px] font-semibold tracking-tight text-foreground">
              {t('insights.insights')}
            </h2>
            <span className="tnum text-[12px] text-muted-foreground">
              {data.insightCards.length}
            </span>
          </div>
          <InsightsCards cards={data.insightCards} />
        </section>
      )}

      {/* 6. Monthly totals footer */}
      <InsightsMonthlyTotals
        thisMonth={data.totalSpent}
        lastMonth={data.lastMonthSpent}
        symbol={symbol}
        hideBalances={hideBalances}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Monthly totals — compact two-column footer card
// ---------------------------------------------------------------------------
function InsightsMonthlyTotals({
  thisMonth,
  lastMonth,
  symbol,
  hideBalances,
}: {
  thisMonth: number
  lastMonth: number
  symbol: string
  hideBalances: boolean
}) {
  const t = useT()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="bg-card shadow-card rounded-[20px] p-5"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('insights.thisMonth')}
          </div>
          {hideBalances ? (
            <span className="tnum text-[17px] font-semibold tracking-tight text-foreground">
              {maskBalance(symbol)}
            </span>
          ) : (
            <AnimatedNumber
              value={thisMonth}
              format={(n) => formatMoney(n, { symbol, decimalPlaces: 0 })}
              className="tnum text-[17px] font-semibold tracking-tight text-foreground"
            />
          )}
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('insights.lastMonth')}
          </div>
          <span className="tnum text-[17px] font-semibold tracking-tight text-muted-foreground">
            {hideBalances ? maskBalance(symbol) : formatMoney(lastMonth, { symbol, decimalPlaces: 0 })}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton — mirrors the real layout
// ---------------------------------------------------------------------------
function InsightsSkeleton() {
  return (
    <div className="mx-auto max-w-md px-5 py-6 space-y-5">
      {/* Header */}
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-32 rounded-md" />
        <Skeleton className="h-4 w-20 rounded-md" />
      </div>

      {/* Hero */}
      <Skeleton className="h-48 w-full rounded-[22px]" />

      {/* Section header */}
      <Skeleton className="h-5 w-44 rounded-md" />
      {/* Breakdown — 4 bar rows */}
      <Skeleton className="h-56 w-full rounded-[20px]" />

      {/* Section header */}
      <Skeleton className="h-5 w-36 rounded-md" />
      {/* Timeline */}
      <Skeleton className="h-56 w-full rounded-[20px]" />

      {/* Section header */}
      <Skeleton className="h-5 w-20 rounded-md" />
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-[18px]" />
        <Skeleton className="h-20 w-full rounded-[18px]" />
        <Skeleton className="h-20 w-full rounded-[18px]" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error state — calm, actionable
// ---------------------------------------------------------------------------
function InsightsError({ onRetry }: { onRetry: () => void }) {
  const haptic = useHaptic()
  const t = useT()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <RotateCcw size={20} strokeWidth={2.2} />
      </div>
      <p className="text-[15px] font-medium text-foreground">
        {t('insights.couldntLoad')}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {t('insights.tryAgain')}
      </p>
      <button
        type="button"
        onClick={() => {
          haptic('light')
          onRetry()
        }}
        className="mt-5 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white shadow-card transition-transform active:scale-[0.98]"
        style={{ backgroundColor: 'var(--senlie)' }}
      >
        {t('insights.retry')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state — first-time / no transactions
// ---------------------------------------------------------------------------
function InsightsEmpty() {
  const haptic = useHaptic()
  const t = useT()
  const setAddSheetOpen = useSenlieUI((s) => s.setAddSheetOpen)
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Sparkles size={26} strokeWidth={1.8} />
      </div>
      <p className="text-[17px] font-semibold tracking-tight text-foreground">
        {t('insights.nothingToAnalyze')}
      </p>
      <p className="mt-1.5 max-w-[260px] text-[14px] leading-relaxed text-muted-foreground">
        {t('insights.addFewTransactions')}
      </p>
      <button
        type="button"
        onClick={() => {
          haptic('light')
          setAddSheetOpen(true)
        }}
        className="mt-6 rounded-full px-5 py-2.5 text-[14px] font-semibold text-white shadow-card transition-transform active:scale-[0.98]"
        style={{ backgroundColor: 'var(--senlie)' }}
      >
        {t('insights.addTransaction')}
      </button>
    </div>
  )
}
