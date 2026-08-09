// Senlie Budget — Ownership validation helpers
// Defense-in-depth: even with Supabase RLS, the API layer independently
// verifies that every resource being accessed belongs to the authenticated
// user. This prevents cross-user data leakage from API bugs.

import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth-server'

// ── Core helper: returns the current user's ID, or throws 403 ─────────
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser()
  return user.id
}

// ── Verify a transaction belongs to the current user ─────────────────
export async function requireTransactionOwnership(transactionId: string): Promise<string> {
  const userId = await requireUserId()
  const tx = await db.transaction.findUnique({
    where: { id: transactionId },
    select: { userId: true },
  })
  if (!tx) throw new OwnershipError('Transaction not found')
  if (tx.userId !== userId) throw new OwnershipError('Access denied')
  return userId
}

// ── Verify an account belongs to the current user ────────────────────
export async function requireAccountOwnership(accountId: string): Promise<string> {
  const userId = await requireUserId()
  const account = await db.account.findUnique({
    where: { id: accountId },
    select: { userId: true },
  })
  if (!account) throw new OwnershipError('Account not found')
  if (account.userId !== userId) throw new OwnershipError('Access denied')
  return userId
}

// ── Verify a category belongs to the current user ────────────────────
export async function requireCategoryOwnership(categoryId: string): Promise<string> {
  const userId = await requireUserId()
  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { userId: true },
  })
  if (!category) throw new OwnershipError('Category not found')
  if (category.userId !== userId) throw new OwnershipError('Access denied')
  return userId
}

// ── Verify a goal belongs to the current user ────────────────────────
export async function requireGoalOwnership(goalId: string): Promise<string> {
  const userId = await requireUserId()
  const goal = await db.goal.findUnique({
    where: { id: goalId },
    select: { userId: true },
  })
  if (!goal) throw new OwnershipError('Goal not found')
  if (goal.userId !== userId) throw new OwnershipError('Access denied')
  return userId
}

// ── Verify a recurring rule belongs to the current user ──────────────
export async function requireRecurringOwnership(ruleId: string): Promise<string> {
  const userId = await requireUserId()
  const rule = await db.recurringRule.findUnique({
    where: { id: ruleId },
    select: { userId: true },
  })
  if (!rule) throw new OwnershipError('Recurring rule not found')
  if (rule.userId !== userId) throw new OwnershipError('Access denied')
  return userId
}

// ── Verify a budget belongs to the current user ──────────────────────
export async function requireBudgetOwnership(budgetId: string): Promise<string> {
  const userId = await requireUserId()
  const budget = await db.budget.findUnique({
    where: { id: budgetId },
    select: { userId: true },
  })
  if (!budget) throw new OwnershipError('Budget not found')
  if (budget.userId !== userId) throw new OwnershipError('Access denied')
  return userId
}

// ── Custom error class for 403 responses ─────────────────────────────
export class OwnershipError extends Error {
  statusCode: number

  constructor(message: string) {
    super(message)
    this.name = 'OwnershipError'
    this.statusCode = 403
  }
}
