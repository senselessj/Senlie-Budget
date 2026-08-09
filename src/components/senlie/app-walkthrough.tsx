'use client'

import * as React from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { useSenlieUI } from '@/lib/store'
import { useT } from '@/hooks/use-t'

const STEPS = [
  { target: 'available', titleKey: 'tour.availableTitle', bodyKey: 'tour.availableBody' },
  { target: 'add', titleKey: 'tour.addTitle', bodyKey: 'tour.addBody' },
  { target: 'tab-activity', titleKey: 'tour.activityTitle', bodyKey: 'tour.activityBody' },
  { target: 'tab-budget', titleKey: 'tour.budgetTitle', bodyKey: 'tour.budgetBody' },
  { target: 'tab-insights', titleKey: 'tour.insightsTitle', bodyKey: 'tour.insightsBody' },
  { target: 'settings', titleKey: 'tour.settingsTitle', bodyKey: 'tour.settingsBody' },
] as const

type Rect = { top: number; left: number; width: number; height: number }

export function AppWalkthrough() {
  const user = useAuth((s) => s.user)
  const completeWalkthrough = useAuth((s) => s.completeWalkthrough)
  const setActiveTab = useSenlieUI((s) => s.setActiveTab)
  const t = useT()
  const [step, setStep] = React.useState(0)
  const [rect, setRect] = React.useState<Rect | null>(null)
  const visible = Boolean(user?.onboardingComplete && !user.walkthroughCompleted)

  React.useEffect(() => {
    if (!visible) return
    // The tour starts on Home so every highlighted target is predictable.
    setActiveTab('home')
  }, [visible, setActiveTab])

  const measure = React.useCallback(() => {
    if (!visible) return
    const selector = `[data-tour="${STEPS[step].target}"]`
    const el = document.querySelector(selector) as HTMLElement | null
    if (!el) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    const pad = 7
    setRect({
      top: Math.max(6, r.top - pad),
      left: Math.max(6, r.left - pad),
      width: Math.min(window.innerWidth - 12, r.width + pad * 2),
      height: r.height + pad * 2,
    })
  }, [step, visible])

  React.useEffect(() => {
    if (!visible) return
    const id = window.setTimeout(measure, 80)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [measure, visible])

  if (!visible || !user) return null

  const finish = async () => {
    completeWalkthrough()
    await fetch('/api/budget/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walkthroughCompleted: true }),
    }).catch(() => {})
  }

  const next = () => {
    if (step >= STEPS.length - 1) {
      finish()
      return
    }
    setStep((s) => s + 1)
  }

  const current = STEPS[step]
  const cardAtTop = rect ? rect.top > 420 : false

  return (
    <div className="fixed inset-0 z-[450] pointer-events-none" aria-live="polite">
      {!rect && <div className="absolute inset-0 bg-black/65" />}

      {rect && (
        <div
          className="absolute rounded-[18px] ring-2 ring-white/90 transition-all duration-200"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.60)',
          }}
        />
      )}

      <div
        className={`pointer-events-auto absolute inset-x-5 ${cardAtTop ? 'top-[max(env(safe-area-inset-top),22px)]' : 'bottom-[max(calc(env(safe-area-inset-bottom)+92px),112px)]'}`}
      >
        <div className="mx-auto max-w-sm rounded-[22px] bg-card p-5 shadow-float">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[12px] font-semibold text-muted-foreground">{t('tour.step', { current: step + 1, total: STEPS.length })}</div>
            <button type="button" onClick={finish} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-label={t('tour.skip')}>
              <X size={16} />
            </button>
          </div>
          <h2 className="mt-2 text-[20px] font-semibold tracking-tight">{t(current.titleKey)}</h2>
          <p className="mt-1.5 text-[14px] leading-5 text-muted-foreground">{t(current.bodyKey)}</p>

          <div className="mt-5 flex items-center gap-2">
            <button type="button" onClick={finish} className="px-3 py-2 text-[13px] font-medium text-muted-foreground">{t('tour.skip')}</button>
            <button
              type="button"
              onClick={next}
              className="ml-auto flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-[14px] font-semibold text-white"
              style={{ backgroundColor: 'var(--senlie)' }}
            >
              {step === STEPS.length - 1 ? <Check size={17} /> : <ArrowRight size={17} />}
              {step === STEPS.length - 1 ? t('tour.finish') : t('tour.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
