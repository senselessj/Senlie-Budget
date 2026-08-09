'use client'

import * as React from 'react'
import { Camera, Loader2, UserRound } from 'lucide-react'
import { DetailView } from '@/components/senlie/settings-views'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-store'
import { useSenlieUI } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { useT } from '@/hooks/use-t'
import { toast } from 'sonner'

function ageFromBirthDate(value: string | null) {
  if (!value) return null
  const birth = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--
  return age >= 0 ? age : null
}

export function ProfileView() {
  const t = useT()
  const user = useAuth((s) => s.user)
  const updateLocalProfile = useAuth((s) => s.updateLocalProfile)
  const bumpData = useSenlieUI((s) => s.bumpData)
  const [name, setName] = React.useState(user?.name ?? '')
  const [pronouns, setPronouns] = React.useState(user?.pronouns ?? '')
  const [birthDate, setBirthDate] = React.useState(user?.birthDate?.slice(0, 10) ?? '')
  const [avatarUrl, setAvatarUrl] = React.useState(user?.avatarUrl ?? '')
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setName(user?.name ?? '')
    setPronouns(user?.pronouns ?? '')
    setBirthDate(user?.birthDate?.slice(0, 10) ?? '')
    setAvatarUrl(user?.avatarUrl ?? '')
  }, [user?.id, user?.name, user?.pronouns, user?.birthDate, user?.avatarUrl])

  if (!user) return null
  const age = ageFromBirthDate(birthDate || null)

  const uploadAvatar = async (file?: File) => {
    if (!file || !supabase) return
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.imageOnly'))
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error(t('profile.imageTooLarge'))
      return
    }
    setUploading(true)
    try {
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const path = `${user.id}/profile.${extension || 'jpg'}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type,
      })
      if (error) throw error
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?v=${Date.now()}`
      setAvatarUrl(url)
      toast.success(t('profile.photoReady'))
    } catch (e) {
      toast.error(t('profile.photoFailed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/budget/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          pronouns: pronouns.trim() || null,
          birthDate: birthDate || null,
          avatarUrl: avatarUrl || null,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not save profile')
      updateLocalProfile({
        name: name.trim(),
        pronouns: pronouns.trim() || null,
        birthDate: birthDate || null,
        avatarUrl: avatarUrl || null,
      })
      bumpData()
      toast.success(t('profile.saved'))
    } catch (e) {
      toast.error(t('profile.saveFailed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DetailView title={t('profile.title')} subtitle={t('profile.subtitle')}>
      <div className="rounded-[20px] bg-card p-5">
        <div className="flex flex-col items-center text-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground"
          >
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound size={38} />}
            <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ backgroundColor: 'var(--senlie)' }}>
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadAvatar(e.target.files?.[0])} />
          <div className="mt-3 text-[12px] text-muted-foreground">{t('profile.photoHint')}</div>
        </div>
      </div>

      <div className="mt-4 space-y-4 rounded-[20px] bg-card p-5">
        <div>
          <Label>{t('profile.name')}</Label>
          <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div>
          <Label>{t('profile.pronouns')}</Label>
          <Input className="mt-2" value={pronouns} onChange={(e) => setPronouns(e.target.value)} placeholder={t('profile.pronounsPlaceholder')} maxLength={60} />
        </div>
        <div>
          <Label>{t('profile.birthDate')}</Label>
          <Input className="mt-2" type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirthDate(e.target.value)} />
          {age !== null && <div className="mt-2 text-[12px] text-muted-foreground">{t('profile.age', { age })}</div>}
        </div>
        <div>
          <Label>{t('profile.email')}</Label>
          <Input className="mt-2" value={user.email} disabled />
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving || uploading || !name.trim()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[16px] py-4 text-[15px] font-semibold text-white disabled:opacity-50"
        style={{ backgroundColor: 'var(--senlie)' }}
      >
        {saving && <Loader2 size={18} className="animate-spin" />}
        {saving ? t('profile.saving') : t('profile.save')}
      </button>
    </DetailView>
  )
}
