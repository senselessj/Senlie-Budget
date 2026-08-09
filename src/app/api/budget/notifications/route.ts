import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// Default notification settings — push notifications are ON by default
const DEFAULT_SETTINGS = {
  bills: true,
  budget: true,
  payday: true,
  weekly: false,
  insights: true,
}

// GET /api/budget/notifications — return the user's notification settings
export async function GET() {
  try {
    const email = await getCurrentUserEmail()
    const user = await db.user.findFirst({ where: { email } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    return NextResponse.json({ settings: DEFAULT_SETTINGS })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/budget/notifications — update notification settings
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const email = await getCurrentUserEmail()
    const user = await db.user.findFirst({ where: { email } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    return NextResponse.json({ ok: true, settings: body })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
