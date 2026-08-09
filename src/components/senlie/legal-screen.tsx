'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, FileText, Shield, Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHaptic } from '@/hooks/use-senlie-data'
import { useT } from '@/hooks/use-t'
import { LEGAL_VERSION, LEGAL_EFFECTIVE_DATE } from '@/lib/legal-content'
import { toast } from 'sonner'

type LegalDocType = 'terms' | 'privacy'

export function LegalScreen({
  type,
  onBack,
  onAccept,
  showAcceptButton = false,
}: {
  type: LegalDocType
  onBack: () => void
  onAccept?: () => void
  showAcceptButton?: boolean
}) {
  const haptic = useHaptic()
  const t = useT()
  const [accepted, setAccepted] = React.useState(false)

  const title = type === 'terms' ? t('legal.termsTitle') : t('legal.privacyTitle')
  const subtitle =
    type === 'terms'
      ? 'Términos y Condiciones de Uso'
      : 'Política de Privacidad'

  // Load content dynamically to avoid bloating the client bundle
  const [content, setContent] = React.useState<string>(t('legal.loading'))
  React.useEffect(() => {
    if (type === 'terms') {
      import('@/lib/legal-content').then((m) => setContent(m.TERMS_TEXT))
    } else {
      import('@/lib/legal-content').then((m) => setContent(m.PRIVACY_TEXT))
    }
  }, [type])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border/40 bg-background/80 px-5 py-3 backdrop-blur-md">
        <button
          onClick={() => {
            haptic('light')
            onBack()
          }}
          className="flex items-center gap-1 text-[15px] font-medium text-[var(--senlie)] active:scale-95"
        >
          <ChevronLeft size={20} strokeWidth={2.4} />
          {t('legal.back')}
        </button>
        <div className="flex-1 text-center">
          <div className="text-[15px] font-semibold tracking-tight">{title}</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <FileText size={12} />
          v{LEGAL_VERSION}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="prose prose-sm dark:prose-invert max-w-none"
        >
          {/* Senlie legal banner */}
          {type === 'privacy' && (
            <div className="mb-6 rounded-[16px] border border-[var(--senlie)]/20 bg-[var(--senlie-soft)] p-4">
              <div className="flex items-center gap-2">
                <Shield size={18} style={{ color: 'var(--senlie)' }} />
                <span className="text-[14px] font-semibold" style={{ color: 'var(--senlie)' }}>
                  {t('legal.notAdProfile')}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {t('legal.notAdProfileDesc')}
              </p>
            </div>
          )}

          <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
            {content}
          </div>

          <div className="mt-8 border-t border-border/40 pt-4 text-[11px] text-muted-foreground">
            <p>
              {t('legal.versionLine', { version: LEGAL_VERSION, date: LEGAL_EFFECTIVE_DATE })}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Accept button (for onboarding) */}
      {showAcceptButton && (
        <div className="sticky bottom-0 z-10 border-t border-border/40 bg-background/85 px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3 backdrop-blur-xl">
          <div className="mx-auto max-w-2xl">
            <label className="mb-3 flex cursor-pointer items-start gap-3">
              <button
                type="button"
                onClick={() => {
                  haptic('light')
                  setAccepted((v) => !v)
                }}
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
                {t('legal.acceptanceText', { title })}
              </span>
            </label>
            <button
              type="button"
              disabled={!accepted}
              onClick={() => {
                if (!accepted) return
                haptic('medium')
                onAccept?.()
              }}
              className={cn(
                'flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold text-white transition-all',
                'active:scale-[0.99]',
                !accepted && 'cursor-not-allowed opacity-40'
              )}
              style={{ backgroundColor: 'var(--senlie)' }}
            >
              {t('legal.agree')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
