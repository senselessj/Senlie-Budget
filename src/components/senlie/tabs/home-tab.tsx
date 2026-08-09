'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, RotateCcw } from 'lucide-react'
import { useHomeSummary, useHaptic } from '@/hooks/use-senlie-data'
import { useSenlieUI } from '@/lib/store'
import { useT } from '@/hooks/use-t'
import { formatMoney, maskBalance } from '@/lib/currency'
import { TODAY } from '@/lib/finance-utils'
import { AnimatedNumber } from '@/components/senlie/animated-number'
import { Skeleton } from '@/components/ui/skeleton'
import { HomeCurvedProgress } from '@/components/senlie/home-curved-progress'
import { HomeSnapshotRail } from '@/components/senlie/home-snapshot-rail'
import { HomeRecentActivity } from '@/components/senlie/home-recent-activity'
import { HomeSmartModules } from '@/components/senlie/home-smart-modules'
import { HomeSafeToSpend } from '@/components/senlie/home-safe-to-spend'
import { HomeNextPayday } from '@/components/senlie/home-next-payday'

// ----------------------------------------------------------------
// Greeting — anchored on the demo "today" (Aug 8, 2026 18:42 AST)
// so the demo always says "Good evening".
// ----------------------------------------------------------------
function greetingKey(): string {
  const h = TODAY.getHours() // 18
  if (h < 12) return 'home.greeting.morning'
  if (h < 18) return 'home.greeting.afternoon'
  return 'home.greeting.evening'
}

const STATUS_META: Record<
  'healthy' | 'warning' | 'exceeded',
  { labelKey: string; color: string }
> = {
  healthy: { labelKey: 'home.healthy', color: 'var(--senlie)' },
  warning: { labelKey: 'home.approaching', color: 'var(--warning)' },
  exceeded: { labelKey: 'home.over', color: 'var(--negative)' },
}

