// Senlie Budget — financial engine
// Pure functions for deriving balances, budget status, insights from the ledger.
//
// NOTE: This module is SERVER-ONLY because it uses the authenticated Supabase
// server data adapter. Client components should import pure helpers from
// `@/lib/finance-utils` instead.

import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'
import {
  TODAY,
  startOfMonth,
  endOfMonth,
  monthName,
  monthShort,
  lucideIcon,
} from '@/lib/finance-utils'
import type {
  BudgetCategoryRow,
  BudgetSummary,
  HomeSummary,
  ActivityGroup,
  InsightCard,
  InsightsSummary,
  RecurringItem,
  GoalRow,
  Transaction,
} from '@/lib/types'

// Re-export the pure helpers so existing server-side callers
// (e.g. API routes) can keep importing them from `@/lib/finance`.
export {
  TODAY,
  startOfMonth,
  endOfMonth,
  monthName,
  monthShort,
  lucideIcon,
}

// ----------------------------------------------------------------
// HOME
// ----------------------------------------------------------------
export async function getHomeSummary(): Promise<HomeSummary> {
  const user = await db.user.findFirst({
    where: { email: await getCurrentUserEmail() },
  })
  if (!user) throw new Error('No Senlie profile found.')

  const month = TODAY.getMonth() + 1
  const year = TODAY.getFullYear()
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = endOfMonth(TODAY)

  const budget = await db.budget.findFirst({
    where: { userId: user.id, month, year },
    include: {
      budgetCategories: { include: { category: true } },
    },
  })

  if (!budget) throw new Error('No budget for current month.')

  // All transactions this month for this user
  const txThisMonth = await db.transaction.findMany({
    where: {
      userId: user.id,
      date: { gte: monthStart, lte: monthEnd },
      type: { in: ['expense', 'income'] },
    },
    include: { category: true, account: true },
    orderBy: { date: 'desc' },
  })

  const expenses = txThisMonth.filter((t) => t.type === 'expense' && !t.excludeFromBudget)
  const incomeTx = txThisMonth.filter((t) => t.type === 'income')

  const spent = expenses.reduce((s, t) => s + t.amount, 0)
  const income = incomeTx.reduce((s, t) => s + t.amount, 0)

  // Allocated (committed) = sum of budget category allocations
  const committed = budget.budgetCategories.reduce(
    (s, b) => s + b.allocatedAmount + b.rolloverAmount,
    0
  )
  const budgetTotal = committed
  const budgetRemaining = budgetTotal - spent
  // "Available to spend" = expected monthly income - spent so far.
  // Uses income target (full month) so the number stays useful mid-month
  // even before all paychecks have arrived.
  const available = Math.max(0, budget.incomeTarget - spent)
  const actualSaved = Math.max(0, income - spent)

  // Bills due = sum of upcoming recurring expenses (next 14 days, not yet posted)
  const recurringUpcoming = await db.recurringRule.findMany({
    where: {
      userId: user.id,
      transactionType: 'expense',
      isActive: true,
      nextDate: { gte: TODAY, lte: new Date(TODAY.getTime() + 14 * 24 * 60 * 60 * 1000) },
    },
    include: { category: true, account: true },
  })
  const billsDue = recurringUpcoming.reduce((s, r) => s + r.amount, 0)

  // Recent transactions (top 6)
  const recent = await db.transaction.findMany({
    where: { userId: user.id },
    include: { category: true, account: true },
    orderBy: { date: 'desc' },
    take: 6,
  })

  const recentTransactions: Transaction[] = recent.map((t) => ({
    id: t.id,
    type: t.type as Transaction['type'],
    amount: t.amount,
    currency: t.currency,
    merchantName: t.merchantName,
    description: t.description,
    notes: t.notes,
    date: t.date.toISOString(),
    categoryId: t.categoryId,
    accountId: t.accountId,
    accountName: t.account.name,
    accountColor: t.account.color,
    accountIcon: t.account.icon,
    category: t.category
      ? {
          id: t.category.id,
          name: t.category.name,
          icon: t.category.icon,
          color: t.category.color,
          type: t.category.type as 'expense' | 'income' | 'transfer',
          parentId: t.category.parentId,
          sortOrder: t.category.sortOrder,
        }
      : undefined,
    paymentMethod: t.paymentMethod,
    recurringRuleId: t.recurringRuleId,
    transferGroupId: t.transferGroupId,
    excludeFromBudget: t.excludeFromBudget,
    status: t.status,
  }))

  // Budget progress
  const budgetProgress = budgetTotal > 0 ? spent / budgetTotal : 0
  const budgetStatus: 'healthy' | 'warning' | 'exceeded' =
    budgetProgress > 1 ? 'exceeded' : budgetProgress > 0.85 ? 'warning' : 'healthy'

  // Month progress (day of month / days in month)
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthProgress = TODAY.getDate() / daysInMonth

  // ----------------- Smart modules -----------------
  // 1) Upcoming bills (next 7 days)
  const upcoming = (await db.recurringRule.findMany({
    where: {
      userId: user.id,
      transactionType: 'expense',
      isActive: true,
      nextDate: { gte: TODAY, lte: new Date(TODAY.getTime() + 7 * 24 * 60 * 60 * 1000) },
    },
    include: { category: true, account: true },
    orderBy: { nextDate: 'asc' },
  })).slice(0, 3).map((r) => {
    const diffDays = Math.ceil((r.nextDate.getTime() - TODAY.getTime()) / (24 * 60 * 60 * 1000))
    return {
      name: r.merchantName || r.description || 'Recurring',
      amount: r.amount,
      dueIn: diffDays === 0 ? 'Today' : diffDays === 1 ? 'Due tomorrow' : `In ${diffDays} days`,
      date: r.nextDate.toISOString(),
    }
  })

  // 2) Spending pace — compare spending so far this month vs same day last month
  const lastMonthDate = new Date(year, month - 2, 1)
  const lastMonthStart = startOfMonth(lastMonthDate)
  const lastMonthSameDay = new Date(year, month - 2, TODAY.getDate(), 23, 59, 59)
  const lastMonthTx = await db.transaction.findMany({
    where: {
      userId: user.id,
      type: 'expense',
      date: { gte: lastMonthStart, lte: lastMonthSameDay },
    },
  })
  const lastMonthSpentSameDay = lastMonthTx.reduce((s, t) => s + t.amount, 0)
  const paceDelta = lastMonthSpentSameDay > 0
    ? Math.round(((spent - lastMonthSpentSameDay) / lastMonthSpentSameDay) * 100)
    : 0
  const spendingPace = {
    direction: (paceDelta < 0 ? 'down' : 'up') as 'up' | 'down',
    percent: Math.abs(paceDelta),
    message:
      paceDelta < 0
        ? `You're spending ${Math.abs(paceDelta)}% slower than last month.`
        : paceDelta > 0
          ? `You're spending ${paceDelta}% faster than last month.`
          : `Your spending pace matches last month.`,
  }

  // 3) Budget warning — category closest to limit with > 75% used and significant remaining
  let budgetWarning: HomeSummary['smartModules']['budgetWarning'] = null
  const daysLeft = daysInMonth - TODAY.getDate()
  for (const bc of budget.budgetCategories) {
    const catExpenses = expenses.filter((t) => t.categoryId === bc.categoryId)
    const catSpent = catExpenses.reduce((s, t) => s + t.amount, 0)
    const limit = bc.allocatedAmount + bc.rolloverAmount
    if (limit <= 0) continue
    const ratio = catSpent / limit
    if (ratio >= 0.75 && ratio < 1 && catSpent > 1000) {
      const remaining = limit - catSpent
      if (!budgetWarning || remaining < budgetWarning.amount) {
        budgetWarning = {
          category: bc.category.name,
          amount: remaining,
          daysLeft,
        }
      }
    }
  }

  // 4) Positive insight — biggest drop vs last month
  let positiveInsight: HomeSummary['smartModules']['positiveInsight'] = null
  const lastMonthAllTx = await db.transaction.findMany({
    where: {
      userId: user.id,
      type: 'expense',
      date: { gte: lastMonthStart, lte: endOfMonth(lastMonthDate) },
    },
    include: { category: true },
  })
  const byCatThisMonth: Record<string, { name: string; total: number }> = {}
  const byCatLastMonth: Record<string, { name: string; total: number }> = {}
  for (const t of expenses) {
    if (!t.categoryId) continue
    byCatThisMonth[t.categoryId] ??= { name: t.category?.name ?? 'Other', total: 0 }
    byCatThisMonth[t.categoryId].total += t.amount
  }
  for (const t of lastMonthAllTx) {
    if (!t.categoryId) continue
    byCatLastMonth[t.categoryId] ??= { name: t.category?.name ?? 'Other', total: 0 }
    byCatLastMonth[t.categoryId].total += t.amount
  }
  let biggestDrop = { category: '', amount: 0 }
  for (const [catId, info] of Object.entries(byCatThisMonth)) {
    const last = byCatLastMonth[catId]?.total ?? 0
    const drop = last - info.total
    if (drop > biggestDrop.amount && last > 0) {
      biggestDrop = { category: info.name, amount: drop }
    }
  }
  if (biggestDrop.amount > 500) {
    positiveInsight = {
      category: biggestDrop.category,
      amount: biggestDrop.amount,
      message: `You spent ${Math.round(biggestDrop.amount).toLocaleString()} less on ${biggestDrop.category} this month.`,
    }
  }

  // ----------------- Safe to spend -----------------
  // Available cash (sum of liquid accounts) - unpaid bills - savings goal target / days remaining
  const liquidAccounts = await db.account.findMany({
    where: { userId: user.id, type: { in: ['checking', 'cash', 'wallet'] }, isArchived: false },
  })
  const liquidTotal = liquidAccounts.reduce((s, a) => s + a.currentBalance, 0)
  const savingsGoalMonthly = 6500 // from spec
  const flexibleAvailable = Math.max(0, liquidTotal - billsDue - savingsGoalMonthly)
  const safeToSpend = {
    perDay: daysLeft > 0 ? Math.round(flexibleAvailable / daysLeft) : 0,
    total: Math.round(flexibleAvailable),
    daysLeft,
  }

  // ----------------- Pay schedule -----------------
  const schedule = user.paySchedule as 'monthly' | 'biweekly' | 'weekly' | 'custom'
  let nextPayDate = new Date(TODAY)
  let nextPayAmount = budget.incomeTarget

  if (schedule === 'custom') {
    const nextIncome = await db.recurringRule.findFirst({
      where: { userId: user.id, transactionType: 'income', isActive: true, nextDate: { gte: TODAY } },
      orderBy: { nextDate: 'asc' },
    })
    if (nextIncome) {
      nextPayDate = nextIncome.nextDate
      nextPayAmount = nextIncome.amount
    } else {
      nextPayDate.setMonth(nextPayDate.getMonth() + 1)
    }
  } else if (schedule === 'weekly') {
    nextPayDate.setDate(nextPayDate.getDate() + 7)
    nextPayAmount = budget.incomeTarget / 4
  } else if (schedule === 'biweekly') {
    nextPayDate.setDate(nextPayDate.getDate() + 14)
    nextPayAmount = budget.incomeTarget / 2
  } else {
    nextPayDate.setMonth(nextPayDate.getMonth() + 1)
  }

  const paySchedule = {
    nextPayDate: nextPayDate.toISOString(),
    nextPayAmount: Math.round(nextPayAmount * 100) / 100,
    schedule,
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      avatarColor: user.avatarColor,
      currencySymbol: user.currencySymbol,
      currencyCode: user.currencyCode,
      hideBalances: user.hideBalances,
      monthStartDay: user.monthStartDay,
    },
    available,
    committed,
    income,
    incomeTarget: budget.incomeTarget,
    spent,
    saved: actualSaved,
    billsDue,
    monthProgress,
    budgetStatus,
    budgetRemaining,
    budgetSpent: spent,
    budgetTotal,
    recentTransactions,
    snapshots: {
      income,
      spent,
      saved: actualSaved,
      billsDue,
    },
    smartModules: {
      upcoming,
      spendingPace,
      budgetWarning,
      positiveInsight,
    },
    safeToSpend,
    paySchedule,
  }
}

