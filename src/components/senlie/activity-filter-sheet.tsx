'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAccountsAndCategories, useHaptic } from '@/hooks/use-senlie-data'
import { CategoryIcon } from '@/components/senlie/category-icon'
import { AccountIcon } from '@/components/senlie/category-icon'
import { useT } from '@/hooks/use-t'

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

export type ActivityFilterType = 'expense' | 'income' | 'transfer'

export interface ActivityFilterState {
  types: Record<ActivityFilterType, boolean>
  amountMin: string
  amountMax: string
  dateFrom: string
  dateTo: string
  accountId: string | null
  categoryId: string | null
  recurringOnly: boolean
}

export const EMPTY_FILTER: ActivityFilterState = {
  types: { expense: false, income: false, transfer: false },
  amountMin: '',
  amountMax: '',
  dateFrom: '',
  dateTo: '',
  accountId: null,
  categoryId: null,
  recurringOnly: false,
}

const TYPE_LABEL_KEYS: Record<ActivityFilterType, string> = {
  expense: 'activity.filterExpenses',
  income: 'activity.filterIncome',
  transfer: 'activity.filterTransfers',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActivityFilterSheet({
  open,
  onOpenChange,
  onApply,
  onReset,
  initialState,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onApply?: (state: ActivityFilterState) => void
  onReset?: () => void
  initialState?: {
    amountMin: string
    amountMax: string
    dateFrom: string
    dateTo: string
    accountId: string | null
    categoryId: string | null
    recurringOnly: boolean
  } | null
}) {
  const haptic = useHaptic()
  const t = useT()
  const [state, setState] = React.useState<ActivityFilterState>(() => {
    if (initialState) {
      return {
        types: { expense: false, income: false, transfer: false },
        ...initialState,
      }
    }
    return EMPTY_FILTER
  })
  const { data: pickers, isLoading: pickersLoading } = useAccountsAndCategories()

  // Sync state when sheet opens with initialState
  React.useEffect(() => {
    if (open && initialState) {
      setState({
        types: { expense: false, income: false, transfer: false },
        ...initialState,
      })
    }
  }, [open])

  function toggleType(t: ActivityFilterType) {
    haptic('light')
    setState((s) => ({ ...s, types: { ...s.types, [t]: !s.types[t] } }))
  }

  function selectAccount(id: string) {
    haptic('light')
    setState((s) => ({ ...s, accountId: s.accountId === id ? null : id }))
  }

  function selectCategory(id: string) {
    haptic('light')
    setState((s) => ({ ...s, categoryId: s.categoryId === id ? null : id }))
  }

  function handleReset() {
    haptic('light')
    setState(EMPTY_FILTER)
    onReset?.()
  }

  function handleApply() {
    haptic('success')
    onApply?.(state)
    onOpenChange(false)
  }

  const activeCount =
    (state.types.expense ? 1 : 0) +
    (state.types.income ? 1 : 0) +
    (state.types.transfer ? 1 : 0) +
    (state.amountMin ? 1 : 0) +
    (state.amountMax ? 1 : 0) +
    (state.dateFrom ? 1 : 0) +
    (state.dateTo ? 1 : 0) +
    (state.accountId ? 1 : 0) +
    (state.categoryId ? 1 : 0) +
    (state.recurringOnly ? 1 : 0)

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-h-[90vh] max-w-md rounded-t-[24px]">
        <DrawerHeader className="pb-0">
          <DrawerTitle className="sr-only">{t('filter.titleSr')}</DrawerTitle>
          <DrawerDescription className="sr-only">
            {t('filter.descSr')}
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-5 pb-8 pt-2">
          {/* Title row */}
          <div className="flex items-center justify-between pb-4 pt-1">
            <h2 className="text-[20px] font-semibold tracking-tight">{t('filter.title')}</h2>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('filter.reset')}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Transaction type */}
            <Section title={t('filter.transactionType')}>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(TYPE_LABEL_KEYS) as ActivityFilterType[]).map((tp) => {
                  const checked = state.types[tp]
                  return (
                    <button
                      key={tp}
                      type="button"
                      onClick={() => toggleType(tp)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-[12px] border py-2.5 text-[13px] font-medium transition-colors',
                        checked
                          ? 'border-foreground/0 bg-foreground text-background'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                      )}
                    >
                      <CheckSquare checked={checked} />
                      {t(TYPE_LABEL_KEYS[tp])}
                    </button>
                  )
                })}
              </div>
            </Section>

            {/* Amount range */}
            <Section title={t('filter.amountRange')}>
              <div className="grid grid-cols-2 gap-2">
                <PrefixInput
                  prefix="RD$"
                  placeholder={t('filter.min')}
                  inputMode="decimal"
                  value={state.amountMin}
                  onChange={(v) => setState((s) => ({ ...s, amountMin: v }))}
                />
                <PrefixInput
                  prefix="RD$"
                  placeholder={t('filter.max')}
                  inputMode="decimal"
                  value={state.amountMax}
                  onChange={(v) => setState((s) => ({ ...s, amountMax: v }))}
                />
              </div>
            </Section>

            {/* Date range */}
            <Section title={t('filter.dateRange')}>
              <div className="grid grid-cols-2 gap-2">
                <DateInput
                  label={t('filter.from')}
                  value={state.dateFrom}
                  onChange={(v) => setState((s) => ({ ...s, dateFrom: v }))}
                />
                <DateInput
                  label={t('filter.to')}
                  value={state.dateTo}
                  onChange={(v) => setState((s) => ({ ...s, dateTo: v }))}
                />
              </div>
            </Section>

            {/* Account */}
            <Section title={t('filter.account')}>
              {pickersLoading ? (
                <div className="flex gap-2 overflow-hidden">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
                  ))}
                </div>
              ) : pickers && pickers.accounts.length > 0 ? (
                <div className="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar">
                  {pickers.accounts.map((a) => {
                    const selected = state.accountId === a.id
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => selectAccount(a.id)}
                        className={cn(
                          'flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-[13px] font-medium transition-colors',
                          selected
                            ? 'border-foreground/0 bg-foreground text-background'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                        )}
                      >
                        <AccountIcon
                          name={a.icon}
                          color={a.color}
                          size={24}
                          iconSize={13}
                        />
                        <span className="truncate">{a.name}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">{t('filter.noAccounts')}</p>
              )}
            </Section>

            {/* Category */}
            <Section title={t('filter.category')}>
              {pickersLoading ? (
                <div className="flex gap-2 overflow-hidden">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
                  ))}
                </div>
              ) : pickers && pickers.categories.length > 0 ? (
                <div className="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar">
                  {pickers.categories.map((c) => {
                    const selected = state.categoryId === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCategory(c.id)}
                        className={cn(
                          'flex shrink-0 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-[13px] font-medium transition-colors',
                          selected
                            ? 'border-foreground/0 bg-foreground text-background'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                        )}
                      >
                        <CategoryIcon
                          name={c.icon}
                          color={c.color}
                          size={24}
                          iconSize={13}
                          rounded="rounded-full"
                        />
                        <span className="truncate">{c.name}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground">{t('filter.noCategories')}</p>
              )}
            </Section>

            {/* Recurring only */}
            <Section title={t('filter.recurringOnly')}>
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-muted-foreground">{t('filter.recurringOnlyDesc')}</span>
                <Switch
                  checked={state.recurringOnly}
                  onCheckedChange={(v) => {
                    haptic('light')
                    setState((s) => ({ ...s, recurringOnly: v }))
                  }}
                  style={
                    state.recurringOnly
                      ? { backgroundColor: 'var(--senlie)' }
                      : undefined
                  }
                />
              </div>
            </Section>
          </div>

          {/* Bottom action buttons */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 rounded-full bg-secondary py-3 text-[15px] font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80 active:bg-secondary/90"
            >
              {t('filter.reset')}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-[2] rounded-full py-3 text-[15px] font-semibold text-white shadow-card transition-transform active:scale-[0.98]"
              style={{ backgroundColor: 'var(--senlie)' }}
            >
              {t('filter.apply')}{activeCount > 0 ? ` · ${activeCount}` : ''}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-[16px] p-4 space-y-3 shadow-card">
      <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  )
}

