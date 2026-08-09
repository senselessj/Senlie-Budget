'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Home, ArrowLeftRight, PieChart, Sparkles, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSenlieUI, type TabKey } from '@/lib/store'
import { useHaptic } from '@/hooks/use-senlie-data'
import { useT } from '@/hooks/use-t'

const TABS: { key: TabKey; labelKey: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { key: 'home', labelKey: 'tab.home', icon: Home },
  { key: 'activity', labelKey: 'tab.activity', icon: ArrowLeftRight },
  { key: 'budget', labelKey: 'tab.budget', icon: PieChart },
  { key: 'insights', labelKey: 'tab.insights', icon: Sparkles },
]

export function BottomTabBar() {
  const activeTab = useSenlieUI((s) => s.activeTab)
  const setActiveTab = useSenlieUI((s) => s.setActiveTab)
  const setAddSheetOpen = useSenlieUI((s) => s.setAddSheetOpen)
  const addSheetOpen = useSenlieUI((s) => s.addSheetOpen)
  const editingTransactionId = useSenlieUI((s) => s.editingTransactionId)
  const settingsOpen = useSenlieUI((s) => s.settingsOpen)
  const addEntityType = useSenlieUI((s) => s.addEntityType)
  const selectedTransactionId = useSenlieUI((s) => s.selectedTransactionId)
  const activityFilterOpen = useSenlieUI((s) => s.activityFilterOpen)
  const t = useT()
  const haptic = useHaptic()

  // Primary navigation should never sit on top of a modal sheet. Besides
  // looking wrong, this used to physically block the bottom CTA on phones.
  const modalOpen =
    addSheetOpen ||
    Boolean(editingTransactionId) ||
    settingsOpen ||
    Boolean(addEntityType) ||
    Boolean(selectedTransactionId) ||
    activityFilterOpen

  if (modalOpen) return null

  return (
    <div data-senlie-tabbar className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),14px)] transition-all duration-200">
      <div className="pointer-events-auto relative">
        {/* Floating + button — centered above the tab bar */}
        <motion.button
          onClick={(e) => {
            haptic('medium')
            setAddSheetOpen(true)
            // Blur immediately so focus doesn't linger on a button that
            // becomes aria-hidden when the drawer overlay mounts.
            ;(e.currentTarget as HTMLButtonElement).blur()
          }}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="absolute left-1/2 -top-7 z-10 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-float"
          style={{ backgroundColor: 'var(--senlie)' }}
          aria-label={t('accessibility.addTransaction')}
        >
          <Plus size={26} strokeWidth={2.6} />
        </motion.button>

        {/* Tab bar — translucent glass */}
        <nav
          className="glass flex items-center justify-around rounded-[26px] px-3 py-2 shadow-float"
          style={{
            width: 'min(94vw, 420px)',
            height: 58,
          }}
          aria-label={t('accessibility.primaryNavigation')}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => {
                  haptic('light')
                  setActiveTab(tab.key)
                }}
                className={cn(
                  'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-[18px] py-1.5 transition-colors',
                  isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-[18px]"
                    style={{ backgroundColor: 'var(--senlie-soft)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="relative"
                  style={isActive ? { color: 'var(--senlie)' } : undefined}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                </motion.div>
                <span
                  className={cn(
                    'relative text-[10px] font-semibold tracking-tight',
                    isActive ? 'opacity-100' : 'opacity-75'
                  )}
                  style={isActive ? { color: 'var(--senlie)' } : undefined}
                >
                  {t(tab.labelKey)}
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