// ----------------------------------------------------------------
// BUDGET
// ----------------------------------------------------------------
export async function getBudgetSummary(): Promise<BudgetSummary> {
  const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
  if (!user) throw new Error('No user.')

  const month = TODAY.getMonth() + 1
  const year = TODAY.getFullYear()
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = endOfMonth(TODAY)

  const budget = await db.budget.findFirst({
    where: { userId: user.id, month, year },
    include: { budgetCategories: { include: { category: true } } },
  })
  if (!budget) throw new Error('No budget.')

  const tx = await db.transaction.findMany({
    where: {
      userId: user.id,
      date: { gte: monthStart, lte: monthEnd },
      type: 'expense',
      excludeFromBudget: false,
    },
  })

  const spentByCat: Record<string, number> = {}
  for (const t of tx) {
    if (!t.categoryId) continue
    spentByCat[t.categoryId] = (spentByCat[t.categoryId] ?? 0) + t.amount
  }

  const totalSpent = tx.reduce((s, t) => s + t.amount, 0)
  const totalAllocated = budget.budgetCategories.reduce(
    (s, b) => s + b.allocatedAmount + b.rolloverAmount,
    0
  )
  const income = budget.incomeTarget
  const remaining = totalAllocated - totalSpent

  const categories: BudgetCategoryRow[] = budget.budgetCategories
    .map((bc) => {
      const limit = bc.allocatedAmount + bc.rolloverAmount
      const spent = spentByCat[bc.categoryId] ?? 0
      const rem = limit - spent
      const progress = limit > 0 ? spent / limit : 0
      const status: 'healthy' | 'warning' | 'exceeded' =
        progress > 1 ? 'exceeded' : progress > 0.85 ? 'warning' : 'healthy'
      return {
        id: bc.id,
        categoryId: bc.categoryId,
        name: bc.category.name,
        icon: bc.category.icon,
        color: bc.category.color,
        allocated: bc.allocatedAmount,
        rollover: bc.rolloverAmount,
        rolloverType: bc.rolloverType as 'monthly' | 'rollover' | 'flexible' | 'fixed',
        spent,
        remaining: rem,
        progress,
        status,
      }
    })
    .sort((a, b) => b.spent - a.spent)

  const progress = totalAllocated > 0 ? totalSpent / totalAllocated : 0
  const status: 'healthy' | 'warning' | 'exceeded' =
    progress > 1 ? 'exceeded' : progress > 0.85 ? 'warning' : 'healthy'

  return {
    id: budget.id,
    month: budget.month,
    year: budget.year,
    incomeTarget: income,
    income,
    spent: totalSpent,
    remaining,
    committed: totalAllocated,
    available: income - totalSpent,
    progress,
    status,
    rolloverEnabled: budget.rolloverEnabled,
    categories,
  }
}

