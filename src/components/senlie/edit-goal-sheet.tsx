'use client'

import * as React from 'react'
import { Check, Loader2, Trash2 } from 'lucide-react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CategoryIcon } from '@/components/senlie/category-icon'
import { useGoals, useHaptic, useHomeSummary } from '@/hooks/use-senlie-data'
import { useSenlieUI } from '@/lib/store'
import { GOAL_ICONS, ENTITY_COLORS } from '@/lib/icon-catalog'
import { cn } from '@/lib/utils'
import { useT } from '@/hooks/use-t'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/currency'

export function EditGoalSheet() {
  const t = useT()
  const goalId = useSenlieUI((s) => s.editingGoalId)
  const setGoalId = useSenlieUI((s) => s.setEditingGoalId)
  const bumpData = useSenlieUI((s) => s.bumpData)
  const { data: goals } = useGoals()
  const { data: home } = useHomeSummary()
  const haptic = useHaptic()
  const goal = goals?.find((g) => g.id === goalId)
  const symbol = home?.user.currencySymbol ?? 'RD$'

  const [name, setName] = React.useState('')
  const [targetAmount, setTargetAmount] = React.useState('')
  const [currentAmount, setCurrentAmount] = React.useState('')
  const [targetDate, setTargetDate] = React.useState('')
  const [color, setColor] = React.useState<string>(ENTITY_COLORS[0])
  const [icon, setIcon] = React.useState<string>(GOAL_ICONS[0])
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    if (!goal) return
    setName(goal.name)
    setTargetAmount(String(goal.targetAmount))
    setCurrentAmount(String(goal.currentAmount))
    setTargetDate(goal.targetDate ? goal.targetDate.slice(0, 10) : '')
    setColor(goal.color || ENTITY_COLORS[0])
    setIcon(goal.icon || GOAL_ICONS[0])
  }, [goal?.id])

  const canSave = Boolean(name.trim()) && Number(targetAmount) > 0 && Number(currentAmount) >= 0

  const close = () => setGoalId(null)

  const save = async () => {
    if (!goal || !canSave || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/budget/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: goal.id,
          name: name.trim(),
          targetAmount,
          currentAmount,
          targetDate: targetDate || null,
          color,
          icon,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not update goal')
      haptic('success')
      toast.success(t('goal.updated'))
      bumpData()
      close()
    } catch (e) {
      haptic('warning')
      toast.error(t('goal.updateFailed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!goal || deleting) return
    const ok = window.confirm(t('goal.deleteConfirm', { name: goal.name }))
    if (!ok) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/budget/goals?id=${encodeURIComponent(goal.id)}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not delete goal')
      haptic('success')
      toast.success(t('goal.deleted'))
      bumpData()
      close()
    } catch (e) {
      haptic('warning')
      toast.error(t('goal.deleteFailed'), { description: e instanceof Error ? e.message : undefined })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Drawer open={Boolean(goalId)} onOpenChange={(open) => { if (!open) close() }}>
      <DrawerContent className="senlie-sheet senlie-full-sheet">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center text-[17px] font-semibold tracking-tight">{t('goal.edit')}</DrawerTitle>
          <DrawerDescription className="sr-only">{t('goal.editDesc')}</DrawerDescription>
        </DrawerHeader>

        <div className="senlie-sheet-scroll px-5 pb-5">
          {goal ? (
            <div className="mx-auto w-full max-w-md space-y-5">
              <div className="rounded-[18px] bg-card p-4">
                <div className="flex items-center gap-3">
                  <CategoryIcon name={icon} color={color} size={46} iconSize={22} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-semibold">{name || t('goal.untitled')}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {formatMoney(Number(currentAmount) || 0, { symbol, decimalPlaces: 0 })} / {formatMoney(Number(targetAmount) || 0, { symbol, decimalPlaces: 0 })}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label>{t('goal.name')}</Label>
                <Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('goal.targetAmount')}</Label>
                  <Input className="mt-2" inputMode="decimal" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
                </div>
                <div>
                  <Label>{t('goal.savedAmount')}</Label>
                  <Input className="mt-2" inputMode="decimal" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>{t('goal.targetDate')}</Label>
                <Input className="mt-2" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>

              <div>
                <Label className="mb-2 block">{t('entity.color')}</Label>
                <div className="flex flex-wrap gap-2.5">
                  {ENTITY_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn('flex h-9 w-9 items-center justify-center rounded-full active:scale-90', color === c && 'ring-2 ring-offset-2 ring-offset-background')}
                      style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                    >
                      {color === c && <Check size={16} className="text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">{t('entity.icon')}</Label>
                <ScrollArea className="h-[150px] rounded-[14px] bg-card p-3" type="always">
                  <div className="grid grid-cols-7 gap-2">
                    {GOAL_ICONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setIcon(item)}
                        className={cn('flex h-9 w-9 items-center justify-center rounded-[10px] active:scale-90', icon === item && 'ring-2')}
                      >
                        <CategoryIcon name={item} color={color} size={36} iconSize={18} rounded="rounded-[10px]" />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <button
                type="button"
                onClick={remove}
                disabled={deleting || saving}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-negative/10 py-3 text-[14px] font-semibold text-negative disabled:opacity-50"
              >
                {deleting ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
                {t('goal.delete')}
              </button>
            </div>
          ) : null}
        </div>

        <DrawerFooter className="senlie-sheet-footer px-5">
          <button
            type="button"
            onClick={save}
            disabled={!canSave || saving || deleting || !goal}
            className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-[16px] py-4 text-[15px] font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: 'var(--senlie)' }}
          >
            {saving ? <Loader2 size={19} className="animate-spin" /> : <Check size={19} />}
            {saving ? t('goal.saving') : t('goal.save')}
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
