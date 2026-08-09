'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Plus, Check, Download, FileJson, FileText } from 'lucide-react'
import { useSenlieUI } from '@/lib/store'
import {
  useHomeSummary,
  useAccountsAndCategories,
  useRecurring,
  useGoals,
  useHaptic,
} from '@/hooks/use-senlie-data'
import { useLanguage } from '@/hooks/use-t'
import { LANGUAGES, translate } from '@/lib/i18n'
import { useT } from '@/hooks/use-t'
import { AccountIcon, CategoryIcon } from '@/components/senlie/category-icon'
import { formatMoney, maskBalance } from '@/lib/currency'
import { CURRENCIES } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'

// ============================================================================
// Accounts view — list all accounts with balances, types, icons
// ============================================================================
export function AccountsView() {
  const { data: pickers } = useAccountsAndCategories()
  const { data: home } = useHomeSummary()
  const symbol = home?.user.currencySymbol ?? 'RD$'
  const hideBalances = useSenlieUI((s) => s.hideBalances)
  const haptic = useHaptic()
  const t = useT()
  const accounts = pickers?.accounts ?? []

  const totalBalance = accounts.reduce((s, a) => s + a.currentBalance, 0)

  const typeLabelKey = (tp: string) =>
    ({
      checking: 'entity.accountTypeChecking',
      savings: 'entity.accountTypeSavings',
      cash: 'entity.accountTypeCash',
      credit: 'entity.accountTypeCredit',
      wallet: 'entity.accountTypeWallet',
    }[tp] ?? '')

  return (
    <DetailView title={t('sv.accounts')} subtitle={t('settings.accountsValue', { count: accounts.length })}>
      {/* Total balance hero */}
      <div className="rounded-[18px] bg-card p-5 shadow-card">
        <div className="text-[13px] text-muted-foreground">{t('sv.totalBalance')}</div>
        <div className="mt-1 text-[32px] font-semibold tracking-tight tnum">
          {hideBalances
            ? maskBalance(symbol)
            : formatMoney(totalBalance, { symbol, decimalPlaces: 0 })}
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          {t('sv.acrossAccounts', { count: accounts.length })}
        </div>
      </div>

      {/* Account list */}
      <div className="mt-4 space-y-2">
        {accounts.map((a, i) => (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => {
              haptic('light')
              toast.info(t('sv.accountBalanceToast', { name: a.name, amount: formatMoney(a.currentBalance, { symbol, decimalPlaces: 0 }) }))
            }}
            className="flex w-full items-center gap-3 rounded-[16px] bg-card p-4 text-left active:scale-[0.99]"
          >
            <AccountIcon name={a.icon} color={a.color} size={44} iconSize={22} />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-medium truncate">{a.name}</div>
              <div className="text-[12px] text-muted-foreground">
                {t(typeLabelKey(a.type))}
                {a.institution ? ` · ${a.institution}` : ''}
              </div>
            </div>
            <div className="text-[15px] font-semibold tnum">
              {hideBalances
                ? maskBalance(symbol)
                : formatMoney(a.currentBalance, { symbol, decimalPlaces: 0 })}
            </div>
          </motion.button>
        ))}
      </div>

      <AddButton label={t('sv.addAccount')} type="account" />
    </DetailView>
  )
}

// ============================================================================
// Categories view — list categories grouped by type
// ============================================================================
export function CategoriesView() {
  const { data: pickers } = useAccountsAndCategories()
  const haptic = useHaptic()
  const t = useT()
  const categories = pickers?.categories ?? []
  const expenses = categories.filter((c) => c.type === 'expense')
  const incomes = categories.filter((c) => c.type === 'income')

  return (
    <DetailView title={t('sv.categories')} subtitle={t('settings.categoriesValue', { count: categories.length })}>
      <CategoryGroup title={t('sv.expenses')} items={expenses} haptic={haptic} />
      <CategoryGroup title={t('sv.income')} items={incomes} haptic={haptic} />
      <AddButton label={t('sv.addCategory')} type="category" />
    </DetailView>
  )
}

