'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { AnimatedNumber } from '@/components/senlie/animated-number'
import { formatMoney, maskBalance } from '@/lib/currency'
import { useT } from '@/hooks/use-t'
import type { InsightsSummary } from '@/lib/types'

// Premium hero card for the Insights tab.
// Mirrors the Budget header card styling (bg-card rounded-[22px] p-6 shadow-card)
// but adds a subtle senlie-tinted gradient overlay to feel more "narrative".
//
// Layout (top → bottom):
//   • Eyebrow: "vs. last month" (uppercase, muted, tracking-wide)
//   • Big headline — composed from heroDirection + Math.abs(heroDelta).
//     "down" = spent less = positive framing. "up" = gentle heads-up.
//   • Badge — AnimatedNumber delta with arrow icon, colored by direction
//     (down → positive/green, up → warning/amber). Respects hideBalances.
export function InsightsHeroCard({
  data,
  symbol,
  hideBalances,
}: {
  data: InsightsSummary
  symbol: string
  hideBalances: boolean
}) {
  const t = useT()
  const isDown = data.heroDirection === 'down'
  const pct = Math.abs(data.heroDelta)
  const lastMonth = data.month === 1 ? 12 : data.month - 1
  const lastMonthName = t(`month.${lastMonth}`)
  const tint = isDown ? 'var(--positive)' : 'var(--warning)'

  // Headline — different framing depending on direction
  const headline = isDown
    ? t('insights.spendingDown', { percent: pct, month: lastMonthName })
    : t('insights.spendingUp', { percent: pct, month: lastMonthName })

  // Badge content
  const Arrow = isDown ? TrendingDown : TrendingUp

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[22px] p-6 shadow-card"
      style={{
        background:
          'linear-gradient(135deg, var(--senlie-soft) 0%, var(--card) 55%)',
      }}
    >
      {/* Eyebrow */}
      <p className="text-[12px] uppercase tracking-wide text-muted-foreground">
        {t('insights.vsLastMonth')}
      </p>

      {/* Headline */}
      <h2 className="mt-1.5 text-[22px] font-semibold leading-tight tracking-tight text-foreground">
        {headline}
      </h2>

      {/* Delta badge */}
      <div className="mt-3.5 flex items-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold tnum"
          style={{
            backgroundColor: `color-mix(in srgb, ${tint} 14%, transparent)`,
            color: tint,
          }}
        >
          <Arrow size={14} strokeWidth={2.6} />
          {hideBalances ? (
            <span>{maskBalance(symbol)} {isDown ? t('insights.less') : t('insights.more')}</span>
          ) : (
            <AnimatedNumber
              value={data.heroAmount}
              format={(n) =>
                `${formatMoney(n, { symbol, decimalPlaces: 0 })} ${isDown ? t('insights.less') : t('insights.more')}`
              }
            />
          )}
        </span>
      </div>

      {/* Subtext — quick framing line */}
      <p className="mt-3 text-[13px] leading-snug text-muted-foreground">
        {isDown
          ? t('insights.keepItUp')
          : t('insights.headsUp')}
      </p>
    </motion.section>
  )
}
