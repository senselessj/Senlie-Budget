// Senlie Budget — shared types
// These mirror the Supabase tables but are simpler for API responses

export type AccountType = 'cash' | 'checking' | 'savings' | 'credit' | 'wallet'
export type TransactionType = 'expense' | 'income' | 'transfer'
export type RolloverType = 'monthly' | 'rollover' | 'flexible' | 'fixed'
export type PaySchedule = 'monthly' | 'biweekly' | 'weekly' | 'custom'

export interface Account {
  id: string
  name: string
  type: AccountType
  currency: string
  currentBalance: number
  openingBalance: number
  institution: string | null
  color: string
  icon: string
  isArchived: boolean
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: 'expense' | 'income' | 'transfer'
  parentId: string | null
  sortOrder: number
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  currency: string
  merchantName: string | null
  description: string | null
  notes: string | null
  date: string // ISO
  categoryId: string | null
  accountId: string
  accountName?: string
  accountColor?: string
  accountIcon?: string
  category?: Category
  paymentMethod: string | null
  recurringRuleId: string | null
  transferGroupId: string | null
  excludeFromBudget: boolean
  status: string
}

export interface BudgetCategoryRow {
  id: string
  categoryId: string
  name: string
  icon: string
  color: string
  allocated: number
  rollover: number
  rolloverType: RolloverType
  spent: number
  remaining: number
  progress: number // 0-1
  status: 'healthy' | 'warning' | 'exceeded'
}

export interface BudgetSummary {
  id: string
  month: number
  year: number
  incomeTarget: number
  income: number
  spent: number
  remaining: number
  committed: number
  available: number
  progress: number
  status: 'healthy' | 'warning' | 'exceeded'
  rolloverEnabled: boolean
  categories: BudgetCategoryRow[]
}

export interface HomeSummary {
  user: {
    id: string
    name: string
    avatarColor: string
    avatarUrl?: string | null
    currencySymbol: string
    currencyCode: string
    hideBalances: boolean
    monthStartDay: number
  }
  available: number
  committed: number
  income: number
  incomeTarget: number
  spent: number
  saved: number
  billsDue: number
  monthProgress: number
  budgetStatus: 'healthy' | 'warning' | 'exceeded'
  budgetRemaining: number
  budgetSpent: number
  budgetTotal: number
  recentTransactions: Transaction[]
  snapshots: {
    income: number
    spent: number
    saved: number
    billsDue: number
  }
  smartModules: {
    upcoming: { name: string; amount: number; dueIn: string; date: string }[]
    spendingPace: { direction: 'up' | 'down'; percent: number; message: string }
    budgetWarning: { category: string; amount: number; daysLeft: number } | null
    positiveInsight: { category: string; amount: number; message: string } | null
  }
  safeToSpend: { perDay: number; total: number; daysLeft: number }
  paySchedule: {
    nextPayDate: string
    nextPayAmount: number
    schedule: PaySchedule
  }
}

export interface ActivityGroup {
  label: string
  date: string
  total: number
  transactions: Transaction[]
}

export interface InsightCard {
  id: string
  type: 'positive' | 'warning' | 'info' | 'recurring'
  title: string
  message: string
  detail?: string
}

export interface InsightsSummary {
  month: number
  year: number
  heroDelta: number // percent change vs last month
  heroDirection: 'up' | 'down'
  heroAmount: number
  totalSpent: number
  lastMonthSpent: number
  categoryBreakdown: {
    categoryId: string
    name: string
    icon: string
    color: string
    amount: number
    percent: number
  }[]
  timeline: {
    day: number
    thisMonth: number
    lastMonth: number
  }[]
  insightCards: InsightCard[]
}

export interface RecurringItem {
  id: string
  name: string
  amount: number
  nextDate: string
  frequency: string
  category?: { name: string; icon: string; color: string }
  account?: { name: string; color: string }
  isActive: boolean
}

export interface GoalRow {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  color: string
  icon: string
  progress: number
  projectedDate?: string | null
}
