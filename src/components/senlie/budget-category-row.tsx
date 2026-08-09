'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { CategoryIcon } from '@/components/senlie/category-icon'
import { formatMoney, maskBalance } from '@/lib/currency'
import { useHaptic } from '@/hooks/use-senlie-data'
import { useSenlieUI } from '@/lib/store'
import { useT } from '@/hooks/use-t'
import type { BudgetCategoryRow as Row, RolloverType } from '@/lib/types'

type Status = 'healthy' | 'warning' | 'exceeded'

const STATUS_COLOR: Record<Status, string> = {
  healthy: 'var(--senlie)',
  warning: 'var(--warning)',
  exceeded: 'var(--negative)',
}

const ROLLOVER_LABEL_KEY: Record<RolloverType, string> = {
  monthly: 'budget.rolloverTypeMonthly',
  rollover: 'budget.rolloverTypeRollover',
  flexible: 'budget.rolloverTypeFlexible',
  fixed: 'budget.rolloverTypeFixed',
}

// A single budget category card in the Budget tab list.
// Layout (top → bottom):
//   • Top row: 36px CategoryIcon → name + rolloverType chip → "spent / limit"
//   • Progress bar (h-2 rounded-full bg-muted) with status-colored fill.
//     If exceeded → fill is full-width and a "+RD$X" overflow chip appears
//     to the right of the bar in text-negative.
//   • Bottom row: "RD$X remaining" (or "RD$X over budget" in text-negative
//     when exceeded) on the left, percentage used on the right.
//
// Tap → haptic('light'). Felt-tappable via framer-motion's whileTap spring.
export function BudgetCategoryRow({
  row,
  symbol,
  hideBalances,
  index = 0,
}: {
  row: Row
  symbol: string
  hideBalances: boolean
  index?: number
}) {
  const haptic = useHaptic()
  const t = useT()
  const setActiveTab = useSenlieUI((s) => s.setActiveTab)
  const setActivityPresetCategory = useSenlieUI((s) => s.setActivityPresetCategory)
  const limit = row.allocated + row.rollover
  const exceeded = row.status === 'exceeded' || row.remaining < 0
  const overflow = exceeded ? Math.abs(row.remaining) : 0
  const pct = Math.round(row.progress * 100)
  const color = STATUS_COLOR[row.status]
  const fillWidth = `${Math.min(row.progress, 1) * 100}%`

  // Strings (mask both halves when hideBalances is on)
  const spentStr = hideBalances
    ? maskBalance(symbol)
    : formatMoney(row.spent, { symbol, decimalPlaces: 0 })
  const limitStr = hideBalances
    ? maskBalance(symbol)
    : formatMoney(limit, { symbol, decimalPlaces: 0 })
  const overflowStr = hideBalances
    ? maskBalance(symbol)
    : formatMoney(overflow, { symbol, decimalPlaces: 0 })
  const remainingStr = hideBalances
    ? maskBalance(symbol)
    : formatMoney(Math.abs(row.remaining), { symbol, decimalPlaces: 0 })

  return (
    <motion.button
      type="button"
      onClick={() => {
        haptic('light')
        setActivityPresetCategory(row.categoryId)
        setActiveTab('activity')
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.98 }}
      className="flex w-full flex-col gap-3 bg-card shadow-card rounded-[18px] p-4 text-left"
    >
      {/* Top row */}
      <div className="flex items-center gap-3">
        <CategoryIcon
          name={row.icon}
          color={row.color}
          size={36}
          iconSize={18}
          rounded="rounded-[12px]"
        />
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-foreground">
          {row.name}
        </span>
        <div className="shrink-0 text-[14px] tnum">
          <span className="font-semibold text-foreground">{spentStr}</span>
          <span className="text-muted-foreground"> / {limitStr}</span>
        </div>
      </div>

      {/* Progress bar with optional overflow indicator */}
      <div className="flex items-center gap-2">
        <div className="relative h-2 flex-1 rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: fillWidth }}
            transition={{
              duration: 0.6,
              delay: index * 0.04,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        {exceeded && (
          <span className="shrink-0 text-[12px] font-semibold tnum text-negative">
            +{overflowStr}
          </span>
        )}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {t(ROLLOVER_LABEL_KEY[row.rolloverType])}
          </span>
          {exceeded ? (
            <span className="text-[12px] font-medium tnum text-negative">
              {overflowStr} {t('budget.overBudget')}
            </span>
          ) : (
            <span className="text-[12px] tnum text-muted-foreground">
              {remainingStr} {t('budget.remaining')}
            </span>
          )}
        </div>
        <span className="text-[12px] tnum text-muted-foreground">{pct}%</span>
      </div>
    </motion.button>
  )
}
