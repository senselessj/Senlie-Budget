import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

type Schedule = 'monthly' | 'biweekly' | 'weekly' | 'custom'

const VALID_SCHEDULES = new Set<Schedule>(['monthly', 'biweekly', 'weekly', 'custom'])

function parseDateOnly(value: unknown) {
  const raw = String(value ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const date = new Date(`${raw}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function todayDateOnly() {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0))
}

function nextMonthlyDate(day: number) {
  const now = new Date()
  const build = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return new Date(year, month, Math.min(day, daysInMonth), 9, 0, 0, 0)
  }
  let candidate = build(now.getFullYear(), now.getMonth())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (candidate < today) candidate = build(now.getFullYear(), now.getMonth() + 1)
  return candidate
}

async function getUser() {
  return db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
}

// GET /api/budget/pay-schedule
// Returns the editable schedule definition, not merely the calculated next payday.
export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    const rules = await db.recurringRule.findMany({
      where: {
        userId: user.id,
        transactionType: 'income',
        isPaySchedule: true,
        isActive: true,
      },
      orderBy: { nextDate: 'asc' },
    })

    return NextResponse.json({
      paySchedule: user.paySchedule,
      anchorDate: user.payAnchorDate ? new Date(user.payAnchorDate).toISOString().slice(0, 10) : null,
      amount: Number(user.payAmount) > 0 ? Number(user.payAmount) : null,
      customPayments: rules.map((rule: any) => ({
        id: rule.id,
        day: new Date(rule.startDate).getDate(),
        amount: Number(rule.amount),
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/budget/pay-schedule
// Saves the full payday setup: cadence + date(s) + amount(s).
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const schedule = String(body.paySchedule ?? '') as Schedule
    if (!VALID_SCHEDULES.has(schedule)) {
      return NextResponse.json({ error: 'Invalid pay schedule' }, { status: 400 })
    }

    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    if (schedule !== 'custom') {
      const anchorDate = parseDateOnly(body.anchorDate)
      const amount = Number(body.amount)
      if (!anchorDate) return NextResponse.json({ error: 'Invalid payment date' }, { status: 400 })
      if (anchorDate < todayDateOnly()) {
        return NextResponse.json({ error: 'Payment date cannot be in the past' }, { status: 400 })
      }
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Payment amount must be positive' }, { status: 400 })
      }

      await db.user.update({
        where: { id: user.id },
        data: {
          paySchedule: schedule,
          payAnchorDate: anchorDate,
          payAmount: amount,
        },
      })

      // Customized payday rules should not keep appearing as active recurring
      // income while a regular cadence is selected.
      const oldRules = await db.recurringRule.findMany({
        where: { userId: user.id, transactionType: 'income', isPaySchedule: true, isActive: true },
      })
      for (const rule of oldRules) {
        await db.recurringRule.update({ where: { id: rule.id }, data: { isActive: false } })
      }

      return NextResponse.json({ ok: true, paySchedule: schedule })
    }

    const incoming = Array.isArray(body.customPayments) ? body.customPayments : []
    if (!incoming.length) {
      return NextResponse.json({ error: 'Add at least one payday' }, { status: 400 })
    }

    const payments = incoming.map((item: any) => ({
      day: Number(item.day),
      amount: Number(item.amount),
    }))
    if (payments.some((p: any) => !Number.isInteger(p.day) || p.day < 1 || p.day > 31 || !Number.isFinite(p.amount) || p.amount <= 0)) {
      return NextResponse.json({ error: 'Every payday needs a valid day and amount' }, { status: 400 })
    }

    let salaryCat = await db.category.findFirst({
      where: { userId: user.id, name: 'Salary', type: 'income' },
    })
    if (!salaryCat) {
      salaryCat = await db.category.create({
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

    const firstAccount = await db.account.findFirst({ where: { userId: user.id, isArchived: false } })
      ?? await db.account.findFirst({ where: { userId: user.id } })
    if (!firstAccount) {
      return NextResponse.json({ error: 'Create an account before configuring paydays' }, { status: 409 })
    }

    // Replace only Senlie-managed payday rules. Other recurring income remains untouched.
    await db.recurringRule.deleteMany({
      where: { userId: user.id, transactionType: 'income', isPaySchedule: true },
    })

    for (const payment of payments) {
      const payDate = nextMonthlyDate(payment.day)
      await db.recurringRule.create({
        data: {
          userId: user.id,
          transactionType: 'income',
          amount: payment.amount,
          frequency: 'monthly',
          startDate: payDate,
          nextDate: payDate,
          categoryId: salaryCat.id,
          accountId: firstAccount.id,
          merchantName: 'Paycheck',
          description: `Income (day ${payment.day} of month)`,
          isActive: true,
          isPaySchedule: true,
        },
      })
    }

    await db.user.update({
      where: { id: user.id },
      data: { paySchedule: 'custom', payAnchorDate: null, payAmount: null },
    })

    return NextResponse.json({ ok: true, paySchedule: 'custom' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
