import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// PATCH /api/budget/user — update user settings
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    const allowed: Record<string, any> = {}
    if (body.name !== undefined) allowed.name = String(body.name).trim()
    if (body.avatarUrl !== undefined) allowed.avatarUrl = body.avatarUrl ? String(body.avatarUrl) : null
    if (body.pronouns !== undefined) allowed.pronouns = body.pronouns ? String(body.pronouns).trim().slice(0, 60) : null
    if (body.birthDate !== undefined) {
      if (body.birthDate === null || body.birthDate === '') allowed.birthDate = null
      else {
        const parsed = new Date(`${body.birthDate}T00:00:00`)
        if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
          return NextResponse.json({ error: 'Invalid birth date' }, { status: 400 })
        }
        allowed.birthDate = parsed
      }
    }
    if (body.walkthroughCompleted !== undefined) allowed.walkthroughCompleted = Boolean(body.walkthroughCompleted)
    if (body.currencyCode !== undefined) {
      allowed.currencyCode = body.currencyCode
      // Set symbol based on code
      const symbols: Record<string, string> = { DOP: 'RD$', USD: '$', EUR: '€' }
      if (symbols[body.currencyCode]) allowed.currencySymbol = symbols[body.currencyCode]
    }
    if (body.paySchedule !== undefined) allowed.paySchedule = body.paySchedule
    if (body.monthStartDay !== undefined) allowed.monthStartDay = parseInt(body.monthStartDay)
    if (body.hideBalances !== undefined) allowed.hideBalances = body.hideBalances
    if (body.language !== undefined) {
      if (!['en', 'es'].includes(body.language)) {
        return NextResponse.json({ error: 'Unsupported language' }, { status: 400 })
      }
      allowed.language = body.language
    }

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
