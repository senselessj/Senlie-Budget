'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, ShieldCheck } from 'lucide-react'
import { formatMoney, maskBalance } from '@/lib/currency'
import { useHaptic } from '@/hooks/use-senlie-data'
import { useT } from '@/hooks/use-t'
import { AnimatedNumber } from '@/components/senlie/animated-number'

// "Safe to spend" — a senlie-tinted card showing how much the user can
// comfortably spend per day for the rest of the month.
export function HomeSafeToSpend({
  perDay,
  total,
  daysLeft,
  symbol,
  hideBalances,
}: {
  perDay: number
  total: number
  daysLeft: number
  symbol: string
  hideBalances: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const haptic = useHaptic()

  const t = useT()
  const explanation = hideBalances
    ? t('home.hiddenBalancesDetail', { days: daysLeft })
    : t('home.safeDetail', {
        total: formatMoney(total, { symbol, decimalPlaces: 0 }),
        days: daysLeft,
        perDay: formatMoney(perDay, { symbol, decimalPlaces: 0 }),
      })

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[22px] p-5"
      style={{ backgroundColor: 'var(--senlie-soft)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-[9px]"
            style={{ backgroundColor: 'rgba(89,101,243,0.16)', color: 'var(--senlie)' }}
          >
            <ShieldCheck size={15} strokeWidth={2.4} />
          </div>
          <span className="text-[13px] font-medium text-muted-foreground">{t('home.safeToSpend')}</span>
        </div>
        <button
          type="button"
          aria-label={t('home.whatIsSafe')}
          onClick={() => {
            haptic('light')
            setOpen((v) => !v)
          }}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/5"
        >
          <Info size={15} strokeWidth={2.4} />
        </button>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        {hideBalances ? (
          <span className="text-[32px] font-semibold tracking-tight tnum text-foreground">
            {maskBalance(symbol)}
          </span>
        ) : (
          <AnimatedNumber
            value={perDay}
            format={(n) => formatMoney(n, { symbol, decimalPlaces: 0 })}
            className="text-[32px] font-semibold tracking-tight tnum text-foreground"
          />
        )}
        <span className="text-[15px] font-medium text-muted-foreground">{t('home.perDay')}</span>
      </div>

      <p className="mt-1 text-[13px] text-muted-foreground">
        {hideBalances
          ? `${maskBalance(symbol)} ${t('home.availableFor')} ${daysLeft} ${t('home.days')}`
          : `${formatMoney(total, { symbol, decimalPlaces: 0 })} ${t('home.availableFor')} ${daysLeft} ${t('home.days')}`}
      </p>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="mt-3 rounded-[12px] bg-card/70 p-3 text-[12px] leading-relaxed text-muted-foreground">
              {explanation}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
