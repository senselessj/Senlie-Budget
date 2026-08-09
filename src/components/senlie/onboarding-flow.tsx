'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  Plus,
  Trash2,
  X,
  Loader2,
  Wallet,
  CalendarClock,
  Coins,
  Sparkles,
  Shield,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { SenlieSymbol } from '@/components/senlie/senlie-symbol'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTheme } from 'next-themes'
import { useAuth } from '@/lib/auth-store'
import { useHaptic } from '@/hooks/use-senlie-data'
import { useT, useLanguage } from '@/hooks/use-t'
import { LANGUAGES } from '@/lib/i18n'
import { CURRENCIES, formatMoney } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CurrencyCode = 'DOP' | 'USD' | 'EUR'
type PaySchedule = 'monthly' | 'biweekly' | 'weekly' | 'custom'
type AccountType = 'checking' | 'savings' | 'cash' | 'wallet'

interface OnboardingAccount {
  id: string
  name: string
  type: AccountType
  balance: string
}

interface CustomPayment {
  id: string
  day: string // day of month 1-31
  amount: string
}

const EASE = [0.22, 1, 0.36, 1] as const

const TOTAL_STEPS = 6

const CURRENCY_OPTIONS: { code: CurrencyCode; labelKey: string; subKey: string }[] = [
  { code: 'DOP', labelKey: 'onb.dominicanPeso', subKey: 'onb.dominicanPesoSub' },
  { code: 'USD', labelKey: 'onb.usDollar', subKey: 'onb.usDollarSub' },
  { code: 'EUR', labelKey: 'onb.euro', subKey: 'onb.euroSub' },
]

const PAY_SCHEDULE_OPTIONS: { key: PaySchedule; labelKey: string; descKey: string }[] = [
  { key: 'monthly', labelKey: 'sv.monthly', descKey: 'sv.onceMonth' },
  { key: 'biweekly', labelKey: 'sv.biweekly', descKey: 'sv.everyTwoWeeks' },
  { key: 'weekly', labelKey: 'sv.weekly', descKey: 'sv.everyWeek' },
  { key: 'custom', labelKey: 'onb.customized', descKey: 'onb.customizedDesc' },
]

const ACCOUNT_TYPE_CHIPS: { key: AccountType; labelKey: string }[] = [
  { key: 'checking', labelKey: 'onb.accountType.checking' },
  { key: 'savings', labelKey: 'onb.accountType.savings' },
  { key: 'cash', labelKey: 'onb.accountType.cash' },
  { key: 'wallet', labelKey: 'onb.accountType.wallet' },
]

// ---------------------------------------------------------------------------
// OnboardingFlow
// ---------------------------------------------------------------------------

