import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

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

// PATCH /api/budget/pay-schedule
// Changes the next expected payday. Regular schedules keep this date as their
// recurrence anchor. Customized schedules move the next active income rule.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const nextPayDate = parseDateOnly(body.nextPayDate)
    if (!nextPayDate) {
      return NextResponse.json({ error: 'Invalid payment date' }, { status: 400 })
    }

    if (nextPayDate < todayDateOnly()) {
      return NextResponse.json({ error: 'Payment date cannot be in the past' }, { status: 400 })
    }

    const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    if (user.paySchedule === 'custom') {
      const nextIncome = await db.recurringRule.findFirst({
        where: { userId: user.id, transactionType: 'income', isActive: true },
        orderBy: { nextDate: 'asc' },
      })

      if (!nextIncome) {
        return NextResponse.json(
          { error: 'No customized payday exists yet.' },
          { status: 409 }
        )
      }

      const day = nextPayDate.getUTCDate()
      await db.recurringRule.update({
        where: { id: nextIncome.id },
        data: {
          startDate: nextPayDate,
          nextDate: nextPayDate,
          description: `Income (day ${day} of month)`,
        },
      })

      return NextResponse.json({ ok: true, mode: 'custom', nextPayDate: nextPayDate.toISOString() })
    }

    await db.user.update({
      where: { id: user.id },
      data: { payAnchorDate: nextPayDate },
    })

    return NextResponse.json({ ok: true, mode: user.paySchedule, nextPayDate: nextPayDate.toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
