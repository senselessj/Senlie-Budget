'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  Sparkles,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { formatMoney, maskBalance } from '@/lib/currency'
import { useT } from '@/hooks/use-t'
import type { HomeSummary } from '@/lib/types'

type SmartModules = HomeSummary['smartModules']

// Stacked column of contextual, data-driven insight cards.
// Each card is rendered only when its data exists.
export function HomeSmartModules({
  modules,
  symbol,
  hideBalances,
}: {
  modules: SmartModules
  symbol: string
  hideBalances: boolean
}) {
  const cards: React.ReactNode[] = []

  if (modules.upcoming.length > 0) {
    cards.push(
      <UpcomingBillsCard
        key="upcoming"
        items={modules.upcoming}
        symbol={symbol}
        hideBalances={hideBalances}
      />
    )
  }

  cards.push(
    <SpendingPaceCard key="pace" pace={modules.spendingPace} />
  )

  if (modules.budgetWarning) {
    cards.push(
      <BudgetWarningCard
        key="warning"
        warning={modules.budgetWarning}
        symbol={symbol}
        hideBalances={hideBalances}
      />
    )
  }

  if (modules.positiveInsight) {
    cards.push(
      <PositiveInsightCard key="insight" insight={modules.positiveInsight} />
    )
  }

  return <div className="space-y-3">{cards}</div>
}

// ----------------------------------------------------------------
// Upcoming bills
// ----------------------------------------------------------------
function UpcomingBillsCard({
  items,
  symbol,
  hideBalances,
}: {
  items: SmartModules['upcoming']
  symbol: string
  hideBalances: boolean
}) {
  const t = useT()
  return (
    <InsightCardShell icon={Calendar} tint="var(--warning)" title={t('home.upcoming')} delay={0}>
      <ul className="mt-2 space-y-2.5">
        {items.map((b) => (
          <li key={b.name + b.date} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[14px] font-medium text-foreground">{b.name}</div>
              <div className="text-[12px] text-muted-foreground">{b.dueIn}</div>
            </div>
            <span className="shrink-0 text-[14px] font-semibold tracking-tight tnum text-warning">
              {hideBalances ? maskBalance(symbol) : formatMoney(b.amount, { symbol, decimalPlaces: 0 })}
            </span>
          </li>
        ))}
      </ul>
    </InsightCardShell>
  )
}

// ----------------------------------------------------------------
// Spending pace — always shown
// ----------------------------------------------------------------
function SpendingPaceCard({ pace }: { pace: SmartModules['spendingPace'] }) {
  const t = useT()
  const isDown = pace.direction === 'down'
  const Icon: LucideIcon = isDown ? TrendingDown : TrendingUp
  const tint = isDown ? 'var(--positive)' : 'var(--warning)'
  const badgeText = `${isDown ? '↓' : '↑'} ${pace.percent}%`
  return (
    <InsightCardShell icon={Icon} tint={tint} title={t('home.spendingPace')} delay={0.05}>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-[13px] leading-snug text-muted-foreground">{pace.message}</p>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold tnum"
          style={{
            backgroundColor: `${isDown ? 'rgba(52,199,89,0.12)' : 'rgba(255,159,10,0.12)'}`,
            color: tint,
          }}
        >
          {badgeText}
        </span>
      </div>
    </InsightCardShell>
  )
}

// ----------------------------------------------------------------
// Budget warning — category approaching its limit
// ----------------------------------------------------------------
function BudgetWarningCard({
  warning,
  symbol,
  hideBalances,
}: {
  warning: NonNullable<SmartModules['budgetWarning']>
  symbol: string
  hideBalances: boolean
}) {
  const t = useT()
  const body = t('home.budgetWarning', {
    category: warning.category,
    amount: hideBalances ? maskBalance(symbol) : formatMoney(warning.amount, { symbol, decimalPlaces: 0 }),
    days: warning.daysLeft,
  })
  return (
    <InsightCardShell icon={TriangleAlert} tint="var(--warning)" title={warning.category} delay={0.1}>
      <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{body}</p>
    </InsightCardShell>
  )
}

// ----------------------------------------------------------------
// Positive insight — biggest month-over-month drop
// ----------------------------------------------------------------
function PositiveInsightCard({
  insight,
}: {
  insight: NonNullable<SmartModules['positiveInsight']>
}) {
  const t = useT()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[18px] p-4"
      style={{ backgroundColor: 'var(--senlie-soft)' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-[9px]"
          style={{ backgroundColor: 'rgba(89,101,243,0.16)', color: 'var(--senlie)' }}
        >
          <Sparkles size={15} strokeWidth={2.4} />
        </div>
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{t('home.nice')}</h3>
      </div>
      <p className="mt-1.5 pl-9 text-[13px] leading-snug text-muted-foreground">
        {insight.message}
      </p>
    </motion.div>
  )
}

// ----------------------------------------------------------------
// Shared card shell for upcoming / pace / warning
// ----------------------------------------------------------------
function InsightCardShell({
  icon: Icon,
  tint,
  title,
  delay = 0,
  children,
}: {
  icon: LucideIcon
  tint: string
  title: string
  delay?: number
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      className="bg-card shadow-card rounded-[18px] p-4"
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-[9px]"
          style={{ backgroundColor: `color-mix(in srgb, ${tint} 16%, transparent)`, color: tint }}
        >
          <Icon size={15} strokeWidth={2.4} />
        </div>
        <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
      </div>
      {children}
    </motion.div>
  )
}