export function OnboardingFlow() {
  const haptic = useHaptic()
  const t = useT()
  const { language } = useLanguage()
  const completeOnboarding = useAuth((s) => s.completeOnboarding)
  const termsAlreadyAccepted = useAuth((s) => Boolean(s.user?.termsAccepted))

  // If a previous onboarding attempt already persisted the legal acceptance,
  // resume after the legal step instead of asking the user to accept twice.
  const [step, setStep] = React.useState(() => termsAlreadyAccepted ? 1 : 0) // 0=terms, 1=welcome, ...6=ready
  const [termsAccepted, setTermsAccepted] = React.useState(termsAlreadyAccepted)

  // Form state
  const [currencyCode, setCurrencyCode] = React.useState<CurrencyCode>('DOP')
  const [paySchedule, setPaySchedule] = React.useState<PaySchedule>('biweekly')
  const [customPayments, setCustomPayments] = React.useState<CustomPayment[]>([])
  const [monthlyIncome, setMonthlyIncome] = React.useState('')
  const [accounts, setAccounts] = React.useState<OnboardingAccount[]>([
    { id: 'acc-1', name: 'Main Account', type: 'checking', balance: '' },
  ])
  const [submitting, setSubmitting] = React.useState(false)
  const [legalDoc, setLegalDoc] = React.useState<'terms' | 'privacy' | null>(null)

  const symbol = CURRENCIES[currencyCode].symbol

  // ---- Step validation -----------------------------------------------
  const isCustom = paySchedule === 'custom'
  const canAdvance = (): boolean => {
    if (step === 0) return termsAccepted // Terms acceptance
    if (step === 1) return true // Welcome
    if (step === 2) return !!currencyCode
    if (step === 3) {
      if (!paySchedule) return false
      if (isCustom) {
        // Need at least one payment with a valid day (1-31) and amount > 0
        return (
          customPayments.length > 0 &&
          customPayments.every((p) => {
            const d = parseInt(p.day)
            return d >= 1 && d <= 31 && parseFloat(p.amount) > 0
          })
        )
      }
      return true
    }
    if (step === 4) {
      // Skipped when custom — but if we somehow land here, allow advance
      if (isCustom) return true
      const n = parseFloat(monthlyIncome)
      return !isNaN(n) && n >= 0
    }
    if (step === 5) {
      return (
        accounts.length > 0 &&
        accounts.every((a) =>
          a.name.trim().length > 0 &&
          a.balance.trim().length > 0 &&
          Number.isFinite(Number(a.balance))
        )
      )
    }
    return true
  }

  const next = async () => {
    if (!canAdvance()) {
      haptic('warning')
      return
    }
    haptic('light')

    // Legal acceptance is an actual persisted event, not a fire-and-forget
    // request. Do not advance if Senlie could not record it.
    if (step === 0) {
      setSubmitting(true)
      try {
        const res = await fetch('/api/auth/accept-terms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: '1.0' }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.error || `Could not record acceptance (${res.status})`)
        }
      } catch (e: unknown) {
        haptic('warning')
        const msg = e instanceof Error ? e.message : t('onb.somethingWrong')
        toast.error(t('onb.couldntFinish'), { description: msg })
        return
      } finally {
        setSubmitting(false)
      }
    }

    setStep((s) => {
      if (s === 3 && isCustom) return 5
      return Math.min(s + 1, TOTAL_STEPS)
    })
  }

  const back = () => {
    haptic('light')
    setStep((s) => {
      if (s === 0) return 0 // can't go back from terms
      // Skip income step (4) when going back from accounts (5) and custom is selected
      if (s === 5 && isCustom) return 3
      return Math.max(s - 1, 0)
    })
  }

  const finish = async () => {
    if (submitting) return
    setSubmitting(true)
    haptic('medium')
    try {
      // For custom schedule, total income = sum of all payment amounts
      const totalIncome = isCustom
        ? customPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
        : parseFloat(monthlyIncome) || 0

      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currencyCode,
          currencySymbol: symbol,
          paySchedule,
          customPayments: isCustom
            ? customPayments.map((p) => ({ day: parseInt(p.day), amount: p.amount }))
            : undefined,
          monthStartDay: 1,
          monthlyIncome: String(totalIncome),
          accounts: accounts.map((a) => ({
            name: a.name.trim(),
            type: a.type,
            balance: a.balance || '0',
            icon: 'wallet',
            color: '#5965F3',
          })),
          categories: [],
          language,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `Onboarding failed (${res.status})`)
      }
      haptic('success')
      completeOnboarding(language)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('onb.somethingWrong')
      haptic('warning')
      toast.error(t('onb.couldntFinish'), { description: msg })
      setSubmitting(false)
    }
  }

  // ---- Account row helpers -------------------------------------------
  const updateAccount = (id: string, patch: Partial<OnboardingAccount>) => {
    setAccounts((arr) => arr.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }
  const addAccount = () => {
    haptic('light')
    setAccounts((arr) => [
      ...arr,
      { id: `acc-${Date.now()}`, name: '', type: 'checking', balance: '' },
    ])
  }
  const removeAccount = (id: string) => {
    haptic('light')
    setAccounts((arr) => (arr.length > 1 ? arr.filter((a) => a.id !== id) : arr))
  }

  // ---- Render --------------------------------------------------------
  const isLastStep = step === TOTAL_STEPS

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-5">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* ── Top bar: back + progress dots ──────────────────────────── */}
        <div className="flex items-center gap-3 pt-[max(env(safe-area-inset-top),16px)] pb-2">
          <div className="flex h-9 w-9 items-center justify-center">
            {step > 0 && !submitting && (
              <button
                type="button"
                onClick={back}
                aria-label={t('onb.back')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground shadow-card transition-transform active:scale-95"
              >
                <ArrowLeft size={18} />
              </button>
            )}
          </div>
          {/* Hide progress dots on terms step */}
          {step > 0 && (
            <div className="flex flex-1 items-center justify-center gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                const n = i + 1
                // Hide step 4 (income) dot when custom schedule is selected
                if (n === 4 && isCustom) return null
                const isActive = n === step
                const isDone = n < step
                return (
                  <span
                    key={n}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    isActive
                      ? 'w-6'
                      : isDone
                        ? 'w-1.5'
                        : 'w-1.5 bg-muted-foreground/30'
                  )}
                  style={
                    isActive || isDone
                      ? { backgroundColor: 'var(--senlie)' }
                      : undefined
                  }
                />
              )
            })}
            </div>
          )}
          <div className="flex items-center gap-2">
            <OnboardingLanguageToggle />
            <OnboardingThemeToggle />
          </div>
        </div>

        {/* ── Step content ───────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.28, ease: EASE }}
              className="flex flex-1 flex-col"
            >
              {step === 0 && (
                <TermsStep
                  accepted={termsAccepted}
                  onToggle={() => {
                    haptic('light')
                    setTermsAccepted((v) => !v)
                  }}
                  onOpenLegal={(doc) => {
                    haptic('light')
                    setLegalDoc(doc)
                  }}
                />
              )}
              {step === 1 && <WelcomeStep />}
              {step === 2 && (
                <CurrencyStep
                  value={currencyCode}
                  onChange={(c) => {
                    haptic('light')
                    setCurrencyCode(c)
                  }}
                />
              )}
              {step === 3 && (
                <PayScheduleStep
                  value={paySchedule}
                  onChange={(p) => {
                    haptic('light')
                    setPaySchedule(p)
                  }}
                  customPayments={customPayments}
                  onCustomPaymentsChange={setCustomPayments}
                  symbol={symbol}
                />
              )}
              {step === 4 && (
                <IncomeStep
                  value={monthlyIncome}
                  onChange={setMonthlyIncome}
                  symbol={symbol}
                  currencyCode={currencyCode}
                />
              )}
              {step === 5 && (
                <AccountsStep
                  accounts={accounts}
                  symbol={symbol}
                  onUpdate={updateAccount}
                  onAdd={addAccount}
                  onRemove={removeAccount}
                />
              )}
              {step === 6 && (
                <ReadyStep
                  currencyCode={currencyCode}
                  paySchedule={paySchedule}
                  customPayments={customPayments}
                  monthlyIncome={monthlyIncome}
                  symbol={symbol}
                  accountCount={accounts.length}
                  startingBalance={accounts.reduce((sum, account) => sum + (Number(account.balance) || 0), 0)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Bottom CTA ────────────────────────────────────────────── */}
        <div className="sticky bottom-0 z-10 -mx-5 border-t border-border/40 bg-background/85 px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3 backdrop-blur-xl">
          <div className="mx-auto max-w-md">
            <button
              type="button"
              onClick={isLastStep ? finish : next}
              disabled={!canAdvance() || submitting}
              className={cn(
                'flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold text-[var(--senlie-foreground)] transition-all',
                'bg-[var(--senlie)] hover:opacity-95 active:scale-[0.99]',
                (!canAdvance() || submitting) && 'cursor-not-allowed opacity-50'
              )}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t('onb.cta.settingUp')}</span>
                </>
              ) : isLastStep ? (
                <>
                  <span>{t('onb.cta.seeBudget')}</span>
                  <ArrowRight size={16} className="opacity-90" />
                </>
              ) : step === 0 ? (
                <>
                  <span>{t('onb.cta.agree')}</span>
                  <ArrowRight size={16} className="opacity-90" />
                </>
              ) : step === 1 ? (
                <>
                  <span>{t('onb.cta.getStarted')}</span>
                  <ArrowRight size={16} className="opacity-90" />
                </>
              ) : (
                <span>{t('onb.cta.continue')}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Legal overlay — shown when user taps Terms or Privacy link */}
      {legalDoc && (
        <div className="fixed inset-0 z-50 bg-background">
          <LegalOverlay doc={legalDoc} onClose={() => setLegalDoc(null)} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 0 — Terms & Privacy acceptance
// ---------------------------------------------------------------------------

function TermsStep({
  accepted,
  onToggle,
  onOpenLegal,
}: {
  accepted: boolean
  onToggle: () => void
  onOpenLegal: (doc: 'terms' | 'privacy') => void
}) {
  const t = useT()
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative mb-6 flex h-20 w-20 items-center justify-center"
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--senlie) 14%, transparent)',
          }}
        />
        <Shield
          size={36}
          strokeWidth={2}
          style={{ color: 'var(--senlie)' }}
          className="relative"
        />
      </motion.div>

      <h1 className="text-[28px] font-bold tracking-tight">
        {t('onb.termsTitle')}
      </h1>
      <p className="mt-2 max-w-[300px] text-[15px] leading-relaxed text-muted-foreground">
        {t('onb.termsDesc')}
      </p>

      {/* Privacy promise banner */}
      <div className="mt-6 w-full rounded-[16px] border border-[var(--senlie)]/20 bg-[var(--senlie-soft)] p-4 text-left">
        <div className="flex items-center gap-2">
          <Shield size={16} style={{ color: 'var(--senlie)' }} />
          <span className="text-[13px] font-semibold" style={{ color: 'var(--senlie)' }}>
            {t('onb.notAdProfile')}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {t('onb.notAdProfileDesc')}
        </p>
      </div>

      {/* Acceptance checkbox — Terms & Privacy are tappable links */}
      <div className="mt-4 flex w-full items-start gap-3 rounded-[16px] bg-card p-4 text-left shadow-card">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border-2 transition-colors',
            accepted
              ? 'border-[var(--senlie)] bg-[var(--senlie)]'
              : 'border-muted-foreground/30'
          )}
        >
          {accepted && <Check size={14} className="text-white" strokeWidth={3} />}
        </button>
        <span className="text-[13px] leading-relaxed text-muted-foreground">
          {(() => {
            const template = t('onb.termsAcceptText', { terms: '__TERMS__', privacy: '__PRIVACY__' })
            const parts = template.split('__TERMS__')
            const firstPart = parts[0]
            const rest = parts[1] || ''
            const privacySplit = rest.split('__PRIVACY__')
            const middle = privacySplit[0]
            const last = privacySplit[1] || ''
            return (
              <>
                {firstPart}
                <button
                  type="button"
                  onClick={() => onOpenLegal('terms')}
                  className="font-medium underline decoration-[var(--senlie)]/40 underline-offset-2 transition-colors hover:text-[var(--senlie)]"
                >
                  {t('onb.termsConditions')}
                </button>
                {middle}
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="font-medium underline decoration-[var(--senlie)]/40 underline-offset-2 transition-colors hover:text-[var(--senlie)]"
                >
                  {t('onb.privacyPolicy')}
                </button>
                {last}
              </>
            )
          })()}
        </span>
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground/70">
        {t('onb.legalVersion')}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Welcome
