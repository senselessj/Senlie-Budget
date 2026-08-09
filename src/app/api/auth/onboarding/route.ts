import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// POST /api/auth/onboarding
// Completes the onboarding wizard: saves currency, pay schedule, income,
// creates accounts, creates categories, and creates the first budget.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = await getCurrentUserEmail()
    const user = await db.user.findFirst({ where: { email } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    const {
      currencyCode,
      currencySymbol,
      paySchedule,
      customPayments,
      monthStartDay,
      monthlyIncome,
      accounts,
      categories,
    } = body

    // 1. Update user settings
    const symbols: Record<string, string> = { DOP: 'RD$', USD: '$', EUR: '\u20ac' }
    await db.user.update({
      where: { id: user.id },
      data: {
        currencyCode: currencyCode || 'DOP',
        currencySymbol: symbols[currencyCode] || currencySymbol || 'RD$',
        paySchedule: paySchedule || 'biweekly',
        monthStartDay: monthStartDay || 1,
        onboardingComplete: true,
      },
    })

    // 2. Create accounts (skip if name already exists)
    if (accounts && Array.isArray(accounts) && accounts.length > 0) {
      for (const acc of accounts) {
        if (!acc.name) continue
        const existingAcc = await db.account.findFirst({
          where: { userId: user.id, name: acc.name },
        })
        if (existingAcc) continue
        await db.account.create({
          data: {
            userId: user.id,
            name: acc.name,
            type: acc.type || 'checking',
            currency: currencyCode || 'DOP',
            openingBalance: parseFloat(acc.balance) || 0,
            currentBalance: parseFloat(acc.balance) || 0,
            institution: acc.institution || null,
            color: acc.color || '#5965F3',
            icon: acc.icon || 'wallet',
            isArchived: false,
          },
        })
      }
    }

    // 3. Create default categories if none provided
    const cats = categories && categories.length > 0 ? categories : getDefaultCategories()
    for (let i = 0; i < cats.length; i++) {
      const c = cats[i]
      // Skip if category already exists (onboarding re-run safety)
      const existing = await db.category.findFirst({
        where: { userId: user.id, name: c.name, type: c.type || 'expense' },
      })
      if (existing) continue
      await db.category.create({
        data: {
          userId: user.id,
          name: c.name,
          icon: c.icon || 'tag',
          color: c.color || '#5965F3',
          type: c.type || 'expense',
          sortOrder: i + 1,
          isSystem: true,
        },
      })
    }

    // 4. Create a salary income category (skip if already exists)
    const existingSalary = await db.category.findFirst({
      where: { userId: user.id, name: 'Salary', type: 'income' },
    })
    if (!existingSalary) {
      await db.category.create({
        data: {
          userId: user.id,
          name: 'Salary',
          icon: 'briefcase',
          color: '#34C759',
          type: 'income',
          sortOrder: 1,
          isSystem: true,
        },
      })
    }

    // 4b. Create recurring income rules from custom payments (day-of-month + amount)
    if (paySchedule === 'custom' && Array.isArray(customPayments) && customPayments.length > 0) {
      const salaryCat = await db.category.findFirst({
        where: { userId: user.id, name: 'Salary', type: 'income' },
      })
      const firstAccount = accounts?.[0]
        ? await db.account.findFirst({ where: { userId: user.id, name: accounts[0].name } })
        : await db.account.findFirst({ where: { userId: user.id } })

      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() // 0-indexed

      for (const payment of customPayments) {
        if (!payment.day || !payment.amount) continue
        const day = parseInt(payment.day)
        if (isNaN(day) || day < 1 || day > 31) continue
        const payAmount = parseFloat(payment.amount)
        if (isNaN(payAmount) || payAmount <= 0) continue

        // Build the next payday date: use the day-of-month in the current month.
        // If the day has already passed this month, use next month.
        let payDate = new Date(currentYear, currentMonth, day, 9, 0, 0, 0)
        if (payDate < now) {
          payDate = new Date(currentYear, currentMonth + 1, day, 9, 0, 0, 0)
        }

        // Check if a recurring rule already exists for this day + amount
        const existingRule = await db.recurringRule.findFirst({
          where: {
            userId: user.id,
            transactionType: 'income',
            amount: payAmount,
            description: `Income (day ${day} of month)`,
          },
        })
        if (existingRule) continue

        await db.recurringRule.create({
          data: {
            userId: user.id,
            transactionType: 'income',
            amount: payAmount,
            frequency: 'monthly',
            startDate: payDate,
            nextDate: payDate,
            categoryId: salaryCat?.id || null,
            accountId: firstAccount?.id || null,
            merchantName: 'Paycheck',
            description: `Income (day ${day} of month)`,
            isActive: true,
          },
        })
      }
    }

    // 5. Create or update the first budget for the current month
    // Use upsert to avoid unique constraint violation if onboarding is re-run
    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()
    const income = parseFloat(monthlyIncome) || 0

    // Find existing budget for this month (may exist if onboarding was re-run)
    const existingBudget = await db.budget.findFirst({
      where: { userId: user.id, month, year },
    })

    let budget
    if (existingBudget) {
      // Update income target, delete old allocations, recreate
      budget = await db.budget.update({
        where: { id: existingBudget.id },
        data: { incomeTarget: income, rolloverEnabled: true },
      })
      await db.budgetCategory.deleteMany({
        where: { budgetId: budget.id },
      })
    } else {
      budget = await db.budget.create({
        data: {
          userId: user.id,
          month,
          year,
          incomeTarget: income,
          rolloverEnabled: true,
        },
      })
    }

    // 6. Create budget allocations for each expense category
    const expenseCats = cats.filter((c: any) => c.type !== 'income')
    if (expenseCats.length > 0 && income > 0) {
      const perCat = Math.round(income / expenseCats.length / 100) * 100
      for (const c of expenseCats) {
        const created = await db.category.findFirst({
          where: { userId: user.id, name: c.name, type: 'expense' },
        })
        if (created) {
          await db.budgetCategory.create({
            data: {
              budgetId: budget.id,
              categoryId: created.id,
              allocatedAmount: perCat,
              rolloverAmount: 0,
              rolloverType: c.rolloverType || 'flexible',
            },
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function getDefaultCategories() {
  return [
    { name: 'Housing', icon: 'home', color: '#5965F3', type: 'expense', rolloverType: 'fixed' },
    { name: 'Groceries', icon: 'shopping-cart', color: '#34C759', type: 'expense', rolloverType: 'flexible' },
    { name: 'Eating Out', icon: 'utensils', color: '#FF9F0A', type: 'expense', rolloverType: 'flexible' },
    { name: 'Transport', icon: 'car', color: '#0A84FF', type: 'expense', rolloverType: 'flexible' },
    { name: 'Utilities', icon: 'plug-zap', color: '#AF52DE', type: 'expense', rolloverType: 'fixed' },
    { name: 'Entertainment', icon: 'film', color: '#FF375F', type: 'expense', rolloverType: 'rollover' },
    { name: 'Shopping', icon: 'shopping-bag', color: '#BF5AF2', type: 'expense', rolloverType: 'flexible' },
    { name: 'Health', icon: 'heart-pulse', color: '#FF453A', type: 'expense', rolloverType: 'flexible' },
  ]
}
