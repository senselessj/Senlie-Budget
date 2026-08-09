'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Loader2,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  Monitor,
  Check,
  ShieldCheck,
  ArrowLeft,
  LockKeyhole,
  UserRound,
  KeyRound,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { SenlieSymbol } from '@/components/senlie/senlie-symbol'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth } from '@/lib/auth-store'
import { useLanguage, useT } from '@/hooks/use-t'
import { LANGUAGES } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type ThemeOption = 'light' | 'dark' | 'system'
type AuthMethod = 'password' | 'otp'
type PasswordMode = 'signin' | 'signup'
type OtpStep = 'email' | 'code'

const THEME_OPTIONS: { key: ThemeOption; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: Monitor },
]

const EASE = [0.22, 1, 0.36, 1] as const
const RESEND_SECONDS = 60

function maskedEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const shown = local.slice(0, Math.min(2, local.length))
  return `${shown}${'•'.repeat(Math.max(2, Math.min(6, local.length - shown.length)))}@${domain}`
}

export function AuthScreen() {
  const t = useT()
  const [method, setMethod] = React.useState<AuthMethod>('password')
  const [passwordMode, setPasswordMode] = React.useState<PasswordMode>('signin')
  const [otpStep, setOtpStep] = React.useState<OtpStep>('email')
  const [email, setEmail] = React.useState('')
  const [name, setName] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [code, setCode] = React.useState('')
  const [secondsLeft, setSecondsLeft] = React.useState(0)
  const [confirmationEmail, setConfirmationEmail] = React.useState<string | null>(null)
  const [localError, setLocalError] = React.useState<string | null>(null)

  const signInWithPassword = useAuth((s) => s.signInWithPassword)
  const signUpWithPassword = useAuth((s) => s.signUpWithPassword)
  const requestOtp = useAuth((s) => s.requestOtp)
  const verifyOtp = useAuth((s) => s.verifyOtp)
  const pendingEmail = useAuth((s) => s.pendingEmail)
  const isLoading = useAuth((s) => s.isLoading)
  const storeError = useAuth((s) => s.error)
  const clearError = useAuth((s) => s.clearError)
  const error = localError ?? storeError

  React.useEffect(() => {
    if (otpStep !== 'code' || secondsLeft <= 0) return
    const timer = window.setInterval(() => setSecondsLeft((v) => Math.max(0, v - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [otpStep, secondsLeft])

  const clearVisibleError = () => {
    setLocalError(null)
    clearError()
  }

  const switchMethod = (next: AuthMethod) => {
    clearVisibleError()
    setMethod(next)
    setOtpStep('email')
    setCode('')
    setSecondsLeft(0)
    setConfirmationEmail(null)
  }

  const switchPasswordMode = (next: PasswordMode) => {
    clearVisibleError()
    setPasswordMode(next)
    setPassword('')
    setConfirmPassword('')
    setConfirmationEmail(null)
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    clearVisibleError()

    if (passwordMode === 'signup') {
      if (password !== confirmPassword) {
        setLocalError(t('auth.passwordsDontMatch'))
        return
      }
      if (password.length < 8) {
        setLocalError(t('auth.passwordHint'))
        return
      }

      try {
        const result = await signUpWithPassword(name, email, password)
        if (result === 'confirmation_required') {
          setConfirmationEmail(email.trim().toLowerCase())
        }
      } catch {
        // Store owns the backend-visible error state.
      }
      return
    }

    try {
      await signInWithPassword(email, password)
    } catch {
      // Store owns the visible error state.
    }
  }

  const sendCode = async () => {
    clearVisibleError()
    try {
      await requestOtp(email)
      setOtpStep('code')
      setCode('')
      setSecondsLeft(RESEND_SECONDS)
    } catch {
      // Store owns the visible error state.
    }
  }

  const verifyCode = async () => {
    clearVisibleError()
    try {
      await verifyOtp(pendingEmail ?? email, code)
    } catch {
      // Store owns the visible error state.
    }
  }

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpStep === 'email') await sendCode()
    else await verifyCode()
  }

  const backToOtpEmail = () => {
    clearVisibleError()
    setOtpStep('email')
    setCode('')
    setSecondsLeft(0)
  }

  const destination = pendingEmail ?? email.trim().toLowerCase()

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="absolute right-4 top-[max(env(safe-area-inset-top),16px)] z-10 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="w-full max-w-md"
        >
          <div className="flex flex-col items-center text-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full" style={{ background: 'color-mix(in srgb, var(--senlie) 14%, transparent)' }} />
              <div className="absolute inset-3 rounded-full" style={{ background: 'color-mix(in srgb, var(--senlie) 18%, transparent)' }} />
              <SenlieSymbol size={48} className="relative text-[var(--senlie)]" strokeWidth={2.4} />
            </div>
            <h1 className="mt-5 text-[28px] font-bold tracking-tight">Senlie Budget</h1>
            <p className="mt-1 text-[15px] text-muted-foreground">{t('auth.tagline')}</p>
          </div>

          <div className="mt-8 overflow-hidden rounded-[22px] bg-card shadow-card">
            <AnimatePresence mode="wait" initial={false}>
              {confirmationEmail ? (
                <motion.div
                  key="confirm-email"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.24, ease: EASE }}
                  className="p-5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--senlie-soft)] text-[var(--senlie)]">
                    <Mail size={21} />
                  </div>
                  <h2 className="mt-4 text-[20px] font-semibold tracking-tight">{t('auth.confirmEmailTitle')}</h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {t('auth.confirmEmailDesc')} <span className="font-medium text-foreground">{maskedEmail(confirmationEmail)}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmationEmail(null)
                      switchPasswordMode('signin')
                    }}
                    className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[var(--senlie)] text-[15px] font-semibold text-[var(--senlie-foreground)] transition-all hover:opacity-95 active:scale-[0.99]"
                  >
                    {t('auth.backToSignIn')}
                  </button>
                </motion.div>
              ) : method === 'password' ? (
                <motion.form
                  key={`password-${passwordMode}`}
                  initial={{ opacity: 0, x: passwordMode === 'signup' ? 10 : -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: passwordMode === 'signup' ? -10 : 10 }}
                  transition={{ duration: 0.24, ease: EASE }}
                  onSubmit={submitPassword}
                  className="p-5"
                >
                  <div className="mb-5">
                    <h2 className="text-[20px] font-semibold tracking-tight">
                      {passwordMode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
                    </h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {passwordMode === 'signin' ? t('auth.passwordSignInDesc') : t('auth.passwordSignUpDesc')}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {passwordMode === 'signup' && (
                      <Field
                        id="name"
                        label={t('auth.name')}
                        icon={UserRound}
                        autoComplete="name"
                        placeholder="Jason"
                        type="text"
                        value={name}
                        onChange={(v) => {
                          setName(v)
                          if (error) clearVisibleError()
                        }}
                        required
                      />
                    )}

                    <Field
                      id="email"
                      label={t('auth.email')}
                      icon={Mail}
                      autoComplete="email"
                      placeholder="you@example.com"
                      type="email"
                      value={email}
                      onChange={(v) => {
                        setEmail(v)
                        if (error) clearVisibleError()
                      }}
                      required
                    />

                    <Field
                      id="password"
                      label={t('auth.password')}
                      icon={LockKeyhole}
                      autoComplete={passwordMode === 'signin' ? 'current-password' : 'new-password'}
                      placeholder="••••••••"
                      type="password"
                      value={password}
                      onChange={(v) => {
                        setPassword(v)
                        if (error) clearVisibleError()
                      }}
                      required
                    />

                    {passwordMode === 'signup' && (
                      <>
                        <Field
                          id="confirm-password"
                          label={t('auth.confirmPassword')}
                          icon={KeyRound}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          type="password"
                          value={confirmPassword}
                          onChange={(v) => {
                            setConfirmPassword(v)
                            if (error) clearVisibleError()
                          }}
                          required
                        />
                        <p className="-mt-1 text-[11px] leading-relaxed text-muted-foreground/75">{t('auth.passwordHint')}</p>
                      </>
                    )}
                  </div>

                  <AuthError error={error} />

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim() || !password || (passwordMode === 'signup' && (!name.trim() || !confirmPassword))}
                    className={cn(
                      'mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold text-[var(--senlie-foreground)] transition-all',
                      'bg-[var(--senlie)] hover:opacity-95 active:scale-[0.99]',
                      (isLoading || !email.trim() || !password || (passwordMode === 'signup' && (!name.trim() || !confirmPassword))) && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    {isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <span>{passwordMode === 'signin' ? t('auth.signInCta') : t('auth.signUpCta')}</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  <div className="mt-4 text-center text-[12px] text-muted-foreground">
                    {passwordMode === 'signin' ? t('auth.noAccount') : t('auth.haveAccount')}{' '}
                    <button
                      type="button"
                      onClick={() => switchPasswordMode(passwordMode === 'signin' ? 'signup' : 'signin')}
                      className="font-semibold text-[var(--senlie)] hover:underline"
                    >
                      {passwordMode === 'signin' ? t('auth.signUp') : t('auth.signIn')}
                    </button>
                  </div>

                  <AuthDivider label={t('auth.or')} />

                  <button
                    type="button"
                    onClick={() => switchMethod('otp')}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-[13px] bg-muted/70 px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    <Mail size={15} />
                    {t('auth.useCodeInstead')}
                  </button>

                  <div className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-muted/55 px-3 py-3 text-[12px] leading-relaxed text-muted-foreground">
                    <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--senlie)]" />
                    <span>{t('auth.emailPasswordNote')}</span>
                  </div>
                </motion.form>
              ) : otpStep === 'email' ? (
                <motion.form
                  key="otp-email"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.24, ease: EASE }}
                  onSubmit={submitOtp}
                  className="p-5"
                >
                  <button
                    type="button"
                    onClick={() => switchMethod('password')}
                    className="-ml-1 mb-4 flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ArrowLeft size={14} />
                    {t('auth.usePasswordInstead')}
                  </button>

                  <div className="mb-5">
                    <h2 className="text-[20px] font-semibold tracking-tight">{t('auth.emailTitle')}</h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{t('auth.emailDesc')}</p>
                  </div>

                  <Field
                    id="otp-email"
                    label={t('auth.email')}
                    icon={Mail}
                    autoComplete="email"
                    placeholder="you@example.com"
                    type="email"
                    value={email}
                    onChange={(v) => {
                      setEmail(v)
                      if (error) clearVisibleError()
                    }}
                    required
                  />

                  <AuthError error={error} />

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className={cn(
                      'mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold text-[var(--senlie-foreground)] transition-all',
                      'bg-[var(--senlie)] hover:opacity-95 active:scale-[0.99]',
                      (isLoading || !email.trim()) && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><span>{t('auth.continueEmail')}</span><ArrowRight size={16} /></>}
                  </button>

                  <div className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-muted/65 px-3 py-3 text-[12px] leading-relaxed text-muted-foreground">
                    <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--senlie)]" />
                    <span>{t('auth.noPassword')}</span>
                  </div>
                </motion.form>
              ) : (
                <motion.form
                  key="otp-code"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.24, ease: EASE }}
                  onSubmit={submitOtp}
                  className="p-5"
                >
                  <button
                    type="button"
                    onClick={backToOtpEmail}
                    className="-ml-1 mb-4 flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ArrowLeft size={14} />
                    {t('auth.changeEmail')}
                  </button>

                  <div className="mb-6">
                    <h2 className="text-[20px] font-semibold tracking-tight">{t('auth.checkEmail')}</h2>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                      {t('auth.codeSentTo')} <span className="font-medium text-foreground">{maskedEmail(destination)}</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[13px] text-muted-foreground">{t('auth.verificationCode')}</Label>
                    <InputOTP
                      maxLength={6}
                      value={code}
                      onChange={(value) => {
                        setCode(value.replace(/\D/g, ''))
                        if (error) clearVisibleError()
                      }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      containerClassName="w-full justify-center"
                    >
                      <InputOTPGroup className="gap-2">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <InputOTPSlot
                            key={index}
                            index={index}
                            className="h-12 w-11 rounded-[12px] border border-border bg-background text-[19px] font-semibold shadow-sm first:border-l data-[active=true]:border-[var(--senlie)] data-[active=true]:ring-[var(--senlie)]/20"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <AuthError error={error} />

                  <button
                    type="submit"
                    disabled={isLoading || code.length !== 6}
                    className={cn(
                      'mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold text-[var(--senlie-foreground)] transition-all',
                      'bg-[var(--senlie)] hover:opacity-95 active:scale-[0.99]',
                      (isLoading || code.length !== 6) && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><span>{t('auth.verifyCta')}</span><ArrowRight size={16} /></>}
                  </button>

                  <div className="mt-4 text-center text-[12px] text-muted-foreground">
                    {secondsLeft > 0 ? (
                      <span>{t('auth.resendIn', { seconds: secondsLeft })}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={sendCode}
                        disabled={isLoading}
                        className="font-medium text-[var(--senlie)] hover:underline disabled:opacity-50"
                      >
                        {t('auth.resend')}
                      </button>
                    )}
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-6 text-center text-[11px] text-muted-foreground/60">{t('auth.bySenlie')}</p>
        </motion.div>
      </main>
    </div>
  )
}

