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
  KeyRound,
  Loader2,
} from 'lucide-react'
import { useSenlieUI, type SettingsView } from '@/lib/store'
import { useAuth } from '@/lib/auth-store'
import { useHomeSummary, useAccountsAndCategories, useRecurring, useHaptic } from '@/hooks/use-senlie-data'
import { useT } from '@/hooks/use-t'
import { SenlieSymbol } from '@/components/senlie/senlie-symbol'
import { InstallAppRow } from '@/components/pwa/install-app-row'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ProfileView } from '@/components/senlie/profile-view'
import { biometricEnabled, disableBiometricUnlock, enableBiometricUnlock, platformBiometricsAvailable } from '@/lib/biometric-lock'
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
  const t = useT()
  const open = useSenlieUI((s) => s.settingsOpen)
  const setOpen = useSenlieUI((s) => s.setSettingsOpen)
  const settingsView = useSenlieUI((s) => s.settingsView)
  const setSettingsView = useSenlieUI((s) => s.setSettingsView)

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerContent className="senlie-sheet senlie-full-sheet">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center text-[17px] font-semibold tracking-tight">
            {settingsView === null ? t('settings.profile') : ''}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {t('settings.manageProfile')}
          </DrawerDescription>
        </DrawerHeader>

        <div className="senlie-sheet-scroll px-5 pb-[max(env(safe-area-inset-bottom),24px)]">
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
              {settingsView === 'profile' && <ProfileView />}
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
  const [passwordOpen, setPasswordOpen] = React.useState(false)
  const [biometricOn, setBiometricOn] = React.useState(false)
  const [biometricSupported, setBiometricSupported] = React.useState<boolean | null>(null)
  const [biometricBusy, setBiometricBusy] = React.useState(false)

  React.useEffect(() => {
    if (!authUser) return
    setBiometricOn(biometricEnabled(authUser.id))
    platformBiometricsAvailable().then(setBiometricSupported).catch(() => setBiometricSupported(false))
  }, [authUser?.id])

  const userName = home?.user.name ?? authUser?.name ?? (language === 'es' ? 'Amigo' : 'Friend')
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
          className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-[20px] font-semibold text-white"
          style={{ backgroundColor: home?.user.avatarColor ?? 'var(--senlie)' }}
        >
          {(home?.user.avatarUrl || authUser?.avatarUrl) ? (
            <img src={home?.user.avatarUrl || authUser?.avatarUrl || ''} alt="" className="h-full w-full object-cover" />
          ) : (
            userName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <div className="text-[17px] font-semibold tracking-tight">{userName}</div>
          <div className="text-[13px] text-muted-foreground">{authUser?.email ?? ''}</div>
        </div>
        <button
          onClick={() => {
            haptic('light')
            goTo('profile')
          }}
          className="rounded-full bg-muted px-3 py-1.5 text-[12px] font-medium text-muted-foreground"
        >
          {t('settings.edit')}
        </button>
      </div>

      {/* Account */}
      <SectionLabel>{t('settings.accountSection')}</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          icon={KeyRound}
          label={t('settings.password')}
          value={t('settings.passwordValue')}
          onClick={() => setPasswordOpen(true)}
          last
        />
      </SettingsGroup>
      <PasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />

      {/* Financial settings */}
      <SectionLabel>{t('settings.financialSettings')}</SectionLabel>
      <SettingsGroup>
        <SettingsRow
          icon={Wallet}
          label={t('settings.accounts')}
          value={t('settings.accountsValue', { count: accountCount })}
          onClick={() => goTo('accounts')}
        />
        <SettingsRow
          icon={Tags}
          label={t('settings.categories')}
          value={t('settings.categoriesValue', { count: categoryCount })}
          onClick={() => goTo('categories')}
        />
        <SettingsRow
          icon={RefreshCw}
          label={t('settings.recurring')}
          value={t('settings.recurringValue', { count: recurringCount })}
          onClick={() => goTo('recurring')}
        />
        <SettingsRow
          icon={Target}
          label={t('settings.savingsGoals')}
          onClick={() => goTo('goals')}
        />
        <SettingsRow
          icon={SlidersHorizontal}
          label={t('settings.budgetPreferences')}
          onClick={() => goTo('budgetPrefs')}
        />
        <SettingsRow
          icon={Coins}
          label={t('settings.currency')}
          value={`${home?.user.currencySymbol ?? 'RD$'} · ${home?.user.currencyCode ?? 'DOP'}`}
          onClick={() => goTo('currency')}
        />
        <SettingsRow
          icon={CalendarDays}
          label={t('settings.startOfMonth')}
          value={t('settings.startDayValue', { day: home?.user.monthStartDay ?? 1 })}
          onClick={() => goTo('startOfMonth')}
        />
        <SettingsRow
          icon={CalendarClock}
          label={t('settings.paySchedule')}
          value={
            home?.paySchedule.schedule === 'monthly' ? t('sv.monthly') :
            home?.paySchedule.schedule === 'weekly' ? t('sv.weekly') :
            home?.paySchedule.schedule === 'custom' ? t('sv.irregular') :
            t('sv.biweekly')
          }
          onClick={() => goTo('paySchedule')}
          last
        />
      </SettingsGroup>

      {/* Appearance */}
      <SectionLabel>{t('settings.appearance')}</SectionLabel>
      <SettingsGroup>
        <div className="p-3">
          <div className="mb-2 text-[13px] text-muted-foreground">{t('settings.theme')}</div>
          <div className="flex gap-1 rounded-[12px] bg-muted p-1">
            {([
              { key: 'light', label: t('settings.light'), icon: Sun },
              { key: 'dark', label: t('settings.dark'), icon: Moon },
              { key: 'system', label: t('settings.system'), icon: Monitor },
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
          label={t('settings.language')}
          value={language === 'es' ? 'Español' : 'English'}
          onClick={() => goTo('language')}
          last
        />
      </SettingsGroup>

      {/* Privacy */}
      <SectionLabel>{t('settings.privacy')}</SectionLabel>
      <SettingsGroup>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <RowIcon icon={hideBalances ? EyeOff : Eye} />
            <div>
              <div className="text-[15px] font-medium">{t('settings.hideBalances')}</div>
              <div className="text-[12px] text-muted-foreground">
                {t('settings.hideBalancesDesc')}
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
        <SettingsRow
          icon={Fingerprint}
          label={t('bio.settingTitle')}
          value={biometricSupported === false ? t('bio.notSupported') : biometricOn ? t('settings.on') : t('settings.off')}
          onClick={async () => {
            if (!authUser || biometricBusy) return
            haptic('medium')
            if (biometricOn) {
              disableBiometricUnlock(authUser.id)
              setBiometricOn(false)
              toast.success(t('bio.disabled'))
              return
            }
            setBiometricBusy(true)
            try {
              await enableBiometricUnlock({ id: authUser.id, email: authUser.email, name: authUser.name })
              setBiometricOn(true)
              toast.success(t('bio.enabled'))
            } catch (e) {
              toast.error(t('bio.setupFailed'), { description: e instanceof Error ? e.message : undefined })
            } finally {
              setBiometricBusy(false)
            }
          }}
        />
        <SettingsRow
          icon={Shield}
          label={t('settings.appLock')}
          value={biometricOn ? t('bio.whenLeaving') : t('settings.off')}
          onClick={() => {
            haptic('light')
            toast.info(biometricOn ? t('bio.appLockActive') : t('bio.enableFirst'))
          }}
        />
        <SettingsRow
          icon={Bell}
          label={t('settings.notifications')}
          value={(() => {
            try {
              const s = JSON.parse(localStorage.getItem('senlie-notifications') || '{}')
              const count = Object.values(s).filter(Boolean).length
              return count > 0 ? t('settings.countOn', { count }) : t('settings.off')
            } catch {
              return t('settings.countOn', { count: 5 })
            }
          })()}
          onClick={() => goTo('notifications')}
          last
        />
      </SettingsGroup>

      {/* App */}
      <SectionLabel>{t('settings.app')}</SectionLabel>
      <SettingsGroup>
        <InstallAppRow />
      </SettingsGroup>

      {/* Data */}
      <SectionLabel>{t('settings.data')}</SectionLabel>
      <SettingsGroup>
        <SettingsRow icon={Download} label={t('settings.export')} onClick={() => goTo('export')} />
        <SettingsRow icon={Upload} label={t('settings.import')} onClick={async () => {
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
              toast.success(t('settings.importedTransactions', { count: result.imported }), {
                description: result.skipped > 0 ? t('settings.rowsSkipped', { count: result.skipped }) : undefined,
              })
              bumpData()
            } catch {
              haptic('warning')
              toast.error(t('settings.importFailed'), {
                description: t('settings.importHint'),
              })
            }
          }
          input.click()
        }} />
        <SettingsRow icon={DatabaseBackup} label={t('settings.backups')} value={t('settings.auto')} onClick={() => {
          haptic('light')
          toast.info(t('settings.backupsAutomatic'))
        }} last />
      </SettingsGroup>

      {/* About */}
      <SectionLabel>{t('settings.about')}</SectionLabel>
      <SettingsGroup>
        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
          <SenlieSymbol size={36} className="text-foreground" />
          <div className="text-[16px] font-semibold tracking-tight">Senlie Budget</div>
          <div className="text-[12px] text-muted-foreground">{t('settings.bySenlie')}</div>
          <div className="mt-1 text-[11px] text-muted-foreground/70">{t('settings.version')} 0.6.0</div>
          <div className="text-[11px] text-muted-foreground/70">{t('settings.tagline')}</div>
        </div>
        <SettingsRow
          icon={Shield}
          label={t('settings.termsPrivacy')}
          onClick={() => goTo('legal')}
          last
        />
      </SettingsGroup>

      {/* Sign out */}
      <button
        onClick={() => {
          haptic('light')
          signOut()
          toast.success(t('settings.signedOut'))
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] bg-card py-3.5 text-[15px] font-medium text-negative transition-colors active:scale-[0.99]"
      >
        <LogOut size={18} />
        {t('settings.signOut')}
      </button>
    </>
  )
}


function PasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const updatePassword = useAuth((s) => s.updatePassword)
  const isLoading = useAuth((s) => s.isLoading)
  const storeError = useAuth((s) => s.error)
  const clearError = useAuth((s) => s.clearError)
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [localError, setLocalError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setPassword('')
      setConfirmPassword('')
      setLocalError(null)
      clearError()
    }
  }, [open, clearError])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()
    if (password.length < 8) {
      setLocalError(t('auth.passwordHint'))
      return
    }
    if (password !== confirmPassword) {
      setLocalError(t('settings.passwordMismatch'))
      return
    }

    try {
      await updatePassword(password)
      toast.success(t('settings.passwordUpdated'))
      onOpenChange(false)
    } catch {
      // Auth store owns the backend-visible error.
    }
  }

  const error = localError ?? storeError

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[390px] rounded-[22px] border-border/60 p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[20px] tracking-tight">{t('settings.passwordDialogTitle')}</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            {t('settings.passwordDialogDesc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="senlie-new-password">{t('settings.newPassword')}</Label>
            <Input
              id="senlie-new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) {
                  setLocalError(null)
                  clearError()
                }
              }}
              placeholder={t('settings.atLeast8')}
              className="h-12 rounded-[14px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senlie-confirm-password">{t('settings.confirmPassword')}</Label>
            <Input
              id="senlie-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (error) {
                  setLocalError(null)
                  clearError()
                }
              }}
              placeholder={t('settings.repeatPassword')}
              className="h-12 rounded-[14px]"
            />
          </div>
          {error && (
            <div className="rounded-[12px] bg-negative/10 px-3 py-2.5 text-[13px] text-negative">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--senlie)] text-[15px] font-semibold text-[var(--senlie-foreground)] transition-all hover:opacity-95 disabled:opacity-60"
          >
            {isLoading ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />}
            {isLoading ? t('settings.saving') : t('settings.savePassword')}
          </button>
          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            {t('settings.passwordLegacyHint')}
          </p>
        </form>
      </DialogContent>
    </Dialog>
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
