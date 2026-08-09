import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// POST /api/auth/accept-terms
// Records that the user accepted the Terms & Privacy Policy.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { version } = body
    const email = await getCurrentUserEmail()
    const user = await db.user.findFirst({ where: { email } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    await db.user.update({
      where: { id: user.id },
      data: {
        termsAccepted: true,
        termsVersion: version || '1.0',
        termsAcceptedAt: new Date(),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
