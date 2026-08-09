import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'
import { requireCategoryOwnership, requireAccountOwnership, requireGoalOwnership, requireRecurringOwnership, OwnershipError } from '@/lib/ownership'
import { getRecurring } from '@/lib/finance'

export const dynamic = 'force-dynamic'

// GET /api/budget/recurring — list active recurring rules
export async function GET(_req: NextRequest) {
  try {
    const data = await getRecurring()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/budget/recurring — create a new recurring rule
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    const {
      transactionType,
      amount,
      frequency,
      nextDate,
      categoryId,
      accountId,
      merchantName,
      description,
    } = body

    if (!amount || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }
    if (!frequency) {
      return NextResponse.json({ error: 'Frequency is required' }, { status: 400 })
    }

    const startDate = nextDate ? new Date(nextDate) : new Date()

    const rule = await db.recurringRule.create({
      data: {
        userId: user.id,
        transactionType: transactionType || 'expense',
        amount: parseFloat(amount),
        frequency,
        startDate,
        nextDate: startDate,
        categoryId: categoryId || null,
        accountId: accountId || null,
        merchantName: merchantName || null,
        description: description || null,
        isActive: true,
      },
    })

    return NextResponse.json({ ok: true, id: rule.id, rule })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/budget/recurring?id=... — deactivate a recurring rule
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Verify ownership before allowing deletion
    await requireRecurringOwnership(id)

    await db.recurringRule.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof OwnershipError) return NextResponse.json({ error: e.message }, { status: e.statusCode })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
