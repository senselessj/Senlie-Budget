'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type Status = 'healthy' | 'warning' | 'exceeded'

const STATUS_COLOR: Record<Status, string> = {
  healthy: 'var(--senlie)',
  warning: 'var(--warning)',
  exceeded: 'var(--negative)',
}

// A premium horizontal progress bar with a soft gradient fill and a
// leading knob dot at the progress edge. A wider, horizontal counterpart
// to the Home tab's curved progress — used inside the Budget header card.
//
// `progress` is clamped to [0,1] internally. Pass a value > 1 (e.g. an
// exceeded budget) and we'll cap the fill at 100% but still render the knob
// at the right edge.
export function BudgetHorizontalProgress({
  progress,
  status,
  delay = 0,
  className,
  trackClassName,
}: {
  progress: number
  status: Status
  delay?: number
  className?: string
  trackClassName?: string
}) {
  const clamped = Math.max(0, Math.min(1, progress))
  const color = STATUS_COLOR[status]
  const showKnob = clamped > 0.005

  return (
    <div className={cn('relative h-3 w-full', className)}>
      {/* Track */}
      <div
        className={cn(
          'absolute inset-0 rounded-full bg-muted opacity-80',
          trackClassName
        )}
      />
      {/* Gradient fill */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped * 100}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay }}
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          background: `linear-gradient(90deg, color-mix(in srgb, ${color} 55%, transparent), ${color})`,
        }}
      />
      {/* Leading knob — centered on its position via margins so it never
          conflicts with framer-motion's transform-based animations. */}
      {showKnob && (
        <motion.div
          initial={{ opacity: 0, left: '0%' }}
          animate={{ opacity: 1, left: `${clamped * 100}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay }}
          className="absolute top-1/2"
          style={{ width: 14, height: 14, marginLeft: -7, marginTop: -7 }}
        >
          <div
            className="h-full w-full rounded-full border-2 border-background"
            style={{
              backgroundColor: color,
              boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
            }}
          />
        </motion.div>
      )}
    </div>
  )
}