function AuthDivider({ label }: { label: string }) {
  return (
    <div className="my-4 flex items-center gap-3" aria-hidden="true">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/55">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function AuthError({ error }: { error: string | null }) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="mt-4 flex items-start gap-2 rounded-[12px] bg-[color-mix(in_srgb,var(--negative)_10%,transparent)] px-3 py-2.5 text-[13px] text-[var(--negative)]"
          role="alert"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function LanguageToggle() {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Toggle language" className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-[11px] font-bold text-foreground shadow-card transition-transform active:scale-95">
          {language.toUpperCase().slice(0, 2)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[150px] p-1" align="end">
        {LANGUAGES.map((lang) => {
          const isActive = language === lang.code
          return (
            <button key={lang.code} type="button" onClick={() => { setLanguage(lang.code); setOpen(false) }} className={cn('flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-[13px] font-medium transition-colors', isActive ? 'bg-[var(--senlie-soft)] text-[var(--senlie)]' : 'text-foreground hover:bg-muted')}>
              <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-muted text-[10px] font-bold">{lang.flag}</span>
              {lang.nativeLabel}
              {isActive && <Check size={14} className="ml-auto" />}
            </button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const current: ThemeOption = mounted && theme ? (theme as ThemeOption) : 'system'
  const CurrentIcon = THEME_OPTIONS.find((t) => t.key === current)?.icon ?? Monitor
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Theme: ${current}. Tap to change.`} className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground shadow-card transition-transform active:scale-95">
          <CurrentIcon size={17} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[160px] rounded-[14px] border-0 bg-card p-1.5 shadow-card">
        <div className="flex flex-col">
          {THEME_OPTIONS.map((opt) => {
            const isActive = current === opt.key
            const Icon = opt.icon
            return (
              <button key={opt.key} type="button" onClick={() => setTheme(opt.key)} className={cn('flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] font-medium transition-colors', isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60')}>
                <Icon size={15} />
                <span className="flex-1 text-left">{opt.label}</span>
                {isActive && <Check size={14} style={{ color: 'var(--senlie)' }} />}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Field({ id, label, icon: Icon, type, value, onChange, placeholder, autoComplete, required }: {
  id: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px] text-muted-foreground">{label}</Label>
      <div className="relative">
        <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
        <Input id={id} name={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} required={required} className="h-12 rounded-[14px] border-0 bg-background pl-10 pr-3 text-[16px] text-foreground shadow-sm placeholder:text-muted-foreground/50 focus-visible:ring-[3px] focus-visible:ring-[var(--senlie)]/25" />
      </div>
    </div>
  )
}