function CategoryGroup({
  title,
  items,
  haptic,
}: {
  title: string
  items: Array<{ id: string; name: string; icon: string; color: string; type: string }>
  haptic: (i: 'light' | 'medium' | 'success' | 'warning') => void
}) {
  return (
    <div>
      <div className="mb-2 mt-4 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title} · {items.length}
      </div>
      <div className="overflow-hidden rounded-[16px] bg-card">
        {items.map((c, i) => (
          <button
            key={c.id}
            onClick={() => haptic('light')}
            className={cn(
              'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/50',
              i < items.length - 1 && 'border-b border-border/40'
            )}
          >
            <CategoryIcon name={c.icon} color={c.color} size={36} iconSize={18} />
            <span className="flex-1 text-[15px] font-medium">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Recurring transactions view
// ============================================================================
export function RecurringView() {
  const { data: recurring } = useRecurring()
  const { data: home } = useHomeSummary()
  const symbol = home?.user.currencySymbol ?? 'RD$'
  const hideBalances = useSenlieUI((s) => s.hideBalances)
  const haptic = useHaptic()
  const t = useT()
  const items = recurring ?? []

  const monthlyTotal = items.reduce((s, r) => s + r.amount, 0)

  return (
    <DetailView title={t('sv.recurring')} subtitle={t('settings.recurringValue', { count: items.length })}>
      {/* Monthly total */}
      <div className="rounded-[18px] bg-card p-5 shadow-card">
        <div className="text-[13px] text-muted-foreground">{t('sv.monthlyRecurring')}</div>
        <div className="mt-1 text-[28px] font-semibold tracking-tight tnum">
          {hideBalances
            ? maskBalance(symbol)
            : formatMoney(monthlyTotal, { symbol, decimalPlaces: 0 })}
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          {t('sv.acrossRecurring', { count: items.length })}
        </div>
      </div>

      {/* List */}
      <div className="mt-4 space-y-2">
        {items.map((r, i) => {
          const date = new Date(r.nextDate)
          const daysUntil = Math.ceil(
            (date.getTime() - new Date().getTime()) /
              (24 * 60 * 60 * 1000)
          )
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              className="flex items-center gap-3 rounded-[16px] bg-card p-4"
            >
              {r.category ? (
                <CategoryIcon
                  name={r.category.icon}
                  color={r.category.color}
                  size={44}
                  iconSize={22}
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-muted text-muted-foreground">
                  <Plus size={20} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-medium truncate">{r.name}</div>
                <div className="text-[12px] text-muted-foreground">
                  {r.category?.name ?? t('sv.recurringCategoryFallback')} ·{' '}
                  {daysUntil <= 0
                    ? t('sv.dueToday')
                    : daysUntil === 1
                      ? t('sv.dueTomorrow')
                      : t('sv.inDays', { days: daysUntil })}
                </div>
              </div>
              <div className="text-[15px] font-semibold tnum">
                {hideBalances
                  ? maskBalance(symbol)
                  : formatMoney(r.amount, { symbol, decimalPlaces: 0 })}
              </div>
            </motion.div>
          )
        })}
      </div>
      <AddButton label={t('sv.addRecurring')} type="recurring" />
    </DetailView>
  )
}

// ============================================================================
// Goals view — savings goals with progress
// ============================================================================
export function GoalsView() {
  const { data: goals } = useGoals()
  const { data: home } = useHomeSummary()
  const symbol = home?.user.currencySymbol ?? 'RD$'
  const hideBalances = useSenlieUI((s) => s.hideBalances)
  const setEditingGoalId = useSenlieUI((s) => s.setEditingGoalId)
  const t = useT()
  const { locale } = useLanguage()
  const items = goals ?? []

  const totalSaved = items.reduce((s, g) => s + g.currentAmount, 0)
  const totalTarget = items.reduce((s, g) => s + g.targetAmount, 0)

  return (
    <DetailView title={t('sv.goals')} subtitle={`${items.length}`}>
      {/* Summary */}
      <div className="rounded-[18px] bg-card p-5 shadow-card">
        <div className="text-[13px] text-muted-foreground">{t('sv.totalSaved')}</div>
        <div className="mt-1 text-[32px] font-semibold tracking-tight tnum">
          {hideBalances
            ? maskBalance(symbol)
            : formatMoney(totalSaved, { symbol, decimalPlaces: 0 })}
        </div>
        <div className="mt-1 text-[12px] text-muted-foreground">
          {t('sv.ofTarget', { amount: hideBalances ? maskBalance(symbol) : formatMoney(totalTarget, { symbol, decimalPlaces: 0 }) })}
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full"
            style={{
              width: `${totalTarget > 0 ? Math.min(100, (totalSaved / totalTarget) * 100) : 0}%`,
              backgroundColor: 'var(--senlie)',
            }}
          />
        </div>
      </div>

      {/* Goal cards */}
      <div className="mt-4 space-y-3">
        {items.map((g, i) => {
          const pct = Math.round(g.progress * 100)
          const color = g.color
          return (
            <motion.button
              type="button"
              key={g.id}
              onClick={() => setEditingGoalId(g.id)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              className="w-full rounded-[18px] bg-card p-4 text-left transition-transform active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <CategoryIcon name={g.icon} color={color} size={40} iconSize={20} />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium truncate">{g.name}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {g.targetDate
                      ? t('sv.targetDate', { date: new Date(g.targetDate).toLocaleDateString(locale, { month: 'short', year: 'numeric' }) })
                      : t('sv.noTargetDate')}
                  </div>
                </div>
                <div className="text-[13px] font-semibold tnum">{pct}%</div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className="h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[12px] tnum text-muted-foreground">
                <span>
                  {hideBalances
                    ? maskBalance(symbol)
                    : formatMoney(g.currentAmount, { symbol, decimalPlaces: 0 })}
                </span>
                <span>
                  {t('sv.ofTarget', { amount: hideBalances ? maskBalance(symbol) : formatMoney(g.targetAmount, { symbol, decimalPlaces: 0 }) })}
                </span>
              </div>
            </motion.button>
          )
        })}
      </div>
      <AddButton label={t('sv.addGoal')} type="goal" />
    </DetailView>
  )
}

// ============================================================================
// Currency selector
// ============================================================================
export function CurrencyView() {
  const haptic = useHaptic()
  const t = useT()
  const { data: home } = useHomeSummary()
  const current = home?.user.currencyCode ?? 'DOP'
  const bumpData = useSenlieUI((s) => s.bumpData)

  const options = Object.values(CURRENCIES)

  const sample = (code: string) => {
    const cfg = CURRENCIES[code]
    return formatMoney(1234.56, cfg)
  }

  const currencyNameKey = (code: string) =>
    code === 'DOP' ? 'sv.dominicanPeso' : code === 'USD' ? 'sv.usDollar' : 'sv.euro'

  return (
    <DetailView title={t('settings.currency')} subtitle={t('sv.primaryCurrency')}>
      <div className="overflow-hidden rounded-[16px] bg-card">
        {options.map((opt, i) => {
          const isActive = opt.code === current
          return (
            <button
              key={opt.code}
              onClick={async () => {
                haptic('medium')
                if (isActive) return
                try {
                  const res = await fetch('/api/budget/user', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currencyCode: opt.code }),
                  })
                  if (!res.ok) throw new Error('Failed')
                  toast.success(t('sv.currencySetTo', { code: opt.code }), {
                    description: `${opt.symbol} — ${sample(opt.code)}`,
                  })
                  bumpData()
                } catch {
                  toast.error(t('sv.couldntChangeCurrency'))
                }
              }}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/50',
                i < options.length - 1 && 'border-b border-border/40'
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-muted text-[14px] font-semibold">
                {opt.symbol}
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-medium">{opt.code}</div>
                <div className="text-[12px] text-muted-foreground">
                  {t(currencyNameKey(opt.code))} · {sample(opt.code)}
                </div>
              </div>
              {isActive && <Check size={20} style={{ color: 'var(--senlie)' }} />}
            </button>
          )
        })}
      </div>
      <p className="mt-3 px-1 text-[12px] text-muted-foreground">
        {t('sv.currencyFormatApplies')}
      </p>
    </DetailView>
  )
}

// ============================================================================
// Pay schedule selector
// ============================================================================
export function PayScheduleView() {
  const haptic = useHaptic()
  const bumpData = useSenlieUI((s) => s.bumpData)
  const t = useT()
  const { locale } = useLanguage()
  const { data: home } = useHomeSummary()
  const current = home?.paySchedule.schedule ?? 'biweekly'

  const options: { key: string; labelKey: string; descKey: string }[] = [
    { key: 'monthly', labelKey: 'sv.monthly', descKey: 'sv.onceMonth' },
    { key: 'biweekly', labelKey: 'sv.biweekly', descKey: 'sv.everyTwoWeeks' },
    { key: 'weekly', labelKey: 'sv.weekly', descKey: 'sv.everyWeek' },
    { key: 'custom', labelKey: 'onb.customized', descKey: 'onb.customizedDesc' },
  ]

  return (
    <DetailView title={t('settings.paySchedule')} subtitle={t('sv.howYouGetPaid')}>
      <div className="overflow-hidden rounded-[16px] bg-card">
        {options.map((opt, i) => {
          const isActive = opt.key === current
          return (
            <button
              key={opt.key}
              onClick={async () => {
                haptic('medium')
                if (isActive) return
                try {
                  const res = await fetch('/api/budget/user', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paySchedule: opt.key }),
                  })
                  if (!res.ok) throw new Error('Failed')
                  toast.success(t('sv.payScheduleSetTo', { label: t(opt.labelKey) }))
                  bumpData()
                } catch {
                  toast.error(t('sv.couldntChangePaySchedule'))
                }
              }}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/50',
                i < options.length - 1 && 'border-b border-border/40'
              )}
            >
              <div className="flex-1">
                <div className="text-[15px] font-medium">{t(opt.labelKey)}</div>
                <div className="text-[12px] text-muted-foreground">{t(opt.descKey)}</div>
              </div>
              {isActive && <Check size={20} style={{ color: 'var(--senlie)' }} />}
            </button>
          )
        })}
      </div>
      {home?.paySchedule && (
        <div className="mt-4 rounded-[16px] bg-card p-4">
          <div className="text-[13px] text-muted-foreground">{t('sv.nextPayday')}</div>
          <div className="mt-1 text-[17px] font-semibold">
            {new Date(home.paySchedule.nextPayDate).toLocaleDateString(locale, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div className="mt-0.5 text-[13px] text-muted-foreground tnum">
            {t('sv.expected')}{' '}
            {formatMoney(home.paySchedule.nextPayAmount, {
              symbol: home.user.currencySymbol,
              decimalPlaces: 0,
            })}
          </div>
        </div>
      )}
    </DetailView>
  )
}

// ============================================================================
// Start of month selector
// ============================================================================
export function StartOfMonthView() {
  const haptic = useHaptic()
  const t = useT()
  const { data: home } = useHomeSummary()
  const bumpData = useSenlieUI((s) => s.bumpData)
  const days = Array.from({ length: 28 }, (_, i) => i + 1)
  const current = home?.user.monthStartDay ?? 1

  return (
    <DetailView title={t('settings.startOfMonth')} subtitle={t('sv.dayEachBudget')}>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const isActive = d === current
          return (
            <button
              key={d}
              onClick={async () => {
                haptic('light')
                if (isActive) return
                try {
                  const res = await fetch('/api/budget/user', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ monthStartDay: d }),
                  })
                  if (!res.ok) throw new Error('Failed')
                  toast.success(t('sv.monthStartsOnDay', { day: d }))
                  bumpData()
                } catch {
                  toast.error(t('sv.couldntChangeStartOfMonth'))
                }
              }}
              className={cn(
                'flex h-11 items-center justify-center rounded-[12px] text-[14px] font-semibold tnum transition-colors',
                isActive ? 'text-white' : 'bg-card text-foreground active:scale-95'
              )}
              style={isActive ? { backgroundColor: 'var(--senlie)' } : undefined}
            >
              {d}
            </button>
          )
        })}
      </div>
      <p className="mt-3 px-1 text-[12px] text-muted-foreground">
        {t('sv.startOfMonthHint')}
      </p>
    </DetailView>
  )
}

