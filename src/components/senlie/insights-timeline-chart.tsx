'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCompact, formatMoney, maskBalance } from '@/lib/currency'
import type { InsightsSummary } from '@/lib/types'

type TimelinePoint = InsightsSummary['timeline'][number]

// Cumulative-spend line chart for the Insights tab.
// Two Recharts Lines:
//   • thisMonth — senlie accent, solid, 2.5 stroke, no dots
//   • lastMonth — muted foreground, dashed, 1.5 stroke
//
// Uses explicit hex colors (resolved from theme) because Recharts passes
// `stroke` as an SVG attribute, which does NOT resolve CSS var() in most browsers.
export function InsightsTimelineChart({
  timeline,
  symbol,
  hideBalances,
}: {
  timeline: TimelinePoint[]
  symbol: string
  hideBalances: boolean
}) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const senlieColor = isDark ? '#6E7BFF' : '#5965F3'
  const mutedColor = isDark ? '#98989D' : '#6E6E73'
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="bg-card shadow-card rounded-[20px] p-5"
    >
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={timeline}
          margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={borderColor}
            opacity={0.6}
          />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: mutedColor }}
            tickFormatter={(d: number) => {
              if (d === 1 || d === 8 || d === 15 || d === 22 || d === 31) {
                return `${d}`
              }
              return ''
            }}
            interval={0}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fontSize: 11, fill: mutedColor }}
            tickFormatter={(v: number) => formatCompact(v, symbol)}
          />
          <Tooltip
            cursor={{
              stroke: senlieColor,
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
            content={<CustomTooltip symbol={symbol} hideBalances={hideBalances} senlieColor={senlieColor} mutedColor={mutedColor} />}
          />
          <Line
            type="monotone"
            dataKey="lastMonth"
            stroke={mutedColor}
            strokeOpacity={0.4}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey="thisMonth"
            stroke={senlieColor}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: senlieColor, strokeWidth: 0 }}
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

function CustomTooltip({
  active,
  payload,
  label,
  symbol,
  hideBalances,
  senlieColor,
  mutedColor,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: number
  symbol: string
  hideBalances: boolean
  senlieColor: string
  mutedColor: string
}) {
  if (!active || !payload || payload.length === 0) return null

  const thisMonth = payload.find((p) => p.dataKey === 'thisMonth')?.value ?? 0
  const lastMonth = payload.find((p) => p.dataKey === 'lastMonth')?.value ?? 0

  const fmt = (n: number) =>
    hideBalances ? maskBalance(symbol) : formatMoney(n, { symbol, decimalPlaces: 0 })

  const bg = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
    ? '#202023'
    : '#FFFFFF'
  const border = typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
    ? 'rgba(255,255,255,0.08)'
    : 'rgba(0,0,0,0.06)'

  return (
    <div
      className="rounded-[12px] p-3 shadow-float"
      style={{ backgroundColor: bg, border: `1px solid ${border}` }}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Day {label}
      </p>
      <div className="mt-1.5 space-y-1">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: senlieColor }}
          />
          <span className="text-[12px] text-muted-foreground">This month</span>
          <span className="ml-auto text-[12px] font-semibold tnum text-foreground">
            {fmt(thisMonth)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: mutedColor, opacity: 0.4 }}
          />
          <span className="text-[12px] text-muted-foreground">Last month</span>
          <span className="ml-auto text-[12px] font-semibold tnum text-foreground">
            {fmt(lastMonth)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function TimelineLegend() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const senlieColor = isDark ? '#6E7BFF' : '#5965F3'
  const mutedColor = isDark ? '#98989D' : '#6E6E73'
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: senlieColor }}
        />
        <span className="text-[12px] text-muted-foreground">This month</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: mutedColor, opacity: 0.4 }}
        />
        <span className="text-[12px] text-muted-foreground">Last month</span>
      </span>
    </div>
  )
}
