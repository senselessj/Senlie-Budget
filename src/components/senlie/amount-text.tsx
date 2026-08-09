'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { formatMoney, maskBalance, type CurrencyConfig } from '@/lib/currency'

// Renders a financial amount with tabular numerals and signed styling.
// Respects hideBalances via the `hidden` prop.
export function AmountText({
  value,
  currency,
  hidden = false,
  signed = false,
  sign,
  className,
  symbol = 'RD$',
}: {
  value: number
  currency?: Partial<CurrencyConfig>
  hidden?: boolean
  signed?: boolean
  sign?: 'positive' | 'negative' | 'neutral'
  className?: string
  symbol?: string
}) {
  if (hidden) {
    return (
      <span className={cn('tnum tabular-nums tracking-tight', className)}>
        {maskBalance(symbol)}
      </span>
    )
  }

  const isNegative = value < 0
  const display = formatMoney(value, { ...currency, symbol })

  let colorClass = ''
  if (sign === 'positive') colorClass = 'text-positive'
  else if (sign === 'negative') colorClass = 'text-negative'
  else if (signed && isNegative) colorClass = 'text-foreground'
  else if (signed && !isNegative) colorClass = 'text-positive'

  return (
    <span className={cn('tnum tabular-nums tracking-tight', colorClass, className)}>
      {display}
    </span>
  )
}
