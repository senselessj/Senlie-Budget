// Senlie Budget — Pure utility helpers for the financial engine.
//
// This module is INTENTIONALLY free of any server-only imports
// (no `next/headers`, no `@/lib/db`, no `@/lib/auth-server`).
// Client components import these helpers directly so the server-only
// `finance.ts` module never gets pulled into a client bundle.

// Current application time anchor for server-side calculations.
export const TODAY = new Date()

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
}

export function monthName(month: number): string {
  return [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ][month - 1]
}

export function monthShort(month: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]
}

// Map stored category icon string -> Lucide icon name (verified names)
// We use the actual lucide-react icon names everywhere.
export function lucideIcon(name: string | null | undefined): string {
  const fallback = 'tag'
  if (!name) return fallback
  // Whitelist of icons we render in the UI (prevents crashes)
  const known = new Set([
    'home', 'shopping-cart', 'utensils', 'car', 'plug-zap', 'wifi', 'phone',
    'film', 'shopping-bag', 'heart-pulse', 'briefcase', 'laptop', 'tag',
    'landmark', 'piggy-bank', 'banknote', 'smartphone', 'wallet', 'target',
    'shield', 'gift', 'plane', 'graduation-cap', 'baby', 'paw-print',
    'house', 'book', 'gamepad-2', 'dumbbell', 'stethoscope', 'zap',
    'coffee', 'pizza', 'cart', 'bus', 'fuel', 'parking-circle', 'tv',
    'music', 'ticket', 'shirt', 'spider', 'cat', 'dog', 'tree-palm',
    'sun', 'moon', 'star', 'flame', 'snowflake', 'cloud', 'wind',
    'tool-box', 'wrench', 'paintbrush', 'scissors', 'hammer',
    'beer', 'wine', 'ice-cream-cone', 'cake', 'cookie',
    'heart', 'apple', 'carrot', 'egg', 'milk', 'sandwich',
    'building-2', 'key', 'door-open', 'sofa', 'lamp', 'bed',
    'graduation-cap', 'pencil', 'pen-tool', 'paperclip',
    'phone-call', 'voicemail', 'message-circle', 'at-sign',
    'rocket', 'sparkles', 'gem', 'crown', 'trophy',
  ])
  return known.has(name) ? name : fallback
}
