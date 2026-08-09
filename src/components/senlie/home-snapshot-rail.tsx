'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Receipt, type LucideIcon } from 'lucide-react'
import { maskBalance } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { AnimatedNumber } from '@/components/senlie/animated-number'
import { useT } from '@/hooks/use-t'

type Snapshot = {
  key: 'income' | 'spent' | 'saved' | 'billsDue'
  labelKey: string
  value: number
  Icon: LucideIcon
  tint: string // icon background tint color (hex)
  amountClass: string // tailwind text-color class
  format: (n: number) => string
}

export function HomeSnapshotRail({
  snapshots,
  symbol,
  hideBalances,
}: {
  snapshots: { income: number; spent: number; saved: number; billsDue: number }
  symbol: string
  hideBalances: boolean
}) {
  const t = useT()
  const items: Snapshot[] = [
    {
      key: 'income',
      labelKey: 'home.income',
      value: snapshots.income,
      Icon: ArrowDownLeft,
      tint: '#34C759',
      amountClass: 'text-positive',
      format: (n) => formatSigned(symbol, n, '+'),
    },
    {
      key: 'spent',
      labelKey: 'home.spent',
      value: snapshots.spent,
      Icon: ArrowUpRight,
      tint: '#8E8E93',
      amountClass: 'text-foreground',
      format: (n) => formatSigned(symbol, n, '-'),
    },
    {
      key: 'saved',
      labelKey: 'home.saved',
      value: snapshots.saved,
      Icon: PiggyBank,
      tint: '#34C759',
      amountClass: 'text-positive',
      format: (n) => `${symbol}${Math.round(n).toLocaleString()}`,
    },
    {
      key: 'billsDue',
      labelKey: 'home.billsDue',
      value: snapshots.billsDue,
      Icon: Receipt,
      tint: '#FF9F0A',
      amountClass: 'text-foreground',
      format: (n) => `${symbol}${Math.round(n).toLocaleString()}`,
    },
  ]

  return (
    <div className="-mx-5 flex gap-3 overflow-x-auto px-5 no-scrollbar">
      {items.map((it, i) => (
        <motion.div
          key={it.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
          className="bg-card shadow-card flex w-[152px] shrink-0 flex-col gap-3 rounded-[18px] p-4"
        >
          <div className="flex items-start justify-between">
            <span className="text-[12px] text-muted-foreground">{t(it.labelKey)}</span>
            <div
              className="flex h-7 w-7 items-center justify-center rounded-[9px]"
              style={{ backgroundColor: `${it.tint}1A`, color: it.tint }}
            >
              <it.Icon size={15} strokeWidth={2.4} />
            </div>
          </div>
          {hideBalances ? (
            <span className={cn('text-[19px] font-semibold tracking-tight tnum whitespace-nowrap', it.amountClass)}>
              {maskBalance(symbol)}
            </span>
          ) : (
            <AnimatedNumber
              value={it.value}
              format={it.format}
              className={cn('text-[19px] font-semibold tracking-tight tnum whitespace-nowrap', it.amountClass)}
            />
          )}
        </motion.div>
      ))}
    </div>
  )
}

function formatSigned(symbol: string, n: number, sign: '+' | '-'): string {
  const abs = Math.abs(n)
  const num = Math.round(abs).toLocaleString()
  return `${sign}${symbol}${num}`
}
