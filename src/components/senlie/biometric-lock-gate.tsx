'use client'

import * as React from 'react'
import { Fingerprint, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { biometricEnabled, verifyBiometricUnlock } from '@/lib/biometric-lock'
import { useT } from '@/hooks/use-t'

const BACKGROUND_LOCK_DELAY_MS = 4000

export function BiometricLockGate() {
  const user = useAuth((s) => s.user)
  const t = useT()
  const [locked, setLocked] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')
  const hiddenAt = React.useRef<number | null>(null)

  const shouldLock = React.useCallback(() => Boolean(user && biometricEnabled(user.id)), [user])

  React.useEffect(() => {
    if (!user || !shouldLock()) {
      setLocked(false)
      return
    }
    setLocked(true)
  }, [user?.id, shouldLock])

  React.useEffect(() => {
    if (!user) return
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now()
        return
      }
      if (
        document.visibilityState === 'visible' &&
        hiddenAt.current &&
        Date.now() - hiddenAt.current >= BACKGROUND_LOCK_DELAY_MS &&
        shouldLock()
      ) {
        setLocked(true)
      }
      hiddenAt.current = null
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [user?.id, shouldLock])

  if (!user || !locked) return null

  const unlock = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      await verifyBiometricUnlock(user.id)
      setLocked(false)
    } catch (e) {
      const message = e instanceof Error ? e.message : t('bio.failed')
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[500] flex min-h-[100dvh] items-center justify-center bg-background px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-card shadow-card">
          <ShieldCheck size={36} style={{ color: 'var(--senlie)' }} />
        </div>
        <h1 className="mt-6 text-[28px] font-semibold tracking-tight">{t('bio.lockedTitle')}</h1>
        <p className="mx-auto mt-2 max-w-[290px] text-[14px] leading-5 text-muted-foreground">{t('bio.lockedDesc')}</p>

        <button
          type="button"
          onClick={unlock}
          disabled={busy}
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-[16px] py-4 text-[15px] font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: 'var(--senlie)' }}
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : <Fingerprint size={21} />}
          {busy ? t('bio.verifying') : t('bio.unlock')}
        </button>
        {error && <p className="mt-3 text-[12px] text-negative">{error}</p>}
      </div>
    </div>
  )
}