function CheckSquare({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'flex h-4 w-4 items-center justify-center rounded-[5px] border transition-colors',
        checked
          ? 'border-transparent bg-background/20 text-background'
          : 'border-current/30 text-current'
      )}
    >
      {checked && <Check size={11} strokeWidth={3} />}
    </span>
  )
}

function PrefixInput({
  prefix,
  placeholder,
  value,
  onChange,
  inputMode,
}: {
  prefix: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  inputMode?: 'decimal' | 'numeric'
}) {
  return (
    <div className="flex h-11 items-center gap-1.5 rounded-[12px] border border-border bg-background px-3 transition-colors focus-within:border-ring/50 focus-within:ring-[3px] focus-within:ring-ring/30">
      <span className="text-[13px] font-medium text-muted-foreground">{prefix}</span>
      <Input
        type="text"
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full border-0 bg-transparent p-0 text-[14px] font-medium shadow-none focus-visible:ring-0 focus-visible:border-0"
      />
    </div>
  )
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex h-11 items-center gap-1.5 rounded-[12px] border border-border bg-background px-3 transition-colors focus-within:border-ring/50 focus-within:ring-[3px] focus-within:ring-ring/30">
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full border-0 bg-transparent p-0 text-[14px] font-medium shadow-none focus-visible:ring-0 focus-visible:border-0"
      />
    </div>
  )
}