// ============================================================================
// Budget preferences
// ============================================================================
export function BudgetPrefsView() {
  const haptic = useHaptic()
  const t = useT()
  const [rollover, setRollover] = React.useState(true)
  const [alertAt, setAlertAt] = React.useState(75)

  return (
    <DetailView title={t('settings.budgetPreferences')} subtitle={t('sv.howBudgetsBehave')}>
      {/* Rollover toggle */}
      <div className="rounded-[16px] bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-[15px] font-medium">{t('sv.rollover')}</div>
            <div className="text-[12px] text-muted-foreground">
              {t('sv.rolloverDesc')}
            </div>
          </div>
          <button
            onClick={() => {
              haptic('medium')
              setRollover((v) => !v)
            }}
            className={cn(
              'relative h-7 w-12 rounded-full transition-colors',
              rollover ? 'bg-positive' : 'bg-muted'
            )}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-white',
                rollover ? 'left-6' : 'left-1'
              )}
            />
          </button>
        </div>
      </div>

      {/* Alert threshold */}
      <div className="mt-3 rounded-[16px] bg-card p-4">
        <div className="text-[15px] font-medium">{t('sv.budgetAlert')}</div>
        <div className="text-[12px] text-muted-foreground">
          {t('sv.budgetAlertDesc', { percent: alertAt })}
        </div>
        <div className="mt-3 flex gap-2">
          {[50, 75, 90, 100].map((v) => (
            <button
              key={v}
              onClick={() => {
                haptic('light')
                setAlertAt(v)
              }}
              className={cn(
                'flex-1 rounded-[10px] py-2 text-[13px] font-semibold tnum transition-colors',
                alertAt === v
                  ? 'text-white'
                  : 'bg-muted text-muted-foreground active:scale-95'
              )}
              style={alertAt === v ? { backgroundColor: 'var(--senlie)' } : undefined}
            >
              {v}%
            </button>
          ))}
        </div>
      </div>

      {/* Category types explainer */}
      <div className="mt-3 rounded-[16px] bg-card p-4">
        <div className="text-[15px] font-medium">{t('sv.categoryTypes')}</div>
        <div className="mt-2 space-y-2 text-[13px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">{t('sv.fixed')}</span>
            <span>{t('sv.fixedDesc')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">{t('sv.flexible')}</span>
            <span>{t('sv.flexibleDesc')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">{t('sv.rolloverType')}</span>
            <span>{t('sv.rolloverTypeDesc')}</span>
          </div>
        </div>
      </div>
    </DetailView>
  )
}

