import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'
import { requireCategoryOwnership, requireAccountOwnership, requireGoalOwnership, requireRecurringOwnership, OwnershipError } from '@/lib/ownership'
import { getAccounts, getCategories } from '@/lib/finance'

export const dynamic = 'force-dynamic'

// GET /api/budget/accounts?type=expense|income|transfer
// Returns both accounts and categories for picker sheets.
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') as
      | 'expense'
      | 'income'
      | 'transfer'
      | null
    const [accounts, categories] = await Promise.all([
      getAccounts(),
      getCategories(type ?? undefined),
    ])
    return NextResponse.json({ accounts, categories })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/budget/accounts — create a new account
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    const { name, type, color, icon, openingBalance, institution } = body
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const account = await db.account.create({
      data: {
        userId: user.id,
        name: name.trim(),
        type: type || 'checking',
        currency: user.currencyCode,
        openingBalance: parseFloat(openingBalance) || 0,
        currentBalance: parseFloat(openingBalance) || 0,
        institution: institution || null,
        color: color || '#5965F3',
        icon: icon || 'wallet',
        isArchived: false,
      },
    })

    return NextResponse.json({ ok: true, id: account.id, account })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/budget/accounts?id=... — archive an account
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Verify ownership before allowing deletion
    await requireAccountOwnership(id)

    await db.account.update({ where: { id }, data: { isArchived: true } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof OwnershipError) return NextResponse.json({ error: e.message }, { status: e.statusCode })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
