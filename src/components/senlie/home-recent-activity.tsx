'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeftRight, ChevronRight } from 'lucide-react'
import { formatMoney, maskBalance } from '@/lib/currency'
import { useSenlieUI } from '@/lib/store'
import { useHaptic } from '@/hooks/use-senlie-data'
import { useT } from '@/hooks/use-t'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/senlie/category-icon'
import type { Transaction } from '@/lib/types'
import { TODAY } from '@/lib/finance-utils'

// Relative-time helper. We anchor on the demo "today" (Aug 8, 2026 18:42 AST)
// so the demo always feels consistent regardless of the real wall clock.
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = TODAY.getTime()
  const diffMs = now - then
  if (diffMs < 0) return 'just now'
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'yesterday'
  if (day < 7) return `${day}d ago`
  const wk = Math.floor(day / 7)
  if (wk === 1) return 'last week'
  return `${wk}w ago`
}

export function HomeRecentActivity({
  transactions,
  symbol,
  hideBalances,
  onSeeAll,
}: {
  transactions: Transaction[]
  symbol: string
  hideBalances: boolean
  onSeeAll: () => void
}) {
  const setSelectedTransactionId = useSenlieUI((s) => s.setSelectedTransactionId)
  const haptic = useHaptic()

  const rows = transactions.slice(0, 5)

  if (rows.length === 0) {
    return (
      <section className="space-y-3">
        <Header onSeeAll={onSeeAll} />
        <div className="bg-card shadow-card rounded-[18px] p-6 text-center">
          <p className="text-[14px] text-muted-foreground">No transactions yet this month.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <Header onSeeAll={onSeeAll} />
      <div className="bg-card shadow-card divide-y divide-border overflow-hidden rounded-[20px]">
        {rows.map((tx, i) => {
          const merchant = tx.merchantName || tx.description || 'Transaction'
          const categoryName = tx.category?.name ?? 'Other'
          const relTime = relativeTime(tx.date)

          let amountText: React.ReactNode
          if (hideBalances) {
            amountText = (
              <span className="text-[15px] font-semibold tracking-tight tnum text-muted-foreground">
                {maskBalance(symbol)}
              </span>
            )
          } else if (tx.type === 'income') {
            amountText = (
              <span className="text-[15px] font-semibold tracking-tight tnum text-positive">
                +{formatMoney(tx.amount, { symbol, decimalPlaces: 0 })}
              </span>
            )
          } else if (tx.type === 'transfer') {
            amountText = (
              <span className="text-[15px] font-semibold tracking-tight tnum text-muted-foreground">
                <ArrowLeftRight size={13} strokeWidth={2.4} className="mr-1 inline -mt-0.5" />
                {formatMoney(tx.amount, { symbol, decimalPlaces: 0 })}
              </span>
            )
          } else {
            amountText = (
              <span className="text-[15px] font-semibold tracking-tight tnum text-foreground">
                -{formatMoney(tx.amount, { symbol, decimalPlaces: 0 })}
              </span>
            )
          }

          return (
            <motion.button
              key={tx.id}
              type="button"
              onClick={() => {
                haptic('light')
                setSelectedTransactionId(tx.id)
              }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 active:bg-muted/60'
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
                <div className="truncate text-[12px] text-muted-foreground">
                  {categoryName} · {relTime}
                </div>
              </div>
              <div className="shrink-0">{amountText}</div>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}

function Header({ onSeeAll }: { onSeeAll: () => void }) {
  const t = useT()
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[20px] font-semibold tracking-tight">{t('home.recentActivity')}</h2>
      <button
        type="button"
        onClick={onSeeAll}
        className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {t('home.seeAll')}
        <ChevronRight size={13} strokeWidth={2.4} className="ml-0.5 inline -mt-0.5" />
      </button>
    </div>
  )
}