// ============================================================================
// Notifications
// ============================================================================
export function NotificationsView() {
  const haptic = useHaptic()
  const t = useT()
  const bumpData = useSenlieUI((s) => s.bumpData)
  const [settings, setSettings] = React.useState({
    bills: true,
    budget: true,
    payday: true,
    weekly: true,
    insights: true,
  })

  // Load saved settings from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('senlie-notifications')
      if (saved) {
        setSettings(JSON.parse(saved))
      } else {
        // First visit — save defaults with ALL notifications ON
        localStorage.setItem('senlie-notifications', JSON.stringify(settings))
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  const toggleSetting = (key: keyof typeof settings) => {
    haptic('medium')
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    // Persist to localStorage
    try {
      localStorage.setItem('senlie-notifications', JSON.stringify(updated))
    } catch {
      // ignore
    }
    // Notify the server (for future server-side notification scheduling)
    fetch('/api/budget/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {})
    bumpData()
  }

  const items: { key: keyof typeof settings; labelKey: string; descKey: string }[] = [
    { key: 'bills', labelKey: 'sv.upcomingBills', descKey: 'sv.upcomingBillsDesc' },
    { key: 'budget', labelKey: 'sv.budgetAlerts', descKey: 'sv.budgetAlertsDesc' },
    { key: 'payday', labelKey: 'sv.payday', descKey: 'sv.paydayDesc' },
    { key: 'weekly', labelKey: 'sv.weeklyRecap', descKey: 'sv.weeklyRecapDesc' },
    { key: 'insights', labelKey: 'sv.smartInsights', descKey: 'sv.smartInsightsDesc' },
  ]

  const enabledCount = Object.values(settings).filter(Boolean).length

  return (
    <DetailView title={t('settings.notifications')} subtitle={t('sv.chooseWhatToHear')}>
      <div className="overflow-hidden rounded-[16px] bg-card">
        {items.map((item, i) => (
          <div
            key={item.key}
            className={cn(
              'flex items-center justify-between px-4 py-3.5',
              i < items.length - 1 && 'border-b border-border/40'
            )}
          >
            <div className="flex-1">
              <div className="text-[15px] font-medium">{t(item.labelKey)}</div>
              <div className="text-[12px] text-muted-foreground">{t(item.descKey)}</div>
            </div>
            <button
              onClick={() => toggleSetting(item.key)}
              className={cn(
                'relative h-7 w-12 rounded-full transition-colors',
                settings[item.key] ? 'bg-positive' : 'bg-muted'
              )}
            >
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={cn(
                  'absolute top-1 h-5 w-5 rounded-full bg-white',
                  settings[item.key] ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </DetailView>
  )
}

// ============================================================================
// Export — real CSV / JSON download
// ============================================================================
export function ExportView() {
  const haptic = useHaptic()
  const t = useT()
  const [busy, setBusy] = React.useState<'csv' | 'json' | null>(null)
  const { data: home } = useHomeSummary()
  const symbol = home?.user.currencySymbol ?? 'RD$'

  const doExport = async (format: 'csv' | 'json') => {
    setBusy(format)
    haptic('medium')
    try {
      const res = await fetch(`/api/budget/export?format=${format}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `senlie-budget-export.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      haptic('success')
      toast.success(t('sv.exportedAs', { format: format.toUpperCase() }), {
        description: t('sv.checkDownloads'),
      })
    } catch {
      haptic('warning')
      toast.error(t('sv.couldntExport'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <DetailView title={t('settings.export')} subtitle={t('sv.takeYourData')}>
      <div className="space-y-3">
        <button
          onClick={() => doExport('csv')}
          disabled={busy !== null}
          className="flex w-full items-center gap-3 rounded-[16px] bg-card p-4 text-left active:scale-[0.99] disabled:opacity-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--senlie-soft)] text-[var(--senlie)]">
            <FileText size={22} />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-medium">{t('sv.csvSpreadsheet')}</div>
            <div className="text-[12px] text-muted-foreground">
              {t('sv.csvDesc')}
            </div>
          </div>
          {busy === 'csv' ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          ) : (
            <Download size={18} className="text-muted-foreground" />
          )}
        </button>

        <button
          onClick={() => doExport('json')}
          disabled={busy !== null}
          className="flex w-full items-center gap-3 rounded-[16px] bg-card p-4 text-left active:scale-[0.99] disabled:opacity-50"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--senlie-soft)] text-[var(--senlie)]">
            <FileJson size={22} />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-medium">{t('sv.jsonData')}</div>
            <div className="text-[12px] text-muted-foreground">
              {t('sv.jsonDesc')}
            </div>
          </div>
          {busy === 'json' ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          ) : (
            <Download size={18} className="text-muted-foreground" />
          )}
        </button>
      </div>

      <p className="mt-4 px-1 text-[12px] text-muted-foreground">
        {t('sv.exportHistoryNote', { symbol })}
      </p>
    </DetailView>
  )
}

// ============================================================================
// Language selector
// ============================================================================
export function LanguageView() {
  const haptic = useHaptic()
  const t = useT()
  const { language, setLanguage } = useLanguage()

  return (
    <DetailView title={t('settings.language')} subtitle={t('settings.languageDesc')}>
      <div className="overflow-hidden rounded-[16px] bg-card">
        {LANGUAGES.map((lang, i) => {
          const isActive = lang.code === language
          return (
            <button
              key={lang.code}
              onClick={async () => {
                haptic('medium')
                if (isActive) return
                const synced = await setLanguage(lang.code)
                if (synced) toast.success(translate(lang.code, 'settings.languageSaved'))
                else toast.warning(translate(lang.code, 'settings.languageSaveFailed'))
              }}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/50',
                i < LANGUAGES.length - 1 && 'border-b border-border/40'
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-muted text-[12px] font-bold">
                {lang.flag}
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-medium">{lang.nativeLabel}</div>
                <div className="text-[12px] text-muted-foreground">{lang.label}</div>
              </div>
              {isActive && <Check size={20} style={{ color: 'var(--senlie)' }} />}
            </button>
          )
        })}
      </div>
      <p className="mt-3 px-1 text-[12px] text-muted-foreground">
        {t('sv.changesApplyImmediately')}
      </p>
    </DetailView>
  )
}

// ============================================================================
// Legal — Terms & Privacy Policy
// ============================================================================
export function LegalView() {
  const haptic = useHaptic()
  const t = useT()
  const [doc, setDoc] = React.useState<'terms' | 'privacy'>('terms')

  return (
    <DetailView title={t('sv.legal')} subtitle={t('sv.legalSubtitle')}>
      {/* Tab selector */}
      <div className="flex gap-1 rounded-[12px] bg-muted p-1">
        <button
          onClick={() => {
            haptic('light')
            setDoc('terms')
          }}
          className={cn(
            'relative flex-1 rounded-[9px] py-2 text-[13px] font-medium transition-colors',
            doc === 'terms' ? 'text-background' : 'text-muted-foreground'
          )}
          style={doc === 'terms' ? { backgroundColor: 'var(--senlie)' } : undefined}
        >
          {t('sv.terms')}
        </button>
        <button
          onClick={() => {
            haptic('light')
            setDoc('privacy')
          }}
          className={cn(
            'relative flex-1 rounded-[9px] py-2 text-[13px] font-medium transition-colors',
            doc === 'privacy' ? 'text-background' : 'text-muted-foreground'
          )}
          style={doc === 'privacy' ? { backgroundColor: 'var(--senlie)' } : undefined}
        >
          {t('sv.privacy')}
        </button>
      </div>

      {/* Privacy promise banner */}
      {doc === 'privacy' && (
        <div className="mt-3 rounded-[14px] border border-[var(--senlie)]/20 bg-[var(--senlie-soft)] p-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold" style={{ color: 'var(--senlie)' }}>
              {t('sv.notAdProfile')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t('sv.notAdProfileDesc')}
          </p>
        </div>
      )}

      {/* Legal text */}
      <LegalText doc={doc} />

      <p className="mt-4 px-1 text-[11px] text-muted-foreground">
        {t('sv.legalVersion')}
      </p>
    </DetailView>
  )
}

function LegalText({ doc }: { doc: 'terms' | 'privacy' }) {
  const t = useT()
  const [content, setContent] = React.useState<string>(t('sv.loadingLegal'))
  React.useEffect(() => {
    import('@/lib/legal-content').then((m) => {
      setContent(doc === 'terms' ? m.TERMS_TEXT : m.PRIVACY_TEXT)
    })
  }, [doc])

  return (
    <div className="mt-3 max-h-[50vh] overflow-y-auto rounded-[16px] bg-card p-4">
      <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-foreground/80">
        {content}
      </pre>
    </div>
  )
}

// ============================================================================
// Shared detail-view shell with a back button
// ============================================================================
export function DetailView({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  const setSettingsView = useSenlieUI((s) => s.setSettingsView)
  const haptic = useHaptic()
  const t = useT()

  return (
    <div className="flex flex-col">
      {/* Sticky header with back button */}
      <div className="sticky top-0 z-10 -mx-5 mb-3 flex items-center gap-2 border-b border-border/40 bg-background/80 px-5 py-3 backdrop-blur-md">
        <button
          onClick={() => {
            haptic('light')
            setSettingsView(null)
          }}
          className="flex items-center gap-1 text-[15px] font-medium text-[var(--senlie)] active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={2.4} />
          {t('sv.back')}
        </button>
        <div className="flex-1 text-center">
          <div className="text-[15px] font-semibold tracking-tight">{title}</div>
          {subtitle && (
            <div className="text-[11px] text-muted-foreground">{subtitle}</div>
          )}
        </div>
        <div className="w-[60px]" />
      </div>
      {children}
    </div>
  )
}

function AddButton({ label, type }: { label: string; type?: 'category' | 'account' | 'goal' | 'recurring' }) {
  const haptic = useHaptic()
  const t = useT()
  const openAddEntity = useSenlieUI((s) => s.openAddEntity)
  return (
    <button
      onClick={() => {
        haptic('light')
        if (type) openAddEntity(type)
        else toast.info(t('sv.comingSoon', { label }))
      }}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-border py-3.5 text-[14px] font-medium text-muted-foreground transition-colors active:scale-[0.99]"
    >
      <Plus size={16} />
      {label}
    </button>
  )
}
