import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// PATCH /api/budget/user — update user settings (currency, paySchedule, monthStartDay, name)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    const allowed: Record<string, any> = {}
    if (body.name !== undefined) allowed.name = body.name
    if (body.currencyCode !== undefined) {
      allowed.currencyCode = body.currencyCode
      // Set symbol based on code
      const symbols: Record<string, string> = { DOP: 'RD$', USD: '$', EUR: '€' }
      if (symbols[body.currencyCode]) allowed.currencySymbol = symbols[body.currencyCode]
    }
    if (body.paySchedule !== undefined) allowed.paySchedule = body.paySchedule
    if (body.monthStartDay !== undefined) allowed.monthStartDay = parseInt(body.monthStartDay)
    if (body.hideBalances !== undefined) allowed.hideBalances = body.hideBalances

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: allowed,
    })

    return NextResponse.json({ ok: true, user: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
