'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// The Senlie symbol — an "S" formed by two interlocking financial curves.
// Geometric, rounded, recognizable at 16px. Single primary color.
export function SenlieSymbol({
  size = 24,
  className,
  strokeWidth = 2.2,
}: {
  size?: number
  className?: string
  strokeWidth?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('brand-symbol', className)}
      aria-hidden="true"
    >
      {/* Top curve — sweeping down-right */}
      <path
        d="M19 7C19 4.79086 16.7614 3 14 3C11.2386 3 9 4.79086 9 7C9 9.20914 11.2386 11 14 11C16.7614 11 19 12.7909 19 15C19 17.2091 16.7614 19 14 19C11.2386 19 9 17.2091 9 15"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Bottom curve — interlocking */}
      <path
        d="M5 17C5 19.2091 7.23858 21 10 21C12.7614 21 15 19.2091 15 17C15 14.7909 12.7614 13 10 13C7.23858 13 5 11.2091 5 9C5 6.79086 7.23858 5 10 5C12.7614 5 15 6.79086 15 9"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  )
}
