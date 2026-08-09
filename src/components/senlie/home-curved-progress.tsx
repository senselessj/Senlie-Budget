'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// A premium 3/4-ring progress visualization for the monthly budget card.
// The arc fills proportionally to `progress` (0..1) and is colored by status:
//   healthy   -> var(--senlie)
//   warning   -> var(--warning)
//   exceeded  -> var(--negative)
// The center shows the percentage used in large tabular numerals.

const R = 80
const CX = 100
const CY = 100
const STROKE = 14

// Arc spans 270° clockwise, starting at 7:30 (225° clock-angle) through 12,
// 3, to 5:30 (135°). The 90° gap is centered at the bottom (6 o'clock).
const START_ANGLE = 225 // clock angle (0 = top, CW)
const SWEEP = 270 // total degrees

function polar(angleDeg: number, r = R) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CX + r * Math.sin(rad),
    y: CY - r * Math.cos(rad),
  }
}

function arcPath(angleEnd: number): string {
  // From START_ANGLE clockwise by `sweep` degrees.
  const sweep = ((angleEnd - START_ANGLE) % 360 + 360) % 360
  const start = polar(START_ANGLE)
  const end = polar(START_ANGLE + sweep)
  const largeArc = sweep > 180 ? 1 : 0
  // sweep_flag = 1 means "clockwise" in SVG screen space, which matches our
  // "clock-angle clockwise from top" convention because +y is down in SVG.
  return `M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

// Full 270° track — used for the greyed-out background ring AND as the path
// for the animated progress arc (we use pathLength to reveal it).
const FULL_TRACK = arcPath(START_ANGLE + SWEEP)

export function HomeCurvedProgress({
  progress,
  status,
  percentLabel,
  className,
}: {
  progress: number // 0..1
  status: 'healthy' | 'warning' | 'exceeded'
  percentLabel: string // e.g. "42%"
  className?: string
}) {
  const clamped = Math.max(0, Math.min(1, progress))
  const colorVar =
    status === 'healthy'
      ? 'var(--senlie)'
      : status === 'warning'
        ? 'var(--warning)'
        : 'var(--negative)'

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <svg
        viewBox="0 0 200 200"
        width="200"
        height="200"
        fill="none"
        aria-hidden="true"
        className="overflow-visible"
      >
        {/* Track */}
        <path
          d={FULL_TRACK}
          stroke="var(--muted)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          opacity={0.55}
        />
        {/* Progress — animated with pathLength */}
        <motion.path
          d={FULL_TRACK}
          stroke={colorVar}
          strokeWidth={STROKE}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clamped }}
          transition={{ type: 'spring', stiffness: 55, damping: 18, mass: 1 }}
        />
        {/* Knob dot at the leading edge — static position, no animation to avoid cx/cy issues */}
        <circle
          r={STROKE / 2 + 1}
          fill={colorVar}
          cx={polar(START_ANGLE + clamped * SWEEP).x}
          cy={polar(START_ANGLE + clamped * SWEEP).y}
          opacity={0.95}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-semibold tracking-tight tnum text-foreground">
          {percentLabel}
        </span>
      </div>
    </div>
  )
}
