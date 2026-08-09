'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { formatMoney, maskBalance } from '@/lib/currency'
import { AnimatedNumber } from '@/components/senlie/animated-number'
import { BudgetHorizontalProgress } from '@/components/senlie/budget-horizontal-progress'
import { useT } from '@/hooks/use-t'
import type { BudgetSummary } from '@/lib/types'

type Status = 'healthy' | 'warning' | 'exceeded'

const STATUS_META: Record<Status, { labelKey: string; color: string }> = {
  healthy: { labelKey: 'home.healthy', color: 'var(--senlie)' },
  warning: { labelKey: 'home.approaching', color: 'var(--warning)' },
  exceeded: { labelKey: 'home.over', color: 'var(--negative)' },
}

// The premium summary card at the top of the Budget tab.
// Mirrors the Home tab's monthly status card styling:
//   - bg-card rounded-[22px] p-6 shadow-card
//   - status pill with dot + word, colored by status
//   - hero amount with AnimatedNumber (or maskBalance when hidden)
//   - bottom Available / Spent columns
// Replaces the curved-arc visualization with a wider, horizontal progress
// (gradient fill + leading knob) — same aesthetic language, different shape.
export function BudgetHeaderCard({
  data,
  symbol,
  hideBalances,
}: {
  data: BudgetSummary
  symbol: string
  hideBalances: boolean
}) {
  const t = useT()
  const monthLabel = t(`month.${data.month}`)
  const ratio = data.committed > 0 ? data.spent / data.committed : 0
  const statusMeta = STATUS_META[data.status]

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="bg-card shadow-card rounded-[22px] p-6"
    >
      {/* Title row */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">
          {t('budget.title', { month: monthLabel })}
        </h1>
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{
            backgroundColor: `color-mix(in srgb, ${statusMeta.color} 14%, transparent)`,
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: statusMeta.color }}
          />
          <span
            className="text-[12px] font-semibold"
            style={{ color: statusMeta.color }}
          >
            {t(statusMeta.labelKey)}
          </span>
        </div>
      </div>

      {/* Hero number — "RD$X left" */}
      <div className="mt-3 flex items-baseline gap-2">
        {hideBalances ? (
          <span className="text-[36px] font-semibold leading-none tracking-tight tnum text-foreground">
            {maskBalance(symbol)}
          </span>
        ) : (
          <AnimatedNumber
            value={data.remaining}
            format={(n) => formatMoney(n, { symbol, decimalPlaces: 0 })}
            className="text-[36px] font-semibold leading-none tracking-tight tnum text-foreground"
          />
        )}
        <span className="text-[16px] font-medium text-muted-foreground">{t('budget.left')}</span>
      </div>

      {/* Horizontal progress visualization */}
      <div className="mt-5">
        <BudgetHorizontalProgress progress={ratio} status={data.status} delay={0.15} />
      </div>

      {/* Bottom row — Available / Spent */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('budget.available')}
          </div>
          <div className="tnum text-[17px] font-semibold tracking-tight text-foreground">
            {hideBalances
              ? maskBalance(symbol)
              : formatMoney(data.income, { symbol, decimalPlaces: 0 })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t('budget.spent')}
          </div>
          <div className="tnum text-[17px] font-semibold tracking-tight text-foreground">
            {hideBalances
              ? maskBalance(symbol)
              : formatMoney(data.spent, { symbol, decimalPlaces: 0 })}
          </div>
        </div>
      </div>
    </motion.section>
  )
}
