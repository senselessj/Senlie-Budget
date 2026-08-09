'use client'

import * as React from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer'
import { motion } from 'framer-motion'
import { Trash2, Pencil, Ban, Copy, ChevronRight, RefreshCw } from 'lucide-react'
import { useSenlieUI } from '@/lib/store'
import { useHomeSummary, useHaptic } from '@/hooks/use-senlie-data'
import { CategoryIcon } from '@/components/senlie/category-icon'
import { formatMoney } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useT, useLanguage } from '@/hooks/use-t'

export function TransactionDetailSheet() {
  const id = useSenlieUI((s) => s.selectedTransactionId)
  const setId = useSenlieUI((s) => s.setSelectedTransactionId)
  const bumpData = useSenlieUI((s) => s.bumpData)
  const setEditingTransactionId = useSenlieUI((s) => s.setEditingTransactionId)
  const haptic = useHaptic()
  const t = useT()
  const { locale } = useLanguage()
  const { data: home } = useHomeSummary()
  const symbol = home?.user.currencySymbol ?? 'RD$'

  // Find the transaction in the home summary's recent list.
  // For transactions not in the recent list, we fall back to a fetch.
  const [tx, setTx] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!id) {
      setTx(null)
      return
    }
    // First check the home recent transactions
    const fromHome = home?.recentTransactions?.find((t) => t.id === id)
    if (fromHome) {
      setTx(fromHome)
      return
    }
    // Otherwise, fetch from activity endpoint (search all)
    setLoading(true)
    fetch('/api/budget/activity?filter=all')
      .then((r) => r.json())
      .then((groups: any[]) => {
        for (const g of groups) {
          const found = g.transactions.find((t: any) => t.id === id)
          if (found) {
            setTx(found)
            return
          }
        }
        setTx(null)
      })
      .finally(() => setLoading(false))
  }, [id, home])

  const handleDelete = async () => {
    if (!tx) return
    haptic('warning')
    try {
      const res = await fetch(`/api/budget/transactions?id=${tx.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('detail.deleted'))
      haptic('success')
      bumpData()
      setId(null)
    } catch {
      toast.error(t('detail.couldntDelete'), {
        description: t('detail.tryAgain'),
      })
    }
  }

  const handleDuplicate = async () => {
    if (!tx) return
    haptic('medium')
    try {
      const res = await fetch(`/api/budget/transactions?action=duplicate&id=${tx.id}`, {
        method: 'PUT',
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(t('detail.duplicated'), {
        description: t('detail.duplicatedDesc'),
      })
      haptic('success')
      bumpData()
      setId(null)
    } catch {
      toast.error(t('detail.couldntDuplicate'))
    }
  }

  const handleExclude = async () => {
    if (!tx) return
    haptic('medium')
    try {
      const res = await fetch(`/api/budget/transactions?id=${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludeFromBudget: !tx.excludeFromBudget }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(
        tx.excludeFromBudget
          ? t('detail.included')
          : t('detail.excluded'),
      )
      haptic('success')
      bumpData()
      // Update local state so the UI reflects the change
      setTx({ ...tx, excludeFromBudget: !tx.excludeFromBudget })
    } catch {
      toast.error(t('detail.couldntUpdate'))
    }
  }

  const handleEdit = () => {
    if (!tx) return
    haptic('light')
    // Keep the detail sheet in navigation history underneath the editor.
    // Android Back / iOS back gesture closes Edit first and reveals Detail.
    setEditingTransactionId(tx.id)
  }

  const isExpense = tx?.type === 'expense'
  const isIncome = tx?.type === 'income'
  const isTransfer = tx?.type === 'transfer'
  const amountColor = isIncome
    ? 'var(--positive)'
    : isTransfer
      ? 'var(--muted-foreground)'
      : 'var(--foreground)'

  return (
    <Drawer open={!!id} onOpenChange={(o) => !o && setId(null)}>
      <DrawerContent className="senlie-sheet">
        <DrawerHeader className="pb-0">
          <DrawerTitle className="sr-only">{t('detail.titleSr')}</DrawerTitle>
          <DrawerDescription className="sr-only">{t('detail.descSr')}</DrawerDescription>
        </DrawerHeader>
        <div className="senlie-sheet-scroll px-5 pb-[max(env(safe-area-inset-bottom),24px)] pt-2">
          {/* Hero */}
          <div className="flex flex-col items-center py-6">
            {tx?.category ? (
              <CategoryIcon
                name={tx.category.icon}
                color={tx.category.color}
                size={64}
                iconSize={32}
                rounded="rounded-[20px]"
              />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-muted text-muted-foreground"
              >
                <RefreshCw size={28} />
              </div>
            )}
            <div className="mt-3 text-[15px] font-medium text-muted-foreground">
              {tx?.merchantName || tx?.description || (isTransfer ? t('detail.transfer') : t('detail.transaction'))}
            </div>
            <motion.div
              key={tx?.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="mt-1 text-[34px] font-semibold tracking-tight tnum"
              style={{ color: amountColor }}
            >
              {tx
                ? `${isExpense ? '-' : isIncome ? '+' : ''}${formatMoney(tx.amount, {
                    symbol,
                    decimalPlaces: tx.amount % 1 === 0 ? 0 : 2,
                  })}`
                : '—'}
            </motion.div>
            {tx?.date && (
              <div className="mt-1 text-[13px] text-muted-foreground">
                {new Date(tx.date).toLocaleDateString(locale, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                ·{' '}
                {new Date(tx.date).toLocaleTimeString(locale, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </div>
            )}
          </div>

          {/* Details list */}
          {tx && (
            <div className="space-y-1 rounded-[18px] bg-card p-2">
              {tx.category && (
                <DetailRow label={t('detail.category')} value={tx.category.name} />
              )}
              {tx.accountName && (
                <DetailRow label={t('detail.account')} value={tx.accountName} />
              )}
              {tx.category && (
                <DetailRow label={t('detail.budget')} value={tx.category.name} />
              )}
              {tx.paymentMethod && (
                <DetailRow
                  label={t('detail.paymentMethod')}
                  value={tx.paymentMethod.charAt(0).toUpperCase() + tx.paymentMethod.slice(1)}
                />
              )}
              {tx.description && tx.merchantName && (
                <DetailRow label={t('detail.note')} value={tx.description} />
              )}
              {tx.recurringRuleId && (
                <DetailRow
                  label={t('detail.recurring')}
                  value={t('detail.repeatsMonthly')}
                  icon={<RefreshCw size={14} />}
                />
              )}
            </div>
          )}

          {/* Action grid */}
          {tx && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                { icon: Pencil, label: t('detail.edit'), action: handleEdit },
                { icon: Copy, label: t('detail.duplicate'), action: handleDuplicate },
                {
                  icon: Ban,
                  label: tx.excludeFromBudget ? t('detail.include') : t('detail.exclude'),
                  action: handleExclude,
                },
                { icon: Trash2, label: t('detail.delete'), action: handleDelete, danger: true },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => {
                    haptic('light')
                    a.action()
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-[14px] bg-card py-3 transition-colors active:scale-[0.97]',
                    a.danger && 'text-negative'
                  )}
                >
                  <a.icon size={20} strokeWidth={2} />
                  <span className="text-[10px] font-medium">{a.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Edit CTA */}
          {tx && (
            <button
              onClick={handleEdit}
              className="mt-3 h-12 w-full rounded-[14px] bg-foreground py-3 text-[15px] font-semibold text-background transition-transform active:scale-[0.98]"
            >
              {t('detail.editTransaction')}
            </button>
          )}

          {loading && (
            <div className="py-12 text-center text-[14px] text-muted-foreground">
              {t('detail.loading')}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between rounded-[12px] px-3 py-2.5">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="flex items-center gap-1 text-[15px] font-medium">
        {value}
        <ChevronRight size={16} className="text-muted-foreground/50" />
      </div>
    </div>
  )
}
