'use client'

import * as React from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerDescription } from '@/components/ui/drawer'
import { motion, AnimatePresence } from 'framer-motion'
import { Delete, Check, Calendar as CalendarIcon, Tag, Wallet, FileText, Camera, ChevronRight, ArrowRightLeft } from 'lucide-react'
import { useSenlieUI } from '@/lib/store'
import { useAccountsAndCategories, useHaptic, useHomeSummary } from '@/hooks/use-senlie-data'
import { CategoryIcon, AccountIcon } from '@/components/senlie/category-icon'
import { formatMoney } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useT, useLanguage } from '@/hooks/use-t'

type TxType = 'expense' | 'income' | 'transfer'

export function AddTransactionSheet() {
  const open = useSenlieUI((s) => s.addSheetOpen)
  const setOpen = useSenlieUI((s) => s.setAddSheetOpen)
  const bumpData = useSenlieUI((s) => s.bumpData)
  const editingTransactionId = useSenlieUI((s) => s.editingTransactionId)
  const setEditingTransactionId = useSenlieUI((s) => s.setEditingTransactionId)
  const haptic = useHaptic()
  const t = useT()
  const { locale } = useLanguage()
  const { data: home } = useHomeSummary()
  const symbol = home?.user.currencySymbol ?? 'RD$'

  const isEditing = !!editingTransactionId
  const sheetOpen = open || isEditing

  const [type, setType] = React.useState<TxType>('expense')
  const [amount, setAmount] = React.useState('')
  const [merchant, setMerchant] = React.useState('')
  const [categoryId, setCategoryId] = React.useState<string | null>(null)
  const [accountId, setAccountId] = React.useState<string | null>(null)
  const [toAccountId, setToAccountId] = React.useState<string | null>(null)
  const [date, setDate] = React.useState<Date>(() => new Date())
  const [note, setNote] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const { data: pickers } = useAccountsAndCategories(type)
  const accounts = pickers?.accounts ?? []
  const categories = pickers?.categories ?? []

  // When opening for a new transaction, reset the form
  React.useEffect(() => {
    if (open && !isEditing) {
      setType('expense')
      setAmount('')
      setMerchant('')
      setCategoryId(null)
      setAccountId(null)
      setToAccountId(null)
      setDate(new Date())
      setNote('')
      setSaving(false)
    }
  }, [open, isEditing])

  // When editing, load the transaction data
  React.useEffect(() => {
    if (!editingTransactionId) return
    // Find in home recent transactions first
    const fromHome = home?.recentTransactions?.find((t) => t.id === editingTransactionId)
    if (fromHome) {
      setType(fromHome.type as TxType)
      setAmount(String(fromHome.amount))
      setMerchant(fromHome.merchantName ?? '')
      setCategoryId(fromHome.categoryId)
      setAccountId(fromHome.accountId)
      setDate(new Date(fromHome.date))
      setNote(fromHome.description ?? '')
      setSaving(false)
      return
    }
    // Otherwise fetch from activity
    fetch('/api/budget/activity?filter=all')
      .then((r) => r.json())
      .then((groups: any[]) => {
        for (const g of groups) {
          const found = g.transactions.find((t: any) => t.id === editingTransactionId)
          if (found) {
            setType(found.type as TxType)
            setAmount(String(found.amount))
            setMerchant(found.merchantName ?? '')
            setCategoryId(found.categoryId)
            setAccountId(found.accountId)
            setDate(new Date(found.date))
            setNote(found.description ?? '')
            return
          }
        }
      })
  }, [editingTransactionId, home])

  const closeSheet = () => {
    if (isEditing) {
      setEditingTransactionId(null)
    } else {
      setOpen(false)
    }
  }

  // Reset category when type changes
  React.useEffect(() => {
    setCategoryId(null)
  }, [type])

  const numericAmount = parseFloat(amount || '0') || 0

  const pressKey = (k: string) => {
    haptic('light')
    if (k === 'del') {
      setAmount((a) => a.slice(0, -1))
      return
    }
    if (k === '.') {
      if (amount.includes('.')) return
      setAmount((a) => (a === '' ? '0.' : a + '.'))
      return
    }
    // Limit to 2 decimal places
    if (amount.includes('.') && amount.split('.')[1]?.length >= 2) return
    // Limit integer part to 8 digits
    const intPart = amount.split('.')[0]
    if (!amount.includes('.') && intPart.length >= 8) return
    setAmount((a) => a + k)
  }

  const canSave =
    numericAmount > 0 &&
    !!accountId &&
    (type !== 'transfer' || (!!toAccountId && toAccountId !== accountId))

  const handleSave = async () => {
    if (!canSave || !accountId) return
    setSaving(true)
    haptic('medium')
    try {
      if (isEditing && editingTransactionId) {
        // PATCH existing transaction
        const res = await fetch(`/api/budget/transactions?id=${editingTransactionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            amount: numericAmount,
            merchantName: merchant || undefined,
            categoryId: categoryId || undefined,
            accountId,
            toAccountId: type === 'transfer' ? toAccountId : undefined,
            date: date.toISOString(),
            description: note || undefined,
            paymentMethod: type === 'transfer' ? 'transfer' : 'debit',
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to save')
        }
        haptic('success')
        toast.success(t('add.transactionUpdated'))
        bumpData()
        setEditingTransactionId(null)
      } else {
        // POST new transaction
        const res = await fetch('/api/budget/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            amount: numericAmount,
            merchantName: merchant || undefined,
            categoryId: categoryId || undefined,
            accountId,
            toAccountId: type === 'transfer' ? toAccountId : undefined,
            date: date.toISOString(),
            description: note || undefined,
            paymentMethod: type === 'transfer' ? 'transfer' : 'debit',
          }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to save')
        }
        haptic('success')
        toast.success(
          type === 'expense'
            ? t('add.expenseSaved', { amount: formatMoney(numericAmount, { symbol, decimalPlaces: 0 }) })
            : type === 'income'
              ? t('add.incomeRecorded', { amount: formatMoney(numericAmount, { symbol, decimalPlaces: 0 }) })
              : t('add.transferSaved', { amount: formatMoney(numericAmount, { symbol, decimalPlaces: 0 }) })
        )
        bumpData()
        setOpen(false)
      }
    } catch (e: any) {
      haptic('warning')
      toast.error(t('add.couldntSave'), {
        description: t('add.couldntSaveDesc'),
      })
    } finally {
      setSaving(false)
    }
  }

  const typeColor =
    type === 'expense' ? 'var(--senlie)' : type === 'income' ? 'var(--positive)' : 'var(--warning)'

  return (
    <Drawer open={sheetOpen} onOpenChange={(o) => { if (!o) closeSheet() }}>
      <DrawerContent className="senlie-sheet">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-center text-[17px] font-semibold tracking-tight">
            {isEditing ? t('add.edit') : t('add.title')}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {isEditing ? t('add.editDesc') : t('add.addDesc')}
          </DrawerDescription>
        </DrawerHeader>

        {/* Type selector — segmented control */}
        <div className="px-5 pb-3">
          <div className="flex gap-1 rounded-[14px] bg-muted p-1">
            {(['expense', 'income', 'transfer'] as TxType[]).map((txType) => {
              const isActive = type === txType
              const labels = { expense: t('add.expense'), income: t('add.income'), transfer: t('add.transfer') }
              return (
                <button
                  key={txType}
                  onClick={() => {
                    haptic('light')
                    setType(txType)
                  }}
                  className={cn(
                    'relative flex-1 rounded-[10px] py-2 text-[13px] font-semibold transition-colors',
                    isActive ? 'text-background' : 'text-muted-foreground'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="tx-type-pill"
                      className="absolute inset-0 rounded-[10px]"
                      style={{
                        backgroundColor:
                          txType === 'expense'
                            ? 'var(--senlie)'
                            : txType === 'income'
                              ? 'var(--positive)'
                              : 'var(--warning)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative">{labels[txType]}</span>
                </button>
              )
            })}
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1" type="always">
          <div className="px-5 pb-4">
            {/* Amount hero */}
            <div className="py-6 text-center">
              <div className="text-[13px] text-muted-foreground">
                {type === 'expense' ? t('add.expenseAmount') : type === 'income' ? t('add.incomeAmount') : t('add.transferAmount')}
              </div>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span
                  className="text-[18px] font-semibold"
                  style={{ color: typeColor }}
                >
                  {symbol}
                </span>
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={amount || '0'}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="text-[44px] font-semibold tracking-tight tnum"
                  >
                    {amount || '0'}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map((k) => (
                <button
                  key={k}
                  onClick={() => pressKey(k)}
                  className={cn(
                    'flex h-14 items-center justify-center rounded-[14px] bg-card text-[22px] font-semibold tnum transition-colors active:scale-[0.97]',
                    k === 'del' && 'text-muted-foreground'
                  )}
                >
                  {k === 'del' ? <Delete size={22} strokeWidth={2.2} /> : k}
                </button>
              ))}
            </div>

            {/* Merchant (expense/income) */}
            {type !== 'transfer' && (
              <FieldRow
                icon={<Tag size={18} />}
                label={t('add.merchant')}
                value={merchant || t('add.addMerchant')}
                placeholder
                onEdit={setMerchant}
                editable
              />
            )}

            {/* Category (expense/income) */}
            {type !== 'transfer' && (
              <div className="mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex w-full items-center gap-3 rounded-[16px] bg-card p-4 text-left transition-colors active:scale-[0.99]">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
                        <Wallet size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="text-[12px] text-muted-foreground">{t('add.category')}</div>
                        <div
                          className={cn(
                            'text-[15px] font-medium',
                            !categoryId && 'text-muted-foreground'
                          )}
                        >
                          {categoryId
                            ? categories.find((c) => c.id === categoryId)?.name
                            : t('add.select')}
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-3" align="center">
                    <div className="mb-2 text-[13px] font-semibold text-muted-foreground">
                      {t('add.selectCategory')}
                    </div>
                    <div className="grid max-h-[320px] grid-cols-1 gap-1 overflow-y-auto">
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            haptic('light')
                            setCategoryId(c.id)
                          }}
                          className={cn(
                            'flex items-center gap-3 rounded-[12px] p-2.5 text-left transition-colors hover:bg-muted',
                            categoryId === c.id && 'bg-muted'
                          )}
                        >
                          <CategoryIcon name={c.icon} color={c.color} size={36} iconSize={18} />
                          <span className="flex-1 text-[15px] font-medium">{c.name}</span>
                          {categoryId === c.id && (
                            <Check size={18} style={{ color: 'var(--senlie)' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Account */}
            <div className="mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex w-full items-center gap-3 rounded-[16px] bg-card p-4 text-left transition-colors active:scale-[0.99]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
                      <Wallet size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[12px] text-muted-foreground">
                        {type === 'transfer' ? t('add.fromAccount') : t('add.account')}
                      </div>
                      <div
                        className={cn(
                          'text-[15px] font-medium',
                          !accountId && 'text-muted-foreground'
                        )}
                      >
                        {accountId
                          ? accounts.find((a) => a.id === accountId)?.name
                          : t('add.select')}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-3" align="center">
                  <div className="mb-2 text-[13px] font-semibold text-muted-foreground">
                    {t('add.selectAccount')}
                  </div>
                  <div className="grid max-h-[320px] grid-cols-1 gap-1 overflow-y-auto">
                    {accounts.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          haptic('light')
                          setAccountId(a.id)
                        }}
                        className={cn(
                          'flex items-center gap-3 rounded-[12px] p-2.5 text-left transition-colors hover:bg-muted',
                          accountId === a.id && 'bg-muted'
                        )}
                      >
                        <AccountIcon name={a.icon} color={a.color} size={36} iconSize={18} />
                        <div className="flex-1">
                          <div className="text-[15px] font-medium">{a.name}</div>
                          <div className="text-[12px] text-muted-foreground tnum">
                            {formatMoney(a.currentBalance, { symbol, decimalPlaces: 0 })}
                          </div>
                        </div>
                        {accountId === a.id && (
                          <Check size={18} style={{ color: 'var(--senlie)' }} />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* To account — only for transfers */}
            {type === 'transfer' && (
              <div className="mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex w-full items-center gap-3 rounded-[16px] bg-card p-4 text-left transition-colors active:scale-[0.99]">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
                        <ArrowRightLeft size={18} />
                      </div>
                      <div className="flex-1">
                        <div className="text-[12px] text-muted-foreground">{t('add.toAccount')}</div>
                        <div
                          className={cn(
                            'text-[15px] font-medium',
                            !toAccountId && 'text-muted-foreground'
                          )}
                        >
                          {toAccountId
                            ? accounts.find((a) => a.id === toAccountId)?.name
                            : t('add.select')}
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-3" align="center">
                    <div className="mb-2 text-[13px] font-semibold text-muted-foreground">
                      {t('add.selectDestinationAccount')}
                    </div>
                    <div className="grid max-h-[320px] grid-cols-1 gap-1 overflow-y-auto">
                      {accounts
                        .filter((a) => a.id !== accountId)
                        .map((a) => (
                          <button
                            key={a.id}
                            onClick={() => {
                              haptic('light')
                              setToAccountId(a.id)
                            }}
                            className={cn(
                              'flex items-center gap-3 rounded-[12px] p-2.5 text-left transition-colors hover:bg-muted',
                              toAccountId === a.id && 'bg-muted'
                            )}
                          >
                            <AccountIcon name={a.icon} color={a.color} size={36} iconSize={18} />
                            <div className="flex-1">
                              <div className="text-[15px] font-medium">{a.name}</div>
                              <div className="text-[12px] text-muted-foreground tnum">
                                {formatMoney(a.currentBalance, { symbol, decimalPlaces: 0 })}
                              </div>
                            </div>
                            {toAccountId === a.id && (
                              <Check size={18} style={{ color: 'var(--senlie)' }} />
                            )}
                          </button>
                        ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Transfer note — explains the movement */}
            {type === 'transfer' && (
              <div className="mt-2 rounded-[14px] bg-[var(--senlie-soft)] px-4 py-2.5">
                <p className="text-[12px] text-muted-foreground">
                  Transfers move money between accounts without counting as spending.
                  {accountId && toAccountId && toAccountId !== accountId && (
                    <span className="mt-1 block font-medium" style={{ color: 'var(--senlie)' }}>
                      {accounts.find((a) => a.id === accountId)?.name} →{' '}
                      {accounts.find((a) => a.id === toAccountId)?.name}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Date */}
            <div className="mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex w-full items-center gap-3 rounded-[16px] bg-card p-4 text-left transition-colors active:scale-[0.99]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
                      <CalendarIcon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[12px] text-muted-foreground">{t('add.date')}</div>
                      <div className="text-[15px] font-medium">
                        {date.toLocaleDateString(locale, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Note */}
            <FieldRow
              icon={<FileText size={18} />}
              label="Note"
              value={note || 'Add note'}
              placeholder
              onEdit={setNote}
              editable
            />

            {/* Optional chips row (UI only for v1) */}
            <div className="mt-3 flex gap-2">
              {[
                { icon: Camera, label: 'Receipt' },
                { icon: Tag, label: 'Tags' },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => haptic('light')}
                  className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground"
                >
                  <chip.icon size={14} />
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>

        <DrawerFooter className="senlie-sheet-footer px-5 pt-2">
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className={cn(
              'h-13 w-full rounded-[14px] py-3.5 text-[15px] font-semibold text-white transition-all',
              'disabled:opacity-40 disabled:active:scale-100',
              'active:scale-[0.98]'
            )}
            style={{ backgroundColor: typeColor, height: 52 }}
          >
            {saving
              ? 'Saving…'
              : isEditing
                ? 'Save Changes'
                : type === 'expense'
                  ? 'Save Expense'
                  : type === 'income'
                    ? 'Save Income'
                    : 'Save Transfer'}
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function FieldRow({
  icon,
  label,
  value,
  placeholder,
  onEdit,
  editable,
}: {
  icon: React.ReactNode
  label: string
  value: string
  placeholder?: boolean
  onEdit: (v: string) => void
  editable?: boolean
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const haptic = useHaptic()

  React.useEffect(() => {
    setDraft(value)
  }, [value])

  if (editing) {
    return (
      <div className="mt-2 rounded-[16px] bg-card p-4">
        <div className="text-[12px] text-muted-foreground">{label}</div>
        <input
          autoFocus
          value={draft === value && placeholder ? '' : draft}
          placeholder={placeholder ? value : ''}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            onEdit(draft)
            setEditing(false)
            haptic('light')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onEdit(draft)
              setEditing(false)
              haptic('light')
            }
          }}
          className="mt-1 w-full bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground"
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        if (editable) {
          setDraft('')
          setEditing(true)
        }
      }}
      className="mt-2 flex w-full items-center gap-3 rounded-[16px] bg-card p-4 text-left transition-colors active:scale-[0.99]"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[12px] text-muted-foreground">{label}</div>
        <div
          className={cn(
            'text-[15px] font-medium',
            placeholder && !value.replace(/Add .+/, '').trim() === false && 'text-muted-foreground'
          )}
        >
          {value}
        </div>
      </div>
    </button>
  )
}
