import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

// POST /api/budget/import
// Accepts a CSV text body and bulk-creates transactions.
// CSV format: Date,Merchant,Category,Account,Type,Amount,Currency,Description,Payment Method
export async function POST(req: NextRequest) {
  try {
    const user = await db.user.findFirst({ where: { email: await getCurrentUserEmail() } })
    if (!user) return NextResponse.json({ error: 'No user.' }, { status: 500 })

    const body = await req.json()
    const csv: string = body.csv
    if (!csv || typeof csv !== 'string') {
      return NextResponse.json({ error: 'CSV text required' }, { status: 400 })
    }

    const lines = csv.trim().split('\n')
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 })
    }

    const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
    const idx = {
      date: header.findIndex((h) => h.includes('date')),
      merchant: header.findIndex((h) => h.includes('merchant')),
      category: header.findIndex((h) => h.includes('category')),
      account: header.findIndex((h) => h.includes('account')),
      type: header.findIndex((h) => h.includes('type')),
      amount: header.findIndex((h) => h.includes('amount')),
      description: header.findIndex((h) => h.includes('description')),
      payment: header.findIndex((h) => h.includes('payment')),
    }

    const accounts = await db.account.findMany({ where: { userId: user.id } })
    const categories = await db.category.findMany({ where: { userId: user.id } })

    const accountByName: Record<string, string> = {}
    for (const a of accounts) accountByName[a.name.toLowerCase()] = a.id

    const categoryByName: Record<string, string> = {}
    for (const c of categories) categoryByName[c.name.toLowerCase()] = c.id

    let imported = 0
    let skipped = 0

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i])
      if (cols.length < 2) { skipped++; continue }

      const dateStr = idx.date >= 0 ? cols[idx.date] : ''
      const merchant = idx.merchant >= 0 ? cols[idx.merchant] : ''
      const categoryName = idx.category >= 0 ? cols[idx.category] : ''
      const accountName = idx.account >= 0 ? cols[idx.account] : ''
      const type = idx.type >= 0 ? cols[idx.type]?.toLowerCase()?.trim() : 'expense'
      const amountStr = idx.amount >= 0 ? cols[idx.amount] : '0'
      const description = idx.description >= 0 ? cols[idx.description] : ''
      const payment = idx.payment >= 0 ? cols[idx.payment] : 'debit'

      const amount = parseFloat(amountStr) || 0
      if (amount <= 0) { skipped++; continue }

      const accountId = accountByName[accountName?.toLowerCase()?.trim()] ?? accounts[0]?.id
      if (!accountId) { skipped++; continue }

      const categoryId = categoryByName[categoryName?.toLowerCase()?.trim()] ?? null

      const txDate = dateStr ? new Date(dateStr) : new Date()
      if (isNaN(txDate.getTime())) { skipped++; continue }

      await db.transaction.create({
        data: {
          userId: user.id,
          accountId,
          type: type === 'income' ? 'income' : type === 'transfer' ? 'transfer' : 'expense',
          amount: Math.abs(amount),
          currency: user.currencyCode,
          merchantName: merchant || null,
          categoryId,
          date: txDate,
          description: description || null,
          paymentMethod: payment || 'debit',
          status: 'posted',
        },
      })

      const delta =
        type === 'income' ? Math.abs(amount) : type === 'transfer' ? 0 : -Math.abs(amount)
      if (delta !== 0) {
        await db.account.update({
          where: { id: accountId },
          data: { currentBalance: { increment: delta } },
        })
      }

      imported++
    }

    return NextResponse.json({ ok: true, imported, skipped })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}