// ---------------------------------------------------------------------------

function WelcomeStep() {
  const t = useT()
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative flex h-24 w-24 items-center justify-center"
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--senlie) 14%, transparent)',
          }}
        />
        <div
          className="absolute inset-3 rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--senlie) 18%, transparent)',
          }}
        />
        <SenlieSymbol
          size={56}
          className="relative text-[var(--senlie)]"
          strokeWidth={2.4}
        />
      </motion.div>
      <h1 className="mt-7 text-[28px] font-bold tracking-tight">
        {t('onb.welcomeTitle')}
      </h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        {t('onb.welcomeDesc')}
      </p>

      <div className="mt-10 grid w-full grid-cols-2 gap-3">
        <FeaturePill icon={Coins} label={t('onb.feature.currency')} />
        <FeaturePill icon={CalendarClock} label={t('onb.feature.paySchedule')} />
        <FeaturePill icon={Wallet} label={t('onb.feature.accounts')} />
        <FeaturePill icon={Sparkles} label={t('onb.feature.budget')} />
      </div>
    </div>
  )
}

function FeaturePill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] bg-card p-3 shadow-card">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-[10px]"
        style={{
          background: 'color-mix(in srgb, var(--senlie) 14%, transparent)',
          color: 'var(--senlie)',
        }}
      >
        <Icon size={16} />
      </div>
      <span className="text-[13px] font-medium leading-tight">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Currency
