import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'
import { requireCategoryOwnership, requireAccountOwnership, requireGoalOwnership, requireRecurringOwnership, OwnershipError } from '@/lib/ownership'
import { getGoals } from '@/lib/finance'

export const dynamic = 'force-dynamic'

// GET /api/budget/goals — list all savings goals
export async function GET(_req: NextRequest) {
  try {
    const data = await getGoals()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/budget/goals — create a new savings goal
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    const { name, targetAmount, currentAmount, targetDate, color, icon } = body
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      return NextResponse.json({ error: 'Target amount must be positive' }, { status: 400 })
    }

    const goal = await db.goal.create({
      data: {
        userId: user.id,
        name: name.trim(),
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount) || 0,
        targetDate: targetDate ? new Date(targetDate) : null,
        color: color || '#5965F3',
        icon: icon || 'target',
      },
    })

    return NextResponse.json({ ok: true, id: goal.id, goal })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/budget/goals?id=...
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Verify ownership before allowing deletion
    await requireGoalOwnership(id)

    await db.goal.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof OwnershipError) return NextResponse.json({ error: e.message }, { status: e.statusCode })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
