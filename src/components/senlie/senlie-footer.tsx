'use client'

import { SenlieSymbol } from '@/components/senlie/senlie-symbol'
import { useT } from '@/hooks/use-t'

// Sticky Senlie attribution footer.
// Sticks to bottom of viewport when content is short, pushed down naturally when long.
export function SenlieFooter() {
  const t = useT()
  return (
    <footer className="mt-auto w-full px-5 py-8 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <SenlieSymbol size={14} className="text-muted-foreground/60" />
          <span className="text-[11px] font-medium tracking-tight">{t('footer.senlieBudget')}</span>
          <span className="text-[11px] text-muted-foreground/50">·</span>
          <span className="text-[11px] text-muted-foreground/70">{t('settings.bySenlie')}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/50">
          {t('footer.tagline')}
        </p>
      </div>
    </footer>
  )
}