// ---------------------------------------------------------------------------

function CurrencyStep({
  value,
  onChange,
}: {
  value: CurrencyCode
  onChange: (c: CurrencyCode) => void
}) {
  const t = useT()
  return (
    <StepShell
      eyebrow={t('onb.step1of4')}
      title={t('onb.currencyTitle')}
      subtitle={t('onb.currencyDesc')}
    >
      <div className="overflow-hidden rounded-[16px] bg-card shadow-card">
        {CURRENCY_OPTIONS.map((opt, i) => {
          const isActive = opt.code === value
          const cfg = CURRENCIES[opt.code]
          const sample = formatMoney(1234.56, cfg)
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => onChange(opt.code)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-muted/50',
                i < CURRENCY_OPTIONS.length - 1 && 'border-b border-border/40'
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-muted text-[14px] font-semibold">
                {cfg.symbol}
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-medium">{opt.code}</div>
                <div className="text-[12px] text-muted-foreground">
                  {t(opt.labelKey)} · {sample}
                </div>
              </div>
              {isActive && (
                <Check size={20} style={{ color: 'var(--senlie)' }} />
              )}
            </button>
          )
        })}
      </div>
    </StepShell>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Pay schedule
// ---------------------------------------------------------------------------

function PayScheduleStep({
  value,
  onChange,
  customPayments,
  onCustomPaymentsChange,
  symbol,
}: {
  value: PaySchedule
  onChange: (p: PaySchedule) => void
  customPayments: CustomPayment[]
  onCustomPaymentsChange: (payments: CustomPayment[]) => void
  symbol: string
}) {
  const t = useT()
  const isCustom = value === 'custom'

  const addPayment = () => {
    onCustomPaymentsChange([
      ...customPayments,
      { id: `pay-${Date.now()}`, day: '', amount: '' },
    ])
  }

  const updatePayment = (id: string, patch: Partial<CustomPayment>) => {
    onCustomPaymentsChange(
      customPayments.map((p) => (p.id === id ? { ...p, ...patch } : p))
    )
  }

  const removePayment = (id: string) => {
    onCustomPaymentsChange(customPayments.filter((p) => p.id !== id))
  }

  const totalIncome = customPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
  const validCount = customPayments.filter((p) => {
    const d = parseInt(p.day)
    return d >= 1 && d <= 31 && parseFloat(p.amount) > 0
  }).length

  return (
    <StepShell
      eyebrow={t('onb.step2of4')}
      title={t('onb.payScheduleTitle')}
      subtitle={t('onb.payScheduleDesc')}
    >
      <div className="overflow-hidden rounded-[16px] bg-card shadow-card">
        {PAY_SCHEDULE_OPTIONS.map((opt, i) => {
          const isActive = opt.key === value
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-muted/50',
                i < PAY_SCHEDULE_OPTIONS.length - 1 && 'border-b border-border/40'
              )}
            >
              <div className="flex-1">
                <div className="text-[15px] font-medium">{t(opt.labelKey)}</div>
                <div className="text-[12px] text-muted-foreground">
                  {t(opt.descKey)}
                </div>
              </div>
              {isActive && (
                <Check size={20} style={{ color: 'var(--senlie)' }} />
              )}
            </button>
          )
        })}
      </div>

      {/* Custom payment builder — only for Customized schedule */}
      {isCustom && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3, ease: EASE }}
          className="mt-4"
        >
          <div className="rounded-[16px] bg-card p-4 shadow-card">
            <div className="mb-1 flex items-center gap-2">
              <CalendarClock size={16} className="text-muted-foreground" />
              <span className="text-[14px] font-medium">{t('onb.yourPaydays')}</span>
            </div>
            <p className="mb-3 text-[12px] text-muted-foreground">
              {t('onb.paydaysDesc')}
            </p>

            {customPayments.length > 0 && (
              <div className="mb-3 space-y-2">
                {customPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center gap-2">
                    {/* Day of month selector — Popover with 1-31 grid */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            'flex h-11 w-[90px] shrink-0 items-center justify-center gap-1 rounded-[12px] bg-muted transition-colors active:scale-95',
                            !payment.day && 'text-muted-foreground'
                          )}
                        >
                          <span className="text-[16px] font-semibold tnum">
                            {payment.day || '—'}
                          </span>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {t('onb.ofMonth')}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[280px] p-3 z-[60]" align="start" sideOffset={4}>
                        <div className="mb-2 text-[13px] font-semibold text-muted-foreground">
                          {t('onb.selectDayOfMonth')}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                            const isSelected = parseInt(payment.day) === d
                            return (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  updatePayment(payment.id, { day: String(d) })
                                }}
                                className={cn(
                                  'flex h-9 items-center justify-center rounded-[8px] text-[13px] font-semibold tnum transition-colors active:scale-90',
                                  isSelected
                                    ? 'text-white'
                                    : 'bg-muted text-foreground hover:bg-muted/70'
                                )}
                                style={isSelected ? { backgroundColor: 'var(--senlie)' } : undefined}
                              >
                                {d}
                              </button>
                            )
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {/* Amount input */}
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-muted-foreground">
                        {symbol}
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        value={payment.amount}
                        onChange={(e) => updatePayment(payment.id, { amount: e.target.value })}
                        placeholder="0"
                        className="h-11 w-full rounded-[12px] border-0 bg-muted pl-8 text-right text-[15px] tnum"
                        aria-label={t('entity.amount')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removePayment(payment.id)}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-muted text-muted-foreground transition-colors active:scale-95"
                      aria-label="X"
                    >
                      <X size={18} strokeWidth={2.2} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addPayment}
              className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-border py-3 text-[14px] font-medium text-muted-foreground transition-colors active:scale-[0.99]"
            >
              <Plus size={16} />
              {customPayments.length === 0 ? t('onb.addPayday') : t('onb.addAnotherPayday')}
            </button>

            {validCount > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-[10px] bg-[var(--senlie-soft)] px-3 py-2">
                <span className="text-[12px] font-medium text-muted-foreground">
                  {t('onb.paydayCount', { count: validCount, plural: validCount !== 1 ? 's' : '' })}
                </span>
                <span className="text-[15px] font-semibold tnum" style={{ color: 'var(--senlie)' }}>
                  {formatMoney(totalIncome, { symbol, decimalPlaces: 0 })}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </StepShell>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — Monthly income
// ---------------------------------------------------------------------------

function IncomeStep({
  value,
  onChange,
  symbol,
  currencyCode,
}: {
  value: string
  onChange: (v: string) => void
  symbol: string
  currencyCode: CurrencyCode
}) {
  const t = useT()
  const inputRef = React.useRef<HTMLInputElement>(null)
  return (
    <StepShell
      eyebrow={t('onb.step3of4')}
      title={t('onb.incomeTitle')}
      subtitle={t('onb.incomeDesc')}
    >
      <div className="rounded-[20px] bg-card p-5 shadow-card">
        <Label className="text-[13px] text-muted-foreground">
          {t('onb.takeHomePay')}
        </Label>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[26px] font-semibold text-muted-foreground">
            {symbol}
          </span>
          <Input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
            autoFocus
            className="h-16 rounded-[14px] border-0 bg-muted pl-[calc(16px+1ch+8px)] pr-3 text-[28px] font-semibold tracking-tight tnum focus-visible:ring-[3px] focus-visible:ring-[var(--senlie)]/25"
          />
        </div>
        <p className="mt-3 text-[12px] text-muted-foreground">
          {t('onb.paidIn', { code: currencyCode })}
        </p>
      </div>
    </StepShell>
  )
}

// ---------------------------------------------------------------------------
// Step 5 — Accounts
// ---------------------------------------------------------------------------

function AccountsStep({
  accounts,
  symbol,
  onUpdate,
  onAdd,
  onRemove,
}: {
  accounts: OnboardingAccount[]
  symbol: string
  onUpdate: (id: string, patch: Partial<OnboardingAccount>) => void
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  const t = useT()
  const totalStartingBalance = accounts.reduce(
    (sum, account) => sum + (Number(account.balance) || 0),
    0
  )

  return (
    <StepShell
      eyebrow={t('onb.step4of4')}
      title={t('onb.accountsTitle')}
      subtitle={t('onb.accountsDesc')}
    >
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {accounts.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="rounded-[16px] bg-card p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-muted-foreground">
                    {t('onb.accountN', { n: i + 1 })}
                  </span>
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemove(a.id)}
                      aria-label="X"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-[var(--negative)]"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Name */}
                <Input
                  type="text"
                  value={a.name}
                  onChange={(e) => onUpdate(a.id, { name: e.target.value })}
                  placeholder={t('onb.accountNamePlaceholder')}
                  className="mt-2 h-11 rounded-[12px] border-0 bg-muted px-3 text-[15px] font-medium"
                />

                {/* Type chips */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ACCOUNT_TYPE_CHIPS.map((c) => {
                    const isActive = c.key === a.type
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => onUpdate(a.id, { type: c.key })}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
                          isActive
                            ? 'text-[var(--senlie-foreground)]'
                            : 'bg-muted text-muted-foreground'
                        )}
                        style={
                          isActive
                            ? { backgroundColor: 'var(--senlie)' }
                            : undefined
                        }
                      >
                        {t(c.labelKey)}
                      </button>
                    )
                  })}
                </div>

                {/* Current balance / starting money */}
                <div className="mt-3">
                  <div className="text-[12px] font-medium text-muted-foreground">
                    {t('onb.currentBalance')}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/75">
                    {t('onb.currentBalanceHint')}
                  </p>
                  <div className="relative mt-2">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-muted-foreground">
                      {symbol}
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={a.balance}
                      onChange={(e) =>
                        onUpdate(a.id, { balance: e.target.value })
                      }
                      placeholder="0.00"
                      className="h-11 rounded-[12px] border-0 bg-muted pl-[calc(14px+1ch+6px)] pr-3 text-[15px] font-semibold tnum"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-border/60 bg-card/50 py-3 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <Plus size={16} />
          {t('onb.addAnotherAccount')}
        </button>

        <div className="flex items-center justify-between rounded-[16px] bg-[var(--senlie-soft)] px-4 py-3">
          <div className="min-w-0 pr-4">
            <div className="text-[13px] font-semibold text-foreground">{t('onb.startingMoney')}</div>
            <div className="text-[11px] text-muted-foreground">{t('onb.startingMoneyDesc')}</div>
          </div>
          <div className="shrink-0 text-[18px] font-semibold tnum text-[var(--senlie)]">
            {formatMoney(totalStartingBalance, { symbol, decimalPlaces: 0 })}
          </div>
        </div>
      </div>
    </StepShell>
  )
}

