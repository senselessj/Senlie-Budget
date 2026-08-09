'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { CalendarClock } from 'lucide-react'
import { formatMoney, maskBalance } from '@/lib/currency'
import { monthShort } from '@/lib/finance-utils'
import { useT } from '@/hooks/use-t'

// Compact footer card showing the next upcoming payday.
export function HomeNextPayday({
  nextPayDate,
  nextPayAmount,
  symbol,
  hideBalances,
}: {
  nextPayDate: string // ISO
  nextPayAmount: number
  symbol: string
  hideBalances: boolean
}) {
  const t = useT()
  const d = new Date(nextPayDate)
  const label = `${monthShort(d.getMonth() + 1)} ${d.getDate()}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="bg-card shadow-card flex items-center justify-between rounded-[18px] p-4"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: 'rgba(52,199,89,0.12)', color: 'var(--positive)' }}
        >
          <CalendarClock size={18} strokeWidth={2.2} />
        </div>
        <div>
          <div className="text-[13px] text-muted-foreground">{t('home.nextPayday')}</div>
          <div className="text-[15px] font-medium text-foreground">{label}</div>
        </div>
      </div>
      <div className="text-right">
        {hideBalances ? (
          <span className="text-[16px] font-semibold tracking-tight tnum text-muted-foreground">
            {maskBalance(symbol)}
          </span>
        ) : (
          <span className="text-[16px] font-semibold tracking-tight tnum text-positive">
            +{formatMoney(nextPayAmount, { symbol, decimalPlaces: 0 })}
          </span>
        )}
      </div>
    </motion.div>
  )
}