// ----------------------------------------------------------------
// ACTIVITY
// ----------------------------------------------------------------
export async function getActivity(
  filter: 'all' | 'expense' | 'income' | 'transfer' = 'all',
  search?: string
): Promise<ActivityGroup[]> {
  const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
  if (!user) throw new Error('No user.')

  const where: any = { userId: user.id }
  if (filter !== 'all') where.type = filter
  if (search) {
    where.OR = [
      { merchantName: { contains: search } },
      { description: { contains: search } },
      { notes: { contains: search } },
    ]
  }

  const tx = await db.transaction.findMany({
    where,
    include: { category: true, account: true },
    orderBy: { date: 'desc' },
    take: 200,
  })

  // Group by day
  const groups: Record<string, Transaction[]> = {}
  for (const t of tx) {
    const d = new Date(t.date)
    const key = d.toISOString().slice(0, 10)
    groups[key] ??= []
    groups[key].push({
      id: t.id,
      type: t.type as Transaction['type'],
      amount: t.amount,
      currency: t.currency,
      merchantName: t.merchantName,
      description: t.description,
      notes: t.notes,
      date: t.date.toISOString(),
      categoryId: t.categoryId,
      accountId: t.accountId,
      accountName: t.account.name,
      accountColor: t.account.color,
      accountIcon: t.account.icon,
      category: t.category
        ? {
            id: t.category.id,
            name: t.category.name,
            icon: t.category.icon,
            color: t.category.color,
            type: t.category.type as 'expense' | 'income' | 'transfer',
            parentId: t.category.parentId,
            sortOrder: t.category.sortOrder,
          }
        : undefined,
      paymentMethod: t.paymentMethod,
      recurringRuleId: t.recurringRuleId,
      transferGroupId: t.transferGroupId,
      excludeFromBudget: t.excludeFromBudget,
      status: t.status,
    })
  }

  return Object.entries(groups)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([key, items]) => {
      const d = new Date(key)
      const today = new Date(TODAY)
      today.setHours(0, 0, 0, 0)
      const yesterday = new Date(today.getTime() - 86400000)
      const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())
      let label: string
      if (dOnly.getTime() === today.getTime()) label = 'Today'
      else if (dOnly.getTime() === yesterday.getTime()) label = 'Yesterday'
      else
        label = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      const total = items
        .filter((t) => t.type !== 'transfer')
        .reduce((s, t) => s + (t.type === 'expense' ? -t.amount : t.amount), 0)
      return { label, date: key, total, transactions: items }
    })
}