// ---------------------------------------------------------------------------
// Step 6 — Ready (summary)
// ---------------------------------------------------------------------------

function ReadyStep({
  currencyCode,
  paySchedule,
  customPayments,
  monthlyIncome,
  symbol,
  accountCount,
  startingBalance,
}: {
  currencyCode: CurrencyCode
  paySchedule: PaySchedule
  customPayments: CustomPayment[]
  monthlyIncome: string
  symbol: string
  accountCount: number
  startingBalance: number
}) {
  const t = useT()
  const isCustom = paySchedule === 'custom'
  // For custom, income = sum of payment amounts; otherwise use monthlyIncome field
  const income = isCustom
    ? customPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
    : parseFloat(monthlyIncome) || 0
  const incomeLabel = formatMoney(income, { symbol, decimalPlaces: 0 })
  const payLabel =
    PAY_SCHEDULE_OPTIONS.find((p) => p.key === paySchedule)?.labelKey ?? ''
  const payLabelStr = payLabel ? t(payLabel) : paySchedule

  const validPayments = customPayments.filter((p) => {
    const d = parseInt(p.day)
    return d >= 1 && d <= 31 && parseFloat(p.amount) > 0
  })

  const rows: { label: string; value: string }[] = [
    { label: t('onb.rowCurrency'), value: currencyCode },
    { label: t('onb.rowPaySchedule'), value: payLabelStr },
    // For custom, show each payday as its own row
    ...(isCustom
      ? validPayments.map((p, i) => ({
          label: t('onb.rowPayday', { n: i + 1 }),
          value: `${t('onb.dayX', { n: parseInt(p.day) })} · ${formatMoney(parseFloat(p.amount), { symbol, decimalPlaces: 0 })}`,
        }))
      : []),
    { label: t('onb.rowMonthlyIncome'), value: incomeLabel },
    {
      label: t('onb.rowStartingMoney'),
      value: formatMoney(startingBalance, { symbol, decimalPlaces: 0 }),
    },
    {
      label: t('onb.rowAccounts'),
      value: t('onb.accountCount', { count: accountCount, plural: accountCount === 1 ? '' : 's' }),
    },
  ]

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative flex h-20 w-20 items-center justify-center"
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--senlie) 14%, transparent)',
          }}
        />
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'var(--senlie)',
            color: 'var(--senlie-foreground)',
          }}
        >
          <Check size={26} strokeWidth={3} />
        </div>
      </motion.div>

      <h1 className="mt-6 text-[28px] font-bold tracking-tight">
        {t('onb.readyTitle')}
      </h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        {t('onb.readyDesc')}
      </p>

      <div className="mt-7 w-full overflow-hidden rounded-[20px] bg-card p-5 text-left shadow-card">
        <div className="divide-y divide-border/40">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <span className="text-[13px] text-muted-foreground">
                {r.label}
              </span>
              <span className="text-[15px] font-semibold tnum">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared shell
