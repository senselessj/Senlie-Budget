import { NextRequest, NextResponse } from 'next/server'
import { getInsights } from '@/lib/finance'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  try {
    const data = await getInsights()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
