'use client'

import * as React from 'react'
import { Check, Loader2, Trash2, LockKeyhole } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CategoryIcon } from '@/components/senlie/category-icon'
import { useAccountsAndCategories, useHaptic } from '@/hooks/use-senlie-data'
import { useSenlieUI } from '@/lib/store'
import { CATEGORY_ICONS, ENTITY_COLORS } from '@/lib/icon-catalog'
import { cn } from '@/lib/utils'
import { useT } from '@/hooks/use-t'
import { toast } from 'sonner'

export function EditCategorySheet() {
  const t = useT()
  const categoryId = useSenlieUI((s) => s.editingCategoryId)
  const setCategoryId = useSenlieUI((s) => s.setEditingCategoryId)
  const bumpData = useSenlieUI((s) => s.bumpData)
  const { data: pickers } = useAccountsAndCategories()
  const haptic = useHaptic()
  const category = pickers?.categories.find((c) => c.id === categoryId)

  const [name, setName] = React.useState('')
  const [originalDisplayName, setOriginalDisplayName] = React.useState('')
  const [color, setColor] = React.useState<string>(ENTITY_COLORS[0])
  const [icon, setIcon] = React.useState<string>(CATEGORY_ICONS[0])
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    if (!category) return
    // `category.name` is already localized for default categories. Keep the
    // localized display value in the field, but only send a rename when the
    // user actually changes it. This prevents simply editing an icon/color in
    // Spanish from permanently renaming "Transport" to "Transporte" in DB.
    setName(category.name)
    setOriginalDisplayName(category.name)
    setColor(category.color || ENTITY_COLORS[0])
    setIcon(category.icon || CATEGORY_ICONS[0])
  }, [category?.id])

  const close = () => setCategoryId(null)
  const canSave = Boolean(name.trim())

  const save = async () => {
    if (!category || !canSave || saving || deleting) return
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        id: category.id,
        icon,
        color,
      }

      // Omit name when untouched so system-category localization stays intact.
      if (name.trim() !== originalDisplayName.trim()) payload.name = name.trim()

      const res = await fetch('/api/budget/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || t('category.updateFailed'))

      haptic('success')
      toast.success(t('category.updated'))
      bumpData()
      close()
    } catch (e) {
      haptic('warning')
      toast.error(t('category.updateFailed'), {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!category || category.isSystem || deleting || saving) return
    const ok = window.confirm(t('category.deleteConfirm', { name: category.name }))
    if (!ok) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/budget/categories?id=${encodeURIComponent(category.id)}`, {
        method: 'DELETE',
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || t('category.deleteFailed'))

      haptic('success')
      toast.success(t('category.deleted'))
      bumpData()
      close()
    } catch (e) {
      haptic('warning')
      toast.error(t('category.deleteFailed'), {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Drawer open={Boolean(categoryId)} onOpenChange={(open) => { if (!open) close() }}>
      <DrawerContent className="senlie-sheet senlie-full-sheet">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center text-[17px] font-semibold tracking-tight">
            {t('category.edit')}
          </DrawerTitle>
          <DrawerDescription className="sr-only">{t('category.editDesc')}</DrawerDescription>
        </DrawerHeader>

        <div className="senlie-sheet-scroll px-5 pb-5">
          {category ? (
            <div className="mx-auto w-full max-w-md space-y-5">
              <div className="rounded-[18px] bg-card p-4">
                <div className="flex items-center gap-3">
                  <CategoryIcon name={icon} color={color} size={46} iconSize={22} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-semibold">
                      {name || t('category.untitled')}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {category.type === 'income' ? t('entity.incomeCategory') : t('entity.expenseCategory')}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>{t('entity.name')}</Label>
                <Input
                  className="mt-2 h-12 rounded-[14px]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div>
                <Label className="mb-2 block">{t('entity.type')}</Label>
                <div className="flex items-center justify-between rounded-[14px] bg-card px-4 py-3">
                  <div>
                    <div className="text-[14px] font-medium">
                      {category.type === 'income' ? t('entity.income') : t('entity.expense')}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {t('category.typeLockedHint')}
                    </div>
                  </div>
                  <LockKeyhole size={17} className="text-muted-foreground" />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">{t('entity.color')}</Label>
                <div className="flex flex-wrap gap-2.5">
                  {ENTITY_COLORS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        haptic('light')
                        setColor(item)
                      }}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90',
                        color === item && 'ring-2 ring-offset-2 ring-offset-background'
                      )}
                      style={{
                        backgroundColor: item,
                        boxShadow: color === item ? `0 0 0 2px ${item}` : undefined,
                      }}
                      aria-label={item}
                    >
                      {color === item && <Check size={16} className="text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">{t('entity.icon')}</Label>
                <ScrollArea className="h-[190px] rounded-[14px] bg-card p-3" type="always">
                  <div className="grid grid-cols-7 gap-2">
                    {CATEGORY_ICONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          haptic('light')
                          setIcon(item)
                        }}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-[10px] transition-transform active:scale-90',
                          icon === item && 'ring-2'
                        )}
                        aria-label={item}
                      >
                        <CategoryIcon
                          name={item}
                          color={color}
                          size={36}
                          iconSize={18}
                          rounded="rounded-[10px]"
                        />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {category.isSystem ? (
                <div className="rounded-[14px] bg-muted/55 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
                  {t('category.systemHint')}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={remove}
                  disabled={deleting || saving}
                  className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-negative/10 py-3 text-[14px] font-semibold text-negative disabled:opacity-50"
                >
                  {deleting ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
                  {t('category.delete')}
                </button>
              )}
            </div>
          ) : null}
        </div>

        <DrawerFooter className="senlie-sheet-footer px-5">
          <button
            type="button"
            onClick={save}
            disabled={!canSave || saving || deleting || !category}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-[16px] py-4 text-[15px] font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--senlie)' }}
          >
            {saving ? <Loader2 size={19} className="animate-spin" /> : <Check size={19} />}
            {saving ? t('category.saving') : t('category.save')}
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
