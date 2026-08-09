'use client'

import * as React from 'react'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import { lucideIcon } from '@/lib/finance-utils'

// Renders a Lucide icon by name inside a softly-tinted rounded square.
// Used everywhere a category/merchant/account icon is needed.
// Pure SVG — no emojis.
export function CategoryIcon({
  name,
  color = '#5965F3',
  size = 40,
  iconSize = 20,
  className,
  rounded = 'rounded-[14px]',
}: {
  name: string
  color?: string
  size?: number
  iconSize?: number
  className?: string
  rounded?: string
}) {
  const iconName = lucideIcon(name)
  const Icon = (LucideIcons as any)[iconName] as React.ComponentType<{
    size?: number
    strokeWidth?: number
    className?: string
  }>

  if (!Icon) {
    // Fallback — Tag icon, guaranteed to exist
    const Fallback = LucideIcons.Tag
    return (
      <div
        className={cn('flex items-center justify-center shrink-0', rounded, className)}
        style={{
          width: size,
          height: size,
          backgroundColor: `${color}1A`, // 10% alpha
          color,
        }}
      >
        <Fallback size={iconSize} strokeWidth={2} />
      </div>
    )
  }

  return (
    <div
      className={cn('flex items-center justify-center shrink-0', rounded, className)}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}1A`,
        color,
      }}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </div>
  )
}

// Account icon — uses solid color background, white icon (iOS wallet style)
export function AccountIcon({
  name,
  color = '#5965F3',
  size = 40,
  iconSize = 20,
  className,
}: {
  name: string
  color?: string
  size?: number
  iconSize?: number
  className?: string
}) {
  const iconName = lucideIcon(name)
  const Icon = (LucideIcons as any)[iconName] as React.ComponentType<{
    size?: number
    strokeWidth?: number
    className?: string
  }>

  if (!Icon) {
    const Fallback = LucideIcons.Wallet
    return (
      <div
        className={cn('flex items-center justify-center shrink-0 rounded-[12px]', className)}
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          color: '#FFFFFF',
        }}
      >
        <Fallback size={iconSize} strokeWidth={2.2} />
      </div>
    )
  }

  return (
    <div
      className={cn('flex items-center justify-center shrink-0 rounded-[12px]', className)}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        color: '#FFFFFF',
      }}
    >
      <Icon size={iconSize} strokeWidth={2.2} />
    </div>
  )
}
