import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'
import { localizedSystemCategoryName, type Language } from '@/lib/i18n'
import { requireCategoryOwnership, requireAccountOwnership, requireGoalOwnership, requireRecurringOwnership, OwnershipError } from '@/lib/ownership'

export const dynamic = 'force-dynamic'

// GET /api/budget/categories?type=expense|income|transfer
export async function GET(req: NextRequest) {
  try {
    const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })
    const type = req.nextUrl.searchParams.get('type') as
      | 'expense'
      | 'income'
      | 'transfer'
      | null
    const categories = await db.category.findMany({
      where: { userId: user.id, ...(type ? { type } : {}) },
      orderBy: { sortOrder: 'asc' },
    })
    const language: Language = user.language === 'es' ? 'es' : 'en'
    return NextResponse.json(
      categories.map((category) => ({
        ...category,
        name: category.isSystem
          ? localizedSystemCategoryName(category.name, language)
          : category.name,
      }))
    )
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/budget/categories — create a new category
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    const { name, icon, color, type } = body
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Determine sort order = max existing + 1
    const maxSort = await db.category.aggregate({
      where: { userId: user.id, type: type ?? 'expense' },
      _max: { sortOrder: true },
    })

    const category = await db.category.create({
      data: {
        userId: user.id,
        name: name.trim(),
        icon: icon || 'tag',
        color: color || '#5965F3',
        type: type || 'expense',
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        isSystem: false,
      },
    })

    return NextResponse.json({ ok: true, id: category.id, category })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/budget/categories?id=... — delete a custom category
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Verify ownership before allowing deletion
    await requireCategoryOwnership(id)

    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.isSystem) {
      return NextResponse.json({ error: 'System categories cannot be deleted' }, { status: 400 })
    }

    await db.category.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof OwnershipError) return NextResponse.json({ error: e.message }, { status: e.statusCode })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
