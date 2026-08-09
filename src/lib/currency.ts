// Senlie Budget — Currency formatting utility
// Supports DOP (RD$), USD ($), EUR (€) with configurable position/separators

export type CurrencyConfig = {
  code: string
  symbol: string
  position: 'prefix' | 'suffix'
  decimalPlaces: number
  thousandsSeparator: string
  decimalSeparator: string
}

export const CURRENCIES: Record<string, CurrencyConfig> = {
  DOP: {
    code: 'DOP',
    symbol: 'RD$',
    position: 'prefix',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    position: 'prefix',
    decimalPlaces: 2,
    thousandsSeparator: ',',
    decimalSeparator: '.',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    position: 'suffix',
    decimalPlaces: 2,
    thousandsSeparator: '.',
    decimalSeparator: ',',
  },
}

export function formatMoney(
  amount: number,
  config: Partial<CurrencyConfig> & { symbol?: string } = {}
): string {
  const cfg: CurrencyConfig = {
    code: 'DOP',
    symbol: config.symbol ?? 'RD$',
    position: config.position ?? 'prefix',
    decimalPlaces: config.decimalPlaces ?? 0,
    thousandsSeparator: config.thousandsSeparator ?? ',',
    decimalSeparator: config.decimalSeparator ?? '.',
  }

  const isNegative = amount < 0
  const abs = Math.abs(amount)
  const fixed = abs.toFixed(cfg.decimalPlaces)
  const [intPart, decPart] = fixed.split('.')
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, cfg.thousandsSeparator)
  const numStr = decPart ? `${withThousands}${cfg.decimalSeparator}${decPart}` : withThousands
  const sign = isNegative ? '-' : ''
  return cfg.position === 'prefix'
    ? `${sign}${cfg.symbol}${numStr}`
    : `${sign}${numStr}${cfg.symbol}`
}

// Compact form for chart labels: RD$16k, RD$1.2k
export function formatCompact(amount: number, symbol = 'RD$'): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`
  return `${sign}${symbol}${abs.toFixed(0)}`
}

// Masked value for hide-balances mode
export function maskBalance(symbol = 'RD$'): string {
  return `${symbol} ••••••`
}
