'use client'

import * as React from 'react'
import { Download, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function InstallAppRow({ className }: { className?: string }) {
  const [promptEvent, setPromptEvent] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = React.useState(false)

  React.useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    setInstalled(standalone)

    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }

    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
      toast.success('Senlie Budget installed')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (installed) {
      toast.success('Senlie Budget is already installed.')
      return
    }

    if (!promptEvent) {
      toast.info('Install Senlie from your browser menu', {
        description: 'On Android Chrome, choose “Add to Home screen” or “Install app”.',
      })
      return
    }

    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    if (choice.outcome === 'accepted') setPromptEvent(null)
  }

  return (
    <button
      type="button"
      onClick={install}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/50',
        className
      )}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-muted text-muted-foreground">
        {installed ? <CheckCircle2 size={16} strokeWidth={2.2} /> : <Download size={16} strokeWidth={2.2} />}
      </div>
      <div className="flex-1">
        <div className="text-[15px] font-medium">{installed ? 'Installed app' : 'Install Senlie Budget'}</div>
        <div className="text-[12px] text-muted-foreground">
          {installed ? 'Running as an installed app' : 'Add Senlie to your Android home screen'}
        </div>
      </div>
      <span className="text-[13px] font-medium text-[var(--senlie)]">
        {installed ? 'Ready' : 'Install'}
      </span>
    </button>
  )
}