// ----------------------------------------------------------------
// INSIGHTS
// ----------------------------------------------------------------
export async function getInsights(): Promise<InsightsSummary> {
  const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
  if (!user) throw new Error('No user.')

  const month = TODAY.getMonth() + 1
  const year = TODAY.getFullYear()
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = endOfMonth(TODAY)

  const lastMonthDate = new Date(year, month - 2, 1)
  const lastMonthStart = startOfMonth(lastMonthDate)
  const lastMonthEnd = endOfMonth(lastMonthDate)

  const [thisMonthTx, lastMonthTx] = await Promise.all([
    db.transaction.findMany({
      where: { userId: user.id, date: { gte: monthStart, lte: monthEnd }, type: 'expense' },
      include: { category: true },
    }),
    db.transaction.findMany({
      where: { userId: user.id, date: { gte: lastMonthStart, lte: lastMonthEnd }, type: 'expense' },
      include: { category: true },
    }),
  ])

  const totalSpent = thisMonthTx.reduce((s, t) => s + t.amount, 0)
  const lastMonthSpent = lastMonthTx.reduce((s, t) => s + t.amount, 0)
  const heroDelta = lastMonthSpent > 0
    ? Math.round(((totalSpent - lastMonthSpent) / lastMonthSpent) * 100)
    : 0
  const heroAmount = Math.abs(totalSpent - lastMonthSpent)

  // Category breakdown
  const byCat: Record<string, { name: string; icon: string; color: string; amount: number }> = {}
  for (const t of thisMonthTx) {
    const c = t.category
    if (!c) continue
    byCat[c.id] ??= { name: c.name, icon: c.icon, color: c.color, amount: 0 }
    byCat[c.id].amount += t.amount
  }
  const categoryBreakdown = Object.entries(byCat)
    .map(([categoryId, v]) => ({
      categoryId,
      name: v.name,
      icon: v.icon,
      color: v.color,
      amount: v.amount,
      percent: totalSpent > 0 ? v.amount / totalSpent : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  // Timeline (cumulative spend per day, 1..daysInMonth)
  const daysInMonth = new Date(year, month, 0).getDate()
  const lastDaysInMonth = new Date(year, month - 1, 0).getDate()
  const thisByDay: Record<number, number> = {}
  const lastByDay: Record<number, number> = {}
  for (const t of thisMonthTx) {
    const day = new Date(t.date).getDate()
    thisByDay[day] = (thisByDay[day] ?? 0) + t.amount
  }
  for (const t of lastMonthTx) {
    const day = new Date(t.date).getDate()
    lastByDay[day] = (lastByDay[day] ?? 0) + t.amount
  }
  const timeline: { day: number; thisMonth: number; lastMonth: number }[] = []
  let thisCum = 0
  let lastCum = 0
  const maxDay = Math.max(daysInMonth, lastDaysInMonth)
  for (let d = 1; d <= maxDay; d++) {
    thisCum += thisByDay[d] ?? 0
    lastCum += lastByDay[d] ?? 0
    timeline.push({
      day: d,
      thisMonth: d <= daysInMonth ? thisCum : thisCum,
      lastMonth: d <= lastDaysInMonth ? lastCum : lastCum,
    })
  }

  // Insight cards
  const insightCards: InsightCard[] = []

  // 1) Biggest category increase vs 3-month average (simplified: vs last month)
  const lastByCat: Record<string, number> = {}
  for (const t of lastMonthTx) {
    if (!t.categoryId) continue
    lastByCat[t.categoryId] = (lastByCat[t.categoryId] ?? 0) + t.amount
  }
  let biggestIncrease = { name: '', delta: 0 }
  for (const [catId, info] of Object.entries(byCat)) {
    const last = lastByCat[catId] ?? 0
    const delta = info.amount - last
    if (delta > biggestIncrease.delta && last > 0) {
      biggestIncrease = { name: info.name, delta }
    }
  }
  if (biggestIncrease.delta > 500) {
    insightCards.push({
      id: 'cat-increase',
      type: 'warning',
      title: `${biggestIncrease.name} increased`,
      message: `You've spent ${Math.round(biggestIncrease.delta).toLocaleString()} more than last month.`,
      detail: `${biggestIncrease.name}: ${Math.round(lastByCat[Object.keys(byCat).find(k => byCat[k].name === biggestIncrease.name)!] ?? 0).toLocaleString()} last month → ${Math.round(byCat[Object.keys(byCat).find(k => byCat[k].name === biggestIncrease.name)!]?.amount ?? 0).toLocaleString()} this month`,
    })
  }

  // 2) Weekend spending
  const weekendSpent = thisMonthTx
    .filter((t) => {
      const day = new Date(t.date).getDay()
      return day === 6 // Saturday
    })
    .reduce((s, t) => s + t.amount, 0)
  const discretionaryCats = new Set(['Eating Out', 'Entertainment', 'Shopping'])
  const discretionaryTotal = thisMonthTx
    .filter((t) => t.category && discretionaryCats.has(t.category.name))
    .reduce((s, t) => s + t.amount, 0)
  if (discretionaryTotal > 0) {
    const pct = Math.round((weekendSpent / discretionaryTotal) * 100)
    if (pct > 20) {
      insightCards.push({
        id: 'weekend',
        type: 'info',
        title: 'Your weekends cost more',
        message: `${pct}% of this month's discretionary spending happened on Saturdays.`,
      })
    }
  }

  // 3) Budget may exceed (dining close to limit)
  const budget = await db.budget.findFirst({
    where: { userId: user.id, month, year },
    include: { budgetCategories: { include: { category: true } } },
  })
  if (budget) {
    const daysLeft = daysInMonth - TODAY.getDate()
    for (const bc of budget.budgetCategories) {
      const catSpent = thisMonthTx
        .filter((t) => t.categoryId === bc.categoryId)
        .reduce((s, t) => s + t.amount, 0)
      const limit = bc.allocatedAmount + bc.rolloverAmount
      if (limit <= 0 || catSpent < limit * 0.5) continue
      const dailyRate = catSpent / TODAY.getDate()
      const projected = catSpent + dailyRate * daysLeft
      if (projected > limit && catSpent < limit) {
        insightCards.push({
          id: `exceed-${bc.categoryId}`,
          type: 'warning',
          title: `You may exceed ${bc.category.name}`,
          message: `At your current pace you'll reach approximately ${Math.round(projected).toLocaleString()} against your ${Math.round(limit).toLocaleString()} budget.`,
        })
        break // only show one
      }
    }

    // 3b) Categories ALREADY over budget — detailed explanation
    const overBudgetCategories = budget.budgetCategories
      .map((bc) => {
        const catSpent = thisMonthTx
          .filter((t) => t.categoryId === bc.categoryId)
          .reduce((s, t) => s + t.amount, 0)
        const limit = bc.allocatedAmount + bc.rolloverAmount
        const over = catSpent - limit
        return { bc, catSpent, limit, over }
      })
      .filter((c) => c.over > 0)
      .sort((a, b) => b.over - a.over)

    for (const { bc, catSpent, limit, over } of overBudgetCategories) {
      const pctOver = Math.round((over / limit) * 100)
      const avgDailyLastMonth = lastMonthTx
        .filter((t) => t.categoryId === bc.categoryId)
        .reduce((s, t) => s + t.amount, 0) / daysInMonth
      const thisDailyRate = catSpent / TODAY.getDate()

      // Build a smart explanation
      const reasons: string[] = []
      if (thisDailyRate > avgDailyLastMonth * 1.3) {
        reasons.push(
          `Your daily spend on ${bc.category.name} is ${Math.round(
            (thisDailyRate / avgDailyLastMonth - 1) * 100
          )}% higher than last month.`
        )
      }
      // Check if there was a single large transaction
      const catTx = thisMonthTx
        .filter((t) => t.categoryId === bc.categoryId)
        .sort((a, b) => b.amount - a.amount)
      if (catTx[0] && catTx[0].amount > limit * 0.3) {
        reasons.push(
          `A single ${catTx[0].merchantName ?? 'transaction'} of ${Math.round(catTx[0].amount).toLocaleString()} drove a large portion.`
        )
      }
      if (catTx.length > 8) {
        reasons.push(`You've made ${catTx.length} transactions — frequent small purchases add up.`)
      }

      const advice: string[] = []
      if (pctOver > 50) {
        advice.push('Consider raising the budget or cutting back significantly for the rest of the month.')
      } else if (pctOver > 25) {
        advice.push(`Pause ${bc.category.name} spending for ${Math.ceil(over / thisDailyRate)} days to recover.`)
      } else {
        advice.push('A small reduction in daily spending can bring this back on track.')
      }
      if (bc.rolloverType !== 'rollover') {
        advice.push(`Switch ${bc.category.name} to rollover to absorb future overspends.`)
      }

      insightCards.push({
        id: `over-${bc.categoryId}`,
        type: 'warning',
        title: `${bc.category.name} is ${Math.round(over).toLocaleString()} over budget`,
        message: `You spent ${Math.round(catSpent).toLocaleString()} against a ${Math.round(limit).toLocaleString()} limit — ${pctOver}% over.`,
        detail: [
          reasons.length > 0 ? `Why: ${reasons.join(' ')}` : '',
          `What to do: ${advice.join(' ')}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      })
    }
  }

  // 4) Recurring detected
  const recurringCount = await db.recurringRule.count({
    where: { userId: user.id, isActive: true },
  })
  if (recurringCount >= 3) {
    insightCards.push({
      id: 'recurring-detected',
      type: 'recurring',
      title: 'New recurring expense',
      message: `We detected ${recurringCount} monthly recurring payments.`,
      detail: 'Recurring expenses are tracked automatically.',
    })
  }

  // 5) Positive — biggest drop
  let biggestDrop = { name: '', delta: 0 }
  for (const [catId, info] of Object.entries(byCat)) {
    const last = lastByCat[catId] ?? 0
    const delta = last - info.amount
    if (delta > biggestDrop.delta && last > 0) {
      biggestDrop = { name: info.name, delta }
    }
  }
  if (biggestDrop.delta > 500) {
    insightCards.push({
      id: 'cat-decrease',
      type: 'positive',
      title: `${biggestDrop.name} decreased`,
      message: `You spent ${Math.round(biggestDrop.delta).toLocaleString()} less on ${biggestDrop.name} this month.`,
    })
  }

  return {
    month,
    year,
    heroDelta,
    heroDirection: heroDelta < 0 ? 'down' : 'up',
    heroAmount,
    totalSpent,
    lastMonthSpent,
    categoryBreakdown,
    timeline,
    insightCards,
  }
}

// ----------------------------------------------------------------
// RECURRING
// ----------------------------------------------------------------
export async function getRecurring(): Promise<RecurringItem[]> {
  const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
  if (!user) throw new Error('No user.')

  const rules = await db.recurringRule.findMany({
    where: { userId: user.id, isActive: true },
    include: { category: true, account: true },
    orderBy: { nextDate: 'asc' },
  })

  return rules.map((r) => ({
    id: r.id,
    name: r.merchantName || r.description || 'Recurring',
    amount: r.amount,
    nextDate: r.nextDate.toISOString(),
    frequency: r.frequency,
    category: r.category
      ? { name: r.category.name, icon: r.category.icon, color: r.category.color }
      : undefined,
    account: r.account
      ? { name: r.account.name, color: r.account.color }
      : undefined,
    isActive: r.isActive,
  }))
}

// ----------------------------------------------------------------
// GOALS
// ----------------------------------------------------------------
export async function getGoals(): Promise<GoalRow[]> {
  const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
  if (!user) throw new Error('No user.')

  const goals = await db.goal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
  })

  return goals.map((g) => {
    const progress = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0
    // Projected completion — assume 6500/month savings rate
    const monthlyRate = 6500
    const remaining = g.targetAmount - g.currentAmount
    const monthsLeft = remaining > 0 ? Math.ceil(remaining / monthlyRate) : 0
    const projected = g.targetDate
      ? new Date(g.targetDate)
      : monthsLeft > 0
        ? new Date(TODAY.getFullYear(), TODAY.getMonth() + monthsLeft, TODAY.getDate())
        : null
    return {
      id: g.id,
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      targetDate: g.targetDate?.toISOString() ?? null,
      color: g.color,
      icon: g.icon,
      progress,
      projectedDate: projected?.toISOString() ?? null,
    }
  })
}

// ----------------------------------------------------------------
// ACCOUNTS + CATEGORIES (for pickers)
// ----------------------------------------------------------------
export async function getAccounts() {
  const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
  if (!user) throw new Error('No user.')
  const accounts = await db.account.findMany({
    where: { userId: user.id, isArchived: false },
    orderBy: { createdAt: 'asc' },
  })
  return accounts
}

export async function getCategories(type?: 'expense' | 'income' | 'transfer') {
  const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
  if (!user) throw new Error('No user.')
  const categories = await db.category.findMany({
    where: { userId: user.id, ...(type ? { type } : {}) },
    orderBy: { sortOrder: 'asc' },
  })
  return categories
}
