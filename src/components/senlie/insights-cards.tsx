'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  TrendingDown,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { useHaptic } from '@/hooks/use-senlie-data'
import { useT } from '@/hooks/use-t'
import type { InsightCard } from '@/lib/types'

// Stacked insight cards for the Insights tab.
// Each card mirrors the visual language of the Home tab's smart modules:
//   • 36px tinted icon tile on the left
//   • Title (15px semibold) + message (13px muted) on the right
//   • Optional "Why am I seeing this?" expandable row that toggles the
//     detail text via AnimatePresence. haptic('light') on expand.
//
// Icon by type:
//   • positive → TrendingDown (green tint)   [down = positive for spending]
//   • warning  → TriangleAlert (amber tint)
//   • info     → Info (senlie tint)
//   • recurring → RefreshCw (senlie tint)
type CardType = InsightCard['type']

const TYPE_META: Record<CardType, { icon: LucideIcon; tint: string }> = {
  positive: { icon: TrendingDown, tint: 'var(--positive)' },
  warning: { icon: TriangleAlert, tint: 'var(--warning)' },
  info: { icon: Info, tint: 'var(--senlie)' },
  recurring: { icon: RefreshCw, tint: 'var(--senlie)' },
}

export function InsightsCards({ cards }: { cards: InsightCard[] }) {
  return (
    <div className="space-y-3">
      {cards.map((card, i) => (
        <InsightCardRow key={card.id} card={card} index={i} />
      ))}
    </div>
  )
}

function InsightCardRow({
  card,
  index,
}: {
  card: InsightCard
  index: number
}) {
  const haptic = useHaptic()
  const t = useT()
  const [open, setOpen] = React.useState(false)
  const meta = TYPE_META[card.type]
  const Icon = meta.icon
  const hasDetail = Boolean(card.detail)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="bg-card shadow-card rounded-[18px] p-4"
    >
      {/* Top row — icon + text */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
          style={{
            backgroundColor: `color-mix(in srgb, ${meta.tint} 16%, transparent)`,
            color: meta.tint,
          }}
        >
          <Icon size={18} strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground">
            {card.title}
          </h3>
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
            {card.message}
          </p>
        </div>
      </div>

      {/* Expandable detail */}
      {hasDetail && (
        <div className="mt-2 pl-12">
          <button
            type="button"
            onClick={() => {
              haptic('light')
              setOpen((o) => !o)
            }}
            className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span>{t('insights.whySeeing')}</span>
            {open ? (
              <ChevronUp size={13} strokeWidth={2.4} />
            ) : (
              <ChevronDown size={13} strokeWidth={2.4} />
            )}
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <p className="mt-2 rounded-[10px] bg-muted px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
                  {card.detail}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