// ---------------------------------------------------------------------------

function StepShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col pt-4">
      <div
        className="text-[12px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--senlie)' }}
      >
        {eyebrow}
      </div>
      <h2 className="mt-1 text-[24px] font-bold tracking-tight">{title}</h2>
      <p className="mt-1 text-[14px] text-muted-foreground">{subtitle}</p>
      <div className="mt-6 flex-1">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Language toggle — top-right of onboarding
// ---------------------------------------------------------------------------
function OnboardingLanguageToggle() {
  const t = useT()
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('accessibility.toggleLanguage')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-[11px] font-bold text-foreground shadow-card transition-transform active:scale-95"
        >
          {language.toUpperCase().slice(0, 2)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[150px] p-1" align="end">
        {LANGUAGES.map((lang) => {
          const isActive = language === lang.code
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                setLanguage(lang.code)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] font-medium transition-colors',
                isActive ? 'bg-[var(--senlie-soft)] text-[var(--senlie)]' : 'text-foreground hover:bg-muted'
              )}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-muted text-[10px] font-bold">
                {lang.flag}
              </span>
              {lang.nativeLabel}
              {isActive && <Check size={14} className="ml-auto" />}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Theme toggle — top-right of onboarding
// ---------------------------------------------------------------------------
function OnboardingThemeToggle() {
  const { theme, setTheme } = useTheme()
  const t = useT()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const [open, setOpen] = React.useState(false)
  const current = mounted ? theme : 'system'
  const Icon = current === 'dark' ? Moon : current === 'light' ? Sun : Monitor

  const options = [
    { key: 'light', labelKey: 'settings.light', icon: Sun },
    { key: 'dark', labelKey: 'settings.dark', icon: Moon },
    { key: 'system', labelKey: 'settings.system', icon: Monitor },
  ] as const

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('onb.toggleTheme')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground shadow-card transition-transform active:scale-95"
        >
          {mounted && <Icon size={16} strokeWidth={2.2} />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[140px] p-1" align="end">
        {options.map((opt) => {
          const isActive = current === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => {
                setTheme(opt.key)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] font-medium transition-colors',
                isActive ? 'bg-[var(--senlie-soft)] text-[var(--senlie)]' : 'text-foreground hover:bg-muted'
              )}
            >
              <opt.icon size={15} />
              {t(opt.labelKey)}
              {isActive && <Check size={14} className="ml-auto" />}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Legal overlay — full-screen Terms/Privacy reader
// ---------------------------------------------------------------------------
function LegalOverlay({
  doc,
  onClose,
}: {
  doc: 'terms' | 'privacy'
  onClose: () => void
}) {
  const t = useT()
  const [content, setContent] = React.useState<string>(t('onb.loading'))
  React.useEffect(() => {
    import('@/lib/legal-content').then((m) => {
      setContent(doc === 'terms' ? m.TERMS_TEXT : m.PRIVACY_TEXT)
    })
  }, [doc])

  const title = doc === 'terms' ? t('onb.termsConditions') : t('onb.privacyPolicy')
  const subtitle = doc === 'terms' ? 'Términos y Condiciones' : 'Política de Privacidad'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/40 px-5 py-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-[15px] font-medium text-[var(--senlie)] active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={2.4} />
          {t('onb.back')}
        </button>
        <div className="flex-1 text-center">
          <div className="text-[15px] font-semibold tracking-tight">{title}</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
        <div className="text-[11px] text-muted-foreground">v1.0</div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {doc === 'privacy' && (
          <div className="mb-4 rounded-[14px] border border-[var(--senlie)]/20 bg-[var(--senlie-soft)] p-3">
            <span className="text-[13px] font-semibold" style={{ color: 'var(--senlie)' }}>
              {t('onb.notAdProfile')}
            </span>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t('onb.notAdProfileDesc')}
            </p>
          </div>
        )}
        <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-foreground/80">
          {content}
        </pre>
        <p className="mt-6 text-[11px] text-muted-foreground">
          {t('onb.legalVersion')}
        </p>
      </div>
    </div>
  )
}
