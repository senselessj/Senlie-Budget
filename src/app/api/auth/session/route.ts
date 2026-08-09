import { NextRequest, NextResponse } from 'next/server'
import { SENLIE_AUTH_COOKIE, createVerifierClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Mirrors a verified Supabase browser session into an HttpOnly cookie used by
// Senlie's same-origin API routes. The submitted token is verified before the
// cookie is issued.
export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json()
    if (!accessToken || typeof accessToken !== 'string') {
      return NextResponse.json({ error: 'Missing access token.' }, { status: 400 })
    }

    const verifier = createVerifierClient()
    const { data, error } = await verifier.auth.getUser(accessToken)
    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(SENLIE_AUTH_COOKIE, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Could not establish session.' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SENLIE_AUTH_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
  return res
}