export function HomeTab() {
  const { data, isLoading, isError, refetch } = useHomeSummary()
  const hideBalances = useSenlieUI((s) => s.hideBalances)
  const toggleHideBalances = useSenlieUI((s) => s.toggleHideBalances)
  const setActiveTab = useSenlieUI((s) => s.setActiveTab)
  const setSettingsOpen = useSenlieUI((s) => s.setSettingsOpen)
  const haptic = useHaptic()
  const t = useT()

  // ---------- Loading ----------
  if (isLoading) {
    return <HomeSkeleton />
  }

  // ---------- Error ----------
  if (isError) {
    return (
      <HomeError onRetry={() => refetch()} />
    )
  }

  // ---------- Empty ----------
  if (!data) {
    return (
      <div className="mx-auto max-w-md px-5 py-10">
        <p className="text-[15px] text-muted-foreground">
          {t('home.empty')}
        </p>
      </div>
    )
  }

  const symbol = data.user.currencySymbol || 'RD$'
  const firstName = data.user.name.split(' ')[0] || data.user.name
  const monthLabel = t(`month.${TODAY.getMonth() + 1}`)
  const yearLabel = TODAY.getFullYear() // 2026
  const dateLabel = `${monthLabel} ${yearLabel}`

  const budgetRatio = data.budgetTotal > 0 ? data.budgetSpent / data.budgetTotal : 0
  const percentUsed = Math.round(budgetRatio * 100)
  const statusMeta = STATUS_META[data.budgetStatus]

  return (
    <div className="mx-auto max-w-md px-5 py-6 space-y-6">
      {/* 1. Header */}
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between"
      >
        <div className="min-w-0">
          <h1 className="truncate text-[24px] font-semibold tracking-tight">
            {t(greetingKey())}, {firstName}
          </h1>
          <p className="text-[13px] text-muted-foreground">{dateLabel}</p>
        </div>
        <button
          type="button"
          data-tour="settings"
          onClick={() => {
            haptic('light')
            setSettingsOpen(true)
          }}
          aria-label={t('home.openSettings')}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-white shadow-card"
          style={{ backgroundColor: data.user.avatarColor, boxShadow: '0 0 0 2px var(--background), 0 0 0 4px rgba(0,0,0,0.06)' }}
        >
          {data.user.avatarUrl ? (
            <img src={data.user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            firstName.charAt(0).toUpperCase()
          )}
        </button>
      </motion.header>

      {/* 2. Available to spend (hero) */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          data-tour="available"
          onClick={() => {
            haptic('light')
            toggleHideBalances()
          }}
          className="flex w-full flex-col items-start text-left"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] text-muted-foreground">{t('home.availableToSpend')}</span>
            {hideBalances ? (
              <EyeOff size={14} strokeWidth={2.2} className="text-muted-foreground" />
            ) : (
              <Eye size={14} strokeWidth={2.2} className="text-muted-foreground" />
            )}
          </div>

          {hideBalances ? (
            <span className="mt-0.5 text-[42px] font-semibold leading-none tracking-tight tnum text-foreground">
              {maskBalance(symbol)}
            </span>
          ) : (
            <AnimatedNumber
              value={data.available}
              format={(n) => formatMoney(n, { symbol, decimalPlaces: 0 })}
              className="mt-0.5 text-[42px] font-semibold leading-none tracking-tight tnum text-foreground"
            />
          )}

          <p className="mt-2 text-[13px] text-muted-foreground">
            {hideBalances
              ? t('home.committedOf', {
                  committed: maskBalance(symbol),
                  income: maskBalance(symbol),
                })
              : t('home.committedOf', {
                  committed: formatMoney(data.committed, { symbol, decimalPlaces: 0 }),
                  income: formatMoney(data.incomeTarget, { symbol, decimalPlaces: 0 }),
                })}
          </p>
        </button>
      </motion.section>

      {/* 3. Monthly status card */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="bg-card shadow-card rounded-[22px] p-6"
      >
        {/* Title row */}
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-medium text-foreground">{monthLabel}</span>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: statusMeta.color }}
            />
            <span className="text-[12px] font-medium text-muted-foreground">
              {t(statusMeta.labelKey)}
            </span>
          </div>
        </div>

        {/* Arc */}
        <div className="mt-2 flex justify-center">
          <HomeCurvedProgress
            progress={budgetRatio}
            status={data.budgetStatus}
            percentLabel={`${percentUsed}%`}
          />
        </div>

        {/* Caption */}
        <p className="mt-1 text-center text-[14px] text-muted-foreground">
          {t('home.monthBudgetUsed', { percent: percentUsed })}
        </p>

        {/* Bottom row */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('home.spent')}</div>
            <div className="tnum text-[16px] font-semibold tracking-tight text-foreground">
              {hideBalances
                ? maskBalance(symbol)
                : formatMoney(data.budgetSpent, { symbol, decimalPlaces: 0 })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('home.remaining')}</div>
            <div className="tnum text-[16px] font-semibold tracking-tight text-foreground">
              {hideBalances
                ? maskBalance(symbol)
                : formatMoney(data.budgetRemaining, { symbol, decimalPlaces: 0 })}
            </div>
          </div>
        </div>
      </motion.section>

      {/* 4. Snapshot rail */}
      <HomeSnapshotRail
        snapshots={data.snapshots}
        symbol={symbol}
        hideBalances={hideBalances}
      />

      {/* 5. Recent activity */}
      <HomeRecentActivity
        transactions={data.recentTransactions}
        symbol={symbol}
        hideBalances={hideBalances}
        onSeeAll={() => {
          haptic('light')
          setActiveTab('activity')
        }}
      />

      {/* 6. Smart modules */}
      <HomeSmartModules
        modules={data.smartModules}
        symbol={symbol}
        hideBalances={hideBalances}
      />

      {/* 7. Safe to spend */}
      <HomeSafeToSpend
        perDay={data.safeToSpend.perDay}
        total={data.safeToSpend.total}
        daysLeft={data.safeToSpend.daysLeft}
        symbol={symbol}
        hideBalances={hideBalances}
      />

      {/* 8. Next payday */}
      <HomeNextPayday
        nextPayDate={data.paySchedule.nextPayDate}
        nextPayAmount={data.paySchedule.nextPayAmount}
        symbol={symbol}
        hideBalances={hideBalances}
      />
    </div>
  )
}

// ----------------------------------------------------------------
// Loading skeleton — mirrors the real layout
// ----------------------------------------------------------------
function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-md px-5 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44 rounded-md" />
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-10 w-56 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>

      <Skeleton className="h-64 w-full rounded-[22px]" />

      <div className="-mx-5 flex gap-3 overflow-hidden px-5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-[140px] shrink-0 rounded-[18px]" />
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded-md" />
        <Skeleton className="h-44 w-full rounded-[20px]" />
      </div>

      <Skeleton className="h-32 w-full rounded-[18px]" />
      <Skeleton className="h-28 w-full rounded-[18px]" />
    </div>
  )
}

// ----------------------------------------------------------------
// Error state — calm, actionable
// ----------------------------------------------------------------
function HomeError({ onRetry }: { onRetry: () => void }) {
  const haptic = useHaptic()
  const t = useT()
  return (
    <div className="mx-auto max-w-md px-5 py-16 flex flex-col items-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <RotateCcw size={20} strokeWidth={2.2} />
      </div>
      <p className="text-[15px] font-medium text-foreground">{t('home.couldntLoad')}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {t('home.retryDesc')}
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
        {t('home.retry')}
      </button>
    </div>
  )
}
