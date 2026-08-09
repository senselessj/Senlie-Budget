'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import { formatMoney, maskBalance } from '@/lib/currency'
import { AnimatedNumber } from '@/components/senlie/animated-number'
import { useHaptic } from '@/hooks/use-senlie-data'
import { useSenlieUI } from '@/lib/store'
import { useT } from '@/hooks/use-t'

export function BudgetUnassignedCard({
  amount,
  symbol,
  hideBalances,
  delay = 0,
}: {
  amount: number
  symbol: string
  hideBalances: boolean
  delay?: number
}) {
  const haptic = useHaptic()
  const t = useT()
  const openSettingsView = useSenlieUI((s) => s.openSettingsView)

  const chips = [
    { key: 'spend', label: t('budget.addToSpending'), action: () => openSettingsView('budgetPrefs') },
    { key: 'savings', label: t('budget.moveToSavings'), action: () => openSettingsView('goals') },
    { key: 'rollover', label: t('budget.rollover'), action: () => openSettingsView('budgetPrefs') },
  ]

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[18px] p-5"
      style={{ backgroundColor: 'var(--senlie-soft)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
          style={{ backgroundColor: 'rgba(89,101,243,0.16)', color: 'var(--senlie)' }}
        >
          <Wallet size={18} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground">
            {t('budget.unassigned')}
          </div>
          <div
            className="text-[24px] font-semibold leading-tight tracking-tight tnum"
            style={{ color: 'var(--senlie)' }}
          >
            {hideBalances ? (
              maskBalance(symbol)
            ) : (
              <AnimatedNumber
                value={amount}
                format={(n) => formatMoney(n, { symbol, decimalPlaces: 0 })}
              />
            )}
          </div>
        </div>
      </div>

      {/* Action chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => {
              haptic('light')
              c.action()
            }}
            className="rounded-full bg-card px-3 py-1.5 text-[12px] font-medium text-foreground shadow-card transition-transform active:scale-[0.96]"
          >
            {c.label}
          </button>
        ))}
      </div>
    </motion.section>
  )
}
