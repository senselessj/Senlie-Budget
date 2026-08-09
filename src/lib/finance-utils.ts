// Senlie Budget — Pure utility helpers for the financial engine.
//
// This module is INTENTIONALLY free of any server-only imports.

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

const KNOWN_ICON_NAMES = new Set([
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
  'pencil', 'pen-tool', 'paperclip', 'phone-call', 'voicemail',
  'message-circle', 'at-sign', 'rocket', 'sparkles', 'gem', 'crown', 'trophy',
  'monitor', 'tablet', 'headphones', 'camera', 'watch', 'keyboard', 'mouse',
  'printer', 'backpack', 'bike', 'credit-card', 'safe', 'coins', 'cash',
])

// Convert a stored kebab-case icon id into the actual lucide-react export name.
// The old implementation returned the kebab-case string directly, which meant
// many choices silently fell back to the Tag/Wallet icon.
export function lucideIcon(name: string | null | undefined): string {
  const raw = name && KNOWN_ICON_NAMES.has(name) ? name : 'tag'
  return raw
    .split('-')
    .map((part) => /^\d+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}
