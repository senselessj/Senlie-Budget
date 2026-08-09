import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  return NextResponse.json(
    { error: 'Senlie Budget now creates accounts directly with Supabase Auth.' },
    { status: 410 }
  )
}
