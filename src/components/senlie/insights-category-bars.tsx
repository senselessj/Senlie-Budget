'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { CategoryIcon } from '@/components/senlie/category-icon'
import { formatMoney, maskBalance } from '@/lib/currency'
import type { InsightsSummary } from '@/lib/types'

type CategoryRow = InsightsSummary['categoryBreakdown'][number]

// Horizontal category bar list for the Insights tab.
// Each row mirrors the visual language of the Budget tab's category rows:
//   • 28px CategoryIcon → name (left), amount + percent (right)
//   • Below: h-2 rounded-full bg-muted track with a fill colored by the
//     category's own color. Fills animate on mount, staggered by index.
//
// Bars are pure displays (no tap action); they're for at-a-glance reading.
export function InsightsCategoryBars({
  categories,
  symbol,
  hideBalances,
}: {
  categories: CategoryRow[]
  symbol: string
  hideBalances: boolean
}) {
  const sorted = React.useMemo(
    () => [...categories].sort((a, b) => b.amount - a.amount),
    [categories]
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="bg-card shadow-card rounded-[20px] p-5"
    >
      <div className="space-y-4">
        {sorted.map((c, i) => (
          <CategoryBarRow
            key={c.categoryId}
            row={c}
            index={i}
            symbol={symbol}
            hideBalances={hideBalances}
          />
        ))}
      </div>
    </motion.div>
  )
}

function CategoryBarRow({
  row,
  index,
  symbol,
  hideBalances,
}: {
  row: CategoryRow
  index: number
  symbol: string
  hideBalances: boolean
}) {
  const amountStr = hideBalances
    ? maskBalance(symbol)
    : formatMoney(row.amount, { symbol, decimalPlaces: 0 })
  const pct = Math.round(row.percent * 100)
  const fillWidth = `${Math.min(row.percent, 1) * 100}%`

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="flex flex-col gap-2"
    >
      {/* Label row */}
      <div className="flex items-center gap-2.5">
        <CategoryIcon
          name={row.icon}
          color={row.color}
          size={28}
          iconSize={15}
          rounded="rounded-[9px]"
        />
        <div className="min-w-0 flex-1">
          <span className="truncate text-[14px] font-medium text-foreground">
            {row.name}
          </span>
        </div>
        <span className="shrink-0 text-[14px] font-semibold tnum text-foreground">
          {amountStr}
        </span>
        <span className="shrink-0 text-[12px] tnum text-muted-foreground">
          {pct}%
        </span>
      </div>

      {/* Bar */}
      <div className="relative h-2 w-full rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: fillWidth }}
          transition={{
            duration: 0.6,
            delay: index * 0.05,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            backgroundColor: row.color,
            backgroundImage: `linear-gradient(90deg, color-mix(in srgb, ${row.color} 60%, transparent), ${row.color})`,
          }}
        />
      </div>
    </motion.div>
  )
}
