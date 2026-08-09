import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// GET /api/budget/export?format=csv|json
// Exports the user's transactions as a downloadable file.
export async function GET(req: NextRequest) {
  try {
    const format = (req.nextUrl.searchParams.get('format') ?? 'csv').toLowerCase()
    const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    const tx = await db.transaction.findMany({
      where: { userId: user.id },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
    })

    if (format === 'json') {
      const data = tx.map((t) => ({
        date: t.date.toISOString().slice(0, 10),
        merchant: t.merchantName ?? '',
        category: t.category?.name ?? '',
        account: t.account.name,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        description: t.description ?? '',
        payment_method: t.paymentMethod ?? '',
      }))
      return NextResponse.json(data, {
        headers: {
          'Content-Disposition': `attachment; filename="senlie-budget-export.json"`,
        },
      })
    }

    // CSV (default)
    const header = [
      'Date',
      'Merchant',
      'Category',
      'Account',
      'Type',
      'Amount',
      'Currency',
      'Description',
      'Payment Method',
    ].join(',')

    const rows = tx.map((t) => {
      const cells = [
        t.date.toISOString().slice(0, 10),
        csvEscape(t.merchantName ?? ''),
        csvEscape(t.category?.name ?? ''),
        csvEscape(t.account.name),
        t.type,
        t.amount.toFixed(2),
        t.currency,
        csvEscape(t.description ?? ''),
        csvEscape(t.paymentMethod ?? ''),
      ]
      return cells.join(',')
    })

    const csv = [header, ...rows].join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="senlie-budget-export.csv"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}
