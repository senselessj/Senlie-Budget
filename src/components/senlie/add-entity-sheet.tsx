'use client'

import * as React from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription } from '@/components/ui/drawer'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useSenlieUI, type AddEntityType } from '@/lib/store'
import { useAccountsAndCategories, useHaptic, useHomeSummary } from '@/hooks/use-senlie-data'
import { CategoryIcon, AccountIcon } from '@/components/senlie/category-icon'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/currency'
import { useT } from '@/hooks/use-t'

// Icon picker options — Lucide icon names (must be in the whitelist in finance.ts)
const CATEGORY_ICONS = [
  'tag', 'shopping-cart', 'utensils', 'car', 'home', 'film', 'shopping-bag',
  'heart-pulse', 'briefcase', 'laptop', 'wifi', 'phone', 'plug-zap', 'coffee',
  'pizza', 'bus', 'fuel', 'tv', 'music', 'ticket', 'shirt', 'gift', 'plane',
  'graduation-cap', 'baby', 'paw-print', 'dumbbell', 'book', 'gamepad-2',
  'tree-palm', 'sun', 'moon', 'star', 'flame', 'gem', 'crown', 'trophy',
]

const ACCOUNT_ICONS = [
  'wallet', 'landmark', 'piggy-bank', 'banknote', 'smartphone', 'credit-card',
  'building-2', 'safe', 'coins', 'cash',
]

const CATEGORY_COLORS = [
  '#5965F3', '#34C759', '#FF9F0A', '#0A84FF', '#AF52DE', '#FF375F',
  '#64D2FF', '#BF5AF2', '#FF453A', '#30D158', '#FFB340', '#6E6E73',
]

const ACCOUNT_TYPES = [
  { key: 'checking', labelKey: 'entity.accountTypeChecking' },
  { key: 'savings', labelKey: 'entity.accountTypeSavings' },
  { key: 'cash', labelKey: 'entity.accountTypeCash' },
  { key: 'credit', labelKey: 'entity.accountTypeCredit' },
  { key: 'wallet', labelKey: 'entity.accountTypeWallet' },
]

const FREQUENCIES = [
  { key: 'weekly', labelKey: 'entity.frequencyWeekly' },
  { key: 'biweekly', labelKey: 'entity.frequencyBiweekly' },
  { key: 'monthly', labelKey: 'entity.frequencyMonthly' },
  { key: 'yearly', labelKey: 'entity.frequencyYearly' },
]

