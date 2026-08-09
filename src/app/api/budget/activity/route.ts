import { NextRequest, NextResponse } from 'next/server'
import { getActivity } from '@/lib/finance'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const filter = (req.nextUrl.searchParams.get('filter') ?? 'all') as
      | 'all'
      | 'expense'
      | 'income'
      | 'transfer'
    const search = req.nextUrl.searchParams.get('q') ?? undefined
    const data = await getActivity(filter, search)
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
