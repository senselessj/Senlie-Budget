'use client'

import * as React from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet,
  Tags,
  RefreshCw,
  SlidersHorizontal,
  Coins,
  CalendarDays,
  CalendarClock,
  Sun,
  Moon,
  Monitor,
  Eye,
  EyeOff,
  Fingerprint,
  Bell,
  Download,
  Upload,
  DatabaseBackup,
  ChevronRight,
  LogOut,
  Shield,
  Target,
  Globe,
} from 'lucide-react'
import { useSenlieUI, type SettingsView } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { useHomeSummary, useAccountsAndCategories, useRecurring, useHaptic } from '@/hooks/use-senlie-data'
import { useT } from '@/hooks/use-t'
import { SenlieSymbol } from '@/components/senlie/senlie-symbol'
import { InstallAppRow } from '@/components/pwa/install-app-row'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  AccountsView,
  CategoriesView,
  RecurringView,
  GoalsView,
  CurrencyView,
  PayScheduleView,
  StartOfMonthView,
  BudgetPrefsView,
  NotificationsView,
  ExportView,
  LanguageView,
  LegalView,
} from '@/components/senlie/settings-views'

export function SettingsSheet() {
  const open = useSenlieUI((s) => s.settingsOpen)
  const setOpen = useSenlieUI((s) => s.setSettingsOpen)
  const settingsView = useSenlieUI((s) => s.settingsView)
  const setSettingsView = useSenlieUI((s) => s.setSettingsView)

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="max-h-[94vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center text-[17px] font-semibold tracking-tight">
            {settingsView === null ? 'Profile' : ''}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Manage your profile and app settings
          </DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[80vh] overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),24px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={settingsView ?? 'root'}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {settingsView === null && <SettingsRoot />}
              {settingsView === 'accounts' && <AccountsView />}
              {settingsView === 'categories' && <CategoriesView />}
              {settingsView === 'recurring' && <RecurringView />}
              {settingsView === 'goals' && <GoalsView />}
              {settingsView === 'currency' && <CurrencyView />}
              {settingsView === 'paySchedule' && <PayScheduleView />}
              {settingsView === 'startOfMonth' && <StartOfMonthView />}
              {settingsView === 'budgetPrefs' && <BudgetPrefsView />}
              {settingsView === 'notifications' && <NotificationsView />}
              {settingsView === 'export' && <ExportView />}
              {settingsView === 'language' && <LanguageView />}
              {settingsView === 'legal' && <LegalView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function SettingsRoot() {
  const hideBalances = useSenlieUI((s) => s.hideBalances)
  const toggleHideBalances = useSenlieUI((s) => s.toggleHideBalances)
  const setSettingsView = useSenlieUI((s) => s.setSettingsView)
  const bumpData = useSenlieUI((s) => s.bumpData)
  const language = useSenlieUI((s) => s.language)
  const signOut = useAuth((s) => s.signOut)
  const authUser = useAuth((s) => s.user)
  const { theme, setTheme } = useTheme()
  const t = useT()
  const { data: home } = useHomeSummary()
  const { data: pickers } = useAccountsAndCategories()
  const { data: recurring } = useRecurring()
  const haptic = useHaptic()

  const userName = home?.user.name ?? authUser?.name ?? 'Friend'
  const accountCount = pickers?.accounts.length ?? 4
  const categoryCount = pickers?.categories.length ?? 12
  const recurringCount = recurring?.length ?? 4

  const goTo = (v: SettingsView) => {
    haptic('light')
    setSettingsView(v)
  }

  return (
    <>
      {/* User card */}
      <div className="flex items-center gap-3 rounded-[18px] bg-card p-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full text-[20px] font-semibold text-white"
          style={{ backgroundColor: home?.user.avatarColor ?? 'var(--senlie)' }}
        >
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="text-[17px] font-semibold tracking-tight">{userName}</div>
          <div className="text-[13px] text-muted-foreground">{authUser?.email ?? ''}</div>
        </div>
        <button
          onClick={async () => {
            haptic('light')
            const newName = window.prompt('Your name', userName)
            if (newName && newName.trim() && newName !== userName) {
              try {
                const res = await fetch('/api/budget/user', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: newName.trim() }),
                })
                if (!res.ok) throw new Error('Failed')
                toast.success('Name updated.')
                bumpData()
              } catch {
                toast.error("Couldn't update name.")
              }
            }
          }}
          className="rounded-full bg-muted px-3 py-1.5 text-[12px] font-medium text-muted-foreground"
        >
          Edit
        </button>
      </div>

      {/* Financial settings */}
      <SectionLabel>Financial settings</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          icon={Wallet}
          label="Accounts"
          value={`${accountCount} accounts`}
          onClick={() => goTo('accounts')}
        />
        <SettingsRow
          icon={Tags}
          label="Categories"
          value={`${categoryCount} categories`}
          onClick={() => goTo('categories')}
        />
        <SettingsRow
          icon={RefreshCw}
          label="Recurring transactions"
          value={`${recurringCount} active`}
          onClick={() => goTo('recurring')}
        />
        <SettingsRow
          icon={Target}
          label="Savings goals"
          onClick={() => goTo('goals')}
        />
        <SettingsRow
          icon={SlidersHorizontal}
          label="Budget preferences"
          onClick={() => goTo('budgetPrefs')}
        />
        <SettingsRow
          icon={Coins}
          label="Currency"
          value={`${home?.user.currencySymbol ?? 'RD$'} · ${home?.user.currencyCode ?? 'DOP'}`}
          onClick={() => goTo('currency')}
        />
        <SettingsRow
          icon={CalendarDays}
          label="Start of month"
          value="1st"
          onClick={() => goTo('startOfMonth')}
        />
        <SettingsRow
          icon={CalendarClock}
          label="Pay schedule"
          value={
            home?.paySchedule.schedule
              ? home.paySchedule.schedule.charAt(0).toUpperCase() +
                home.paySchedule.schedule.slice(1)
              : 'Biweekly'
          }
          onClick={() => goTo('paySchedule')}
          last
        />
      </SettingsGroup>

      {/* Appearance */}
      <SectionLabel>Appearance</SectionLabel>
      <SettingsGroup>
        <div className="p-3">
          <div className="mb-2 text-[13px] text-muted-foreground">Theme</div>
          <div className="flex gap-1 rounded-[12px] bg-muted p-1">
            {([
              { key: 'light', label: 'Light', icon: Sun },
              { key: 'dark', label: 'Dark', icon: Moon },
              { key: 'system', label: 'System', icon: Monitor },
            ] as const).map((opt) => {
              const isActive = theme === opt.key
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    haptic('light')
                    setTheme(opt.key)
                  }}
                  className={cn(
                    'relative flex flex-1 items-center justify-center gap-1.5 rounded-[9px] py-2 text-[13px] font-medium transition-colors',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="theme-pill"
                      className="absolute inset-0 rounded-[9px] bg-card shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <opt.icon size={15} className="relative" />
                  <span className="relative">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <SettingsRow
          icon={Globe}
          label="Language"
          value={language === 'es' ? 'Español' : 'English'}
          onClick={() => goTo('language')}
          last
        />
      </SettingsGroup>

      {/* Privacy */}
      <SectionLabel>Privacy</SectionLabel>
      <SettingsGroup>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <RowIcon icon={hideBalances ? EyeOff : Eye} />
            <div>
              <div className="text-[15px] font-medium">Hide balances</div>
              <div className="text-[12px] text-muted-foreground">
                Mask all financial amounts
              </div>
            </div>
          </div>
          <Switch
            checked={hideBalances}
            onCheckedChange={() => {
              haptic('medium')
              toggleHideBalances()
            }}
          />
        </div>
        <SettingsRow icon={Fingerprint} label="Face ID" value="Immediately" onClick={() => {
          haptic('light')
          toast.info('Face ID — managed by your device')
        }} />
        <SettingsRow icon={Shield} label="App lock" value="On" onClick={() => {
          haptic('light')
          toast.info('App lock — managed by your device')
        }} />
        <SettingsRow
          icon={Bell}
          label={t('settings.notifications')}
          value={(() => {
            try {
              const s = JSON.parse(localStorage.getItem('senlie-notifications') || '{}')
              const count = Object.values(s).filter(Boolean).length
              return count > 0 ? `${count} on` : 'Off'
            } catch {
              return '5 on'
            }
          })()}
          onClick={() => goTo('notifications')}
          last
        />
      </SettingsGroup>

      {/* App */}
      <SectionLabel>App</SectionLabel>
      <SettingsGroup>
        <InstallAppRow />
      </SettingsGroup>

      {/* Data */}
      <SectionLabel>Data</SectionLabel>
      <SettingsGroup>
        <SettingsRow icon={Download} label="Export" onClick={() => goTo('export')} />
        <SettingsRow icon={Upload} label="Import" onClick={async () => {
          haptic('light')
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = '.csv,text/csv'
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
            try {
              const text = await file.text()
              const res = await fetch('/api/budget/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ csv: text }),
              })
              if (!res.ok) throw new Error('Import failed')
              const result = await res.json()
              haptic('success')
              toast.success(`Imported ${result.imported} transactions`, {
                description: result.skipped > 0 ? `${result.skipped} rows skipped` : undefined,
              })
              bumpData()
            } catch {
              haptic('warning')
              toast.error("Couldn't import the file.", {
                description: 'Make sure it\'s a valid CSV exported from Senlie Budget.',
              })
            }
          }
          input.click()
        }} />
        <SettingsRow icon={DatabaseBackup} label="Backups" value="Auto" onClick={() => {
          haptic('light')
          toast.info('Backups are automatic and local-first.')
        }} last />
      </SettingsGroup>

      {/* About */}
      <SectionLabel>About</SectionLabel>
      <SettingsGroup>
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <SenlieSymbol size={36} className="text-foreground" />
          <div className="text-[16px] font-semibold tracking-tight">Senlie Budget</div>
          <div className="text-[12px] text-muted-foreground">by Senlie Technologies</div>
          <div className="mt-1 text-[11px] text-muted-foreground/70">Version 0.4.3</div>
          <div className="text-[11px] text-muted-foreground/70">Your money, clearly.</div>
        </div>
        <SettingsRow
          icon={Shield}
          label="Terms & Privacy"
          onClick={() => goTo('legal')}
          last
        />
      </SettingsGroup>

      {/* Sign out */}
      <button
        onClick={() => {
          haptic('light')
          signOut()
          toast.success('Signed out')
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] bg-card py-3.5 text-[15px] font-medium text-negative transition-colors active:scale-[0.99]"
      >
        <LogOut size={18} />
        Sign out
      </button>
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-6 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  )
}

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-[16px] bg-card">{children}</div>
}

function RowIcon({ icon: Icon }: { icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-muted text-muted-foreground">
      <Icon size={16} strokeWidth={2.2} />
    </div>
  )
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
  last,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
  value?: string
  onClick?: () => void
  last?: boolean
}) {
  const haptic = useHaptic()
  return (
    <button
      onClick={() => {
        haptic('light')
        onClick?.()
      }}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/50',
        !last && 'border-b border-border/50'
      )}
    >
      <RowIcon icon={Icon} />
      <span className="flex-1 text-[15px] font-medium">{label}</span>
      {value && <span className="text-[13px] text-muted-foreground">{value}</span>}
      <ChevronRight size={16} className="text-muted-foreground/40" />
    </button>
  )
}