export function AddEntitySheet() {
  const type = useSenlieUI((s) => s.addEntityType)
  const close = useSenlieUI((s) => s.closeAddEntity)
  const bumpData = useSenlieUI((s) => s.bumpData)
  const haptic = useHaptic()
  const t = useT()
  const { data: home } = useHomeSummary()
  const symbol = home?.user.currencySymbol ?? 'RD$'

  const open = type !== null

  // Form state
  const [name, setName] = React.useState('')
  const [icon, setIcon] = React.useState(CATEGORY_ICONS[0])
  const [color, setColor] = React.useState(CATEGORY_COLORS[0])
  const [catType, setCatType] = React.useState<'expense' | 'income'>('expense')

  // Account-specific
  const [accType, setAccType] = React.useState('checking')
  const [accIcon, setAccIcon] = React.useState(ACCOUNT_ICONS[0])
  const [balance, setBalance] = React.useState('')
  const [institution, setInstitution] = React.useState('')

  // Goal-specific
  const [targetAmount, setTargetAmount] = React.useState('')
  const [currentAmount, setCurrentAmount] = React.useState('')
  const [targetDate, setTargetDate] = React.useState('')

  // Recurring-specific
  const [amount, setAmount] = React.useState('')
  const [frequency, setFrequency] = React.useState('monthly')
  const [nextDate, setNextDate] = React.useState('')
  const [categoryId, setCategoryId] = React.useState<string | null>(null)
  const [accountId, setAccountId] = React.useState<string | null>(null)
  const [merchant, setMerchant] = React.useState('')

  const [saving, setSaving] = React.useState(false)

  const { data: pickers } = useAccountsAndCategories('expense')
  const categories = pickers?.categories ?? []
  const accounts = pickers?.accounts ?? []

  // Reset form when type changes
  React.useEffect(() => {
    if (type) {
      setName('')
      setIcon(type === 'account' ? ACCOUNT_ICONS[0] : CATEGORY_ICONS[0])
      setColor(CATEGORY_COLORS[0])
      setCatType('expense')
      setAccType('checking')
      setAccIcon(ACCOUNT_ICONS[0])
      setBalance('')
      setInstitution('')
      setTargetAmount('')
      setCurrentAmount('')
      setTargetDate('')
      setAmount('')
      setFrequency('monthly')
      setNextDate(new Date().toISOString().slice(0, 10))
      setCategoryId(null)
      setAccountId(null)
      setMerchant('')
      setSaving(false)
    }
  }, [type])

  const titleKeys: Record<AddEntityType, string> = {
    category: 'entity.newCategory',
    account: 'entity.newAccount',
    goal: 'entity.newGoal',
    recurring: 'entity.newRecurring',
  }

  const canSave = (): boolean => {
    if (!type) return false
    if (!name.trim()) return false
    if (type === 'account') return true
    if (type === 'goal') return parseFloat(targetAmount) > 0
    if (type === 'recurring') return parseFloat(amount) > 0 && !!nextDate
    return true
  }

  const handleSave = async () => {
    if (!type || !canSave()) return
    setSaving(true)
    haptic('medium')
    try {
      let endpoint = ''
      let body: any = { name: name.trim() }

      if (type === 'category') {
        endpoint = '/api/budget/categories'
        body = { name: name.trim(), icon, color, type: catType }
      } else if (type === 'account') {
        endpoint = '/api/budget/accounts'
        body = {
          name: name.trim(),
          type: accType,
          color,
          icon: accIcon,
          openingBalance: balance,
          institution: institution.trim() || undefined,
        }
      } else if (type === 'goal') {
        endpoint = '/api/budget/goals'
        body = {
          name: name.trim(),
          targetAmount,
          currentAmount: currentAmount || 0,
          targetDate: targetDate || undefined,
          color,
          icon,
        }
      } else if (type === 'recurring') {
        endpoint = '/api/budget/recurring'
        body = {
          transactionType: 'expense',
          amount,
          frequency,
          nextDate,
          categoryId: categoryId || undefined,
          accountId: accountId || undefined,
          merchantName: merchant.trim() || undefined,
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save')
      }

      haptic('success')
      toast.success(t('entity.created', { name: name.trim() }), {
        description: name.trim(),
      })
      bumpData()
      close()
    } catch (e: any) {
      haptic('warning')
      toast.error(t('entity.couldntSave'), { description: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && close()}>
      <DrawerContent className="max-h-[94vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center text-[17px] font-semibold tracking-tight">
            {type ? t(titleKeys[type]) : ''}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {type ? t('entity.createDesc', { type: t(titleKeys[type]).toLowerCase() }) : ''}
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="max-h-[70vh]" type="always">
          <div className="space-y-4 px-5 pb-4">
            {/* Name field — universal */}
            <div>
              <Label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                {t('entity.name')}
              </Label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  type === 'category'
                    ? t('entity.placeholderCategory')
                    : type === 'account'
                      ? t('entity.placeholderAccount')
                      : type === 'goal'
                        ? t('entity.placeholderGoal')
                        : t('entity.placeholderRecurring')
                }
                className="h-12 rounded-[14px] border-0 bg-card text-[16px]"
              />
            </div>

            {/* Category type selector */}
            {type === 'category' && (
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                  {t('entity.type')}
                </Label>
                <div className="flex gap-1 rounded-[12px] bg-muted p-1">
                  {(['expense', 'income'] as const).map((tp) => (
                    <button
                      key={tp}
                      onClick={() => {
                        haptic('light')
                        setCatType(tp)
                      }}
                      className={cn(
                        'relative flex-1 rounded-[9px] py-2 text-[13px] font-semibold capitalize transition-colors',
                        catType === tp ? 'text-background' : 'text-muted-foreground'
                      )}
                      style={catType === tp ? { backgroundColor: 'var(--senlie)' } : undefined}
                    >
                      {tp === 'expense' ? t('entity.expense') : t('entity.income')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Account type */}
            {type === 'account' && (
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                  {t('entity.accountType')}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {ACCOUNT_TYPES.map((tp) => (
                    <button
                      key={tp.key}
                      onClick={() => {
                        haptic('light')
                        setAccType(tp.key)
                      }}
                      className={cn(
                        'rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors',
                        accType === tp.key
                          ? 'text-white'
                          : 'bg-card text-muted-foreground'
                      )}
                      style={accType === tp.key ? { backgroundColor: 'var(--senlie)' } : undefined}
                    >
                      {t(tp.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Opening balance (account) */}
            {type === 'account' && (
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                  {t('entity.openingBalance')}
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-semibold text-muted-foreground">
                    {symbol}
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0"
                    className="h-12 rounded-[14px] border-0 bg-card pl-10 text-[16px] tnum"
                  />
                </div>
              </div>
            )}

            {/* Institution (account) */}
            {type === 'account' && (
              <div>
                <Label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                  {t('entity.institution')} <span className="text-muted-foreground/60">{t('entity.optional')}</span>
                </Label>
                <Input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Banco Popular"
                  className="h-12 rounded-[14px] border-0 bg-card text-[16px]"
                />
              </div>
            )}

            {/* Goal: target + current + date */}
            {type === 'goal' && (
              <>
                <div>
                  <Label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                    {t('entity.targetAmount')}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-semibold text-muted-foreground">
                      {symbol}
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="0"
                      className="h-12 rounded-[14px] border-0 bg-card pl-10 text-[16px] tnum"
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                    {t('entity.alreadySaved')} <span className="text-muted-foreground/60">{t('entity.optional')}</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-semibold text-muted-foreground">
                      {symbol}
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                      placeholder="0"
                      className="h-12 rounded-[14px] border-0 bg-card pl-10 text-[16px] tnum"
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                    {t('entity.targetDate')} <span className="text-muted-foreground/60">{t('entity.optional')}</span>
                  </Label>
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="h-12 rounded-[14px] border-0 bg-card text-[16px]"
                  />
                </div>
              </>
            )}

            {/* Recurring: amount + frequency + next date + merchant + category + account */}
            {type === 'recurring' && (
              <>
                <div>
                  <Label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                    {t('entity.amount')}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-semibold text-muted-foreground">
                      {symbol}
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="h-12 rounded-[14px] border-0 bg-card pl-10 text-[16px] tnum"
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                    {t('entity.merchant')} <span className="text-muted-foreground/60">{t('entity.optional')}</span>
                  </Label>
                  <Input
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="e.g. Netflix"
                    className="h-12 rounded-[14px] border-0 bg-card text-[16px]"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                    {t('entity.frequency')}
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {FREQUENCIES.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => {
                          haptic('light')
                          setFrequency(f.key)
                        }}
                        className={cn(
                          'rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors',
                          frequency === f.key ? 'text-white' : 'bg-card text-muted-foreground'
                        )}
                        style={frequency === f.key ? { backgroundColor: 'var(--senlie)' } : undefined}
                      >
                        {t(f.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">
                    {t('entity.nextDate')}
                  </Label>
                  <Input
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="h-12 rounded-[14px] border-0 bg-card text-[16px]"
                  />
                </div>

                {/* Category picker */}
                <PickerField
                  label={t('add.category')}
                  value={categoryId}
                  options={categories.map((c) => ({ id: c.id, label: c.name, icon: c.icon, color: c.color }))}
                  onSelect={(id) => {
                    haptic('light')
                    setCategoryId(id)
                  }}
                  iconRenderer="category"
                  placeholder={t('add.select')}
                />

                {/* Account picker */}
                <PickerField
                  label={t('add.account')}
                  value={accountId}
                  options={accounts.map((a) => ({ id: a.id, label: a.name, icon: a.icon, color: a.color }))}
                  onSelect={(id) => {
                    haptic('light')
                    setAccountId(id)
                  }}
                  iconRenderer="account"
                  placeholder={t('add.select')}
                />
              </>
            )}

            {/* Color picker — for category, account, goal */}
            {type && type !== 'recurring' && (
              <div>
                <Label className="mb-2 block text-[13px] font-medium text-muted-foreground">
                  {t('entity.color')}
                </Label>
                <div className="flex flex-wrap gap-2.5">
                  {CATEGORY_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        haptic('light')
                        setColor(c)
                      }}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90',
                        color === c && 'ring-2 ring-offset-2 ring-offset-background'
                      )}
                      style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }}
                    >
                      {color === c && <Check size={16} className="text-white" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Icon picker — for category, account, goal */}
            {type && type !== 'recurring' && (
              <div>
                <Label className="mb-2 block text-[13px] font-medium text-muted-foreground">
                  {t('entity.icon')}
                </Label>
                <ScrollArea className="h-[120px] w-full rounded-[14px] bg-card p-3" type="always">
                  <div className="grid grid-cols-7 gap-2">
                    {(type === 'account' ? ACCOUNT_ICONS : CATEGORY_ICONS).map((ic) => {
                      const IconComp = type === 'account' ? AccountIcon : CategoryIcon
                      return (
                        <button
                          key={ic}
                          onClick={() => {
                            haptic('light')
                            if (type === 'account') setAccIcon(ic)
                            else setIcon(ic)
                          }}
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-[10px] transition-transform active:scale-90',
                            ((type === 'account' && accIcon === ic) || (type !== 'account' && icon === ic)) &&
                              'ring-2'
                          )}
                        >
                          <IconComp
                            name={ic}
                            color={color}
                            size={36}
                            iconSize={18}
                            rounded="rounded-[10px]"
                          />
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Live preview */}
            {type && type !== 'recurring' && name.trim() && (
              <div className="rounded-[14px] bg-muted/50 p-4">
                <div className="mb-2 text-[12px] font-medium text-muted-foreground">{t('entity.preview')}</div>
                <div className="flex items-center gap-3">
                  {type === 'account' ? (
                    <AccountIcon name={accIcon} color={color} size={44} iconSize={22} />
                  ) : (
                    <CategoryIcon name={icon} color={color} size={44} iconSize={22} />
                  )}
                  <div className="flex-1">
                    <div className="text-[15px] font-medium">{name.trim()}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {type === 'category'
                        ? catType === 'expense'
                          ? t('entity.expenseCategory')
                          : t('entity.incomeCategory')
                        : type === 'account'
                          ? t(ACCOUNT_TYPES.find((tp) => tp.key === accType)?.labelKey ?? '')
                          : t('entity.savingsGoal')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DrawerFooter className="px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-2">
          <button
            onClick={handleSave}
            disabled={!canSave() || saving}
            className="h-[52px] w-full rounded-[14px] text-[15px] font-semibold text-white transition-all disabled:opacity-40 active:scale-[0.98]"
            style={{ backgroundColor: 'var(--senlie)' }}
          >
            {saving ? t('entity.saving') : t(type === 'category' ? 'entity.createCategory' : type === 'account' ? 'entity.createAccount' : type === 'goal' ? 'entity.createGoal' : 'entity.createRecurring')}
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function PickerField({
  label,
  value,
  options,
  onSelect,
  iconRenderer,
  placeholder,
}: {
  label: string
  value: string | null
  options: Array<{ id: string; label: string; icon: string; color: string }>
  onSelect: (id: string) => void
  iconRenderer: 'category' | 'account'
  placeholder?: string
}) {
  const selected = options.find((o) => o.id === value)
  return (
    <div>
      <Label className="mb-1.5 block text-[13px] font-medium text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex h-12 w-full items-center gap-3 rounded-[14px] bg-card px-4 text-left">
            {selected ? (
              iconRenderer === 'category' ? (
                <CategoryIcon name={selected.icon} color={selected.color} size={32} iconSize={16} />
              ) : (
                <AccountIcon name={selected.icon} color={selected.color} size={32} iconSize={16} />
              )
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-muted text-muted-foreground">
                <Check size={16} />
              </div>
            )}
            <span className={cn('flex-1 text-[15px] font-medium', !selected && 'text-muted-foreground')}>
              {selected ? selected.label : (placeholder ?? 'Select')}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-3" align="center">
          <div className="max-h-[280px] overflow-y-auto">
            {options.map((o) => (
              <button
                key={o.id}
                onClick={() => onSelect(o.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[10px] p-2 text-left transition-colors hover:bg-muted',
                  value === o.id && 'bg-muted'
                )}
              >
                {iconRenderer === 'category' ? (
                  <CategoryIcon name={o.icon} color={o.color} size={32} iconSize={16} />
                ) : (
                  <AccountIcon name={o.icon} color={o.color} size={32} iconSize={16} />
                )}
                <span className="flex-1 text-[14px] font-medium">{o.label}</span>
                {value === o.id && <Check size={16} style={{ color: 'var(--senlie)' }} />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
