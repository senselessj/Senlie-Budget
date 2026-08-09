'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney, maskBalance } from '@/lib/currency'
import { CategoryIcon } from '@/components/senlie/category-icon'
import { useHaptic } from '@/hooks/use-senlie-data'
import { useSenlieUI } from '@/lib/store'
import { useT } from '@/hooks/use-t'
import type { Transaction } from '@/lib/types'

// A single transaction row in the Activity tab list.
// Visual language matches HomeRecentActivity (40px CategoryIcon, 15px merchant,
// 12px category subtitle, right-aligned amount) but tuned for the denser
// activity layout: px-1, py-2.5, hover:bg-card/60.
export function ActivityTransactionRow({
  tx,
  symbol,
  hideBalances,
  index = 0,
}: {
  tx: Transaction
  symbol: string
  hideBalances: boolean
  index?: number
}) {
  const setSelectedTransactionId = useSenlieUI((s) => s.setSelectedTransactionId)
  const haptic = useHaptic()
  const t = useT()

  const merchant = tx.merchantName || tx.description || t('activity.transaction')
  const categoryName = tx.category?.name ?? (tx.type === 'transfer' ? t('activity.transfer') : tx.type === 'income' ? t('activity.income') : t('activity.other'))

  // Amount block — type-aware
  let amountNode: React.ReactNode
  if (hideBalances) {
    amountNode = (
      <span className="text-[15px] font-semibold tracking-tight tnum text-muted-foreground">
        {maskBalance(symbol)}
      </span>
    )
  } else if (tx.type === 'income') {
    amountNode = (
      <span className="text-[15px] font-semibold tracking-tight tnum text-positive">
        +{formatMoney(tx.amount, { symbol, decimalPlaces: 0 })}
      </span>
    )
  } else if (tx.type === 'transfer') {
    amountNode = (
      <span className="text-[15px] font-semibold tracking-tight tnum text-muted-foreground">
        <ArrowLeftRight size={12} strokeWidth={2.4} className="mr-1 -mt-0.5 inline" />
        {formatMoney(tx.amount, { symbol, decimalPlaces: 0 })}
      </span>
    )
  } else {
    // expense — calm foreground, NOT red
    amountNode = (
      <span className="text-[15px] font-semibold tracking-tight tnum text-foreground">
        -{formatMoney(tx.amount, { symbol, decimalPlaces: 0 })}
      </span>
    )
  }

  return (
    <motion.button
      type="button"
      onClick={() => {
        haptic('light')
        setSelectedTransactionId(tx.id)
      }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.18), ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex w-full items-center gap-3 rounded-[14px] px-1 py-2.5 text-left',
        'transition-colors hover:bg-card/60 active:bg-card/80'
      )}
    >
      <CategoryIcon
        name={tx.category?.icon ?? 'tag'}
        color={tx.category?.color ?? '#8E8E93'}
        size={40}
        iconSize={20}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium text-foreground">{merchant}</div>
        <div className="truncate text-[12px] text-muted-foreground">{categoryName}</div>
      </div>
      <div className="shrink-0">{amountNode}</div>
    </motion.button>
  )
}
