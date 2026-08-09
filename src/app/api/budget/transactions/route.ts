import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUserEmail, getCurrentUser } from '@/lib/auth-server'
import { requireTransactionOwnership, requireUserId, OwnershipError } from '@/lib/ownership'

export const dynamic = 'force-dynamic'

// POST /api/budget/transactions  — create a new transaction
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const user = await getCurrentUser()
    const userId = user.id

    const {
      type,
      amount,
      merchantName,
      categoryId,
      accountId,
      toAccountId,
      date,
      description,
      notes,
      paymentMethod,
    } = body

    if (!type || !amount || !accountId) {
      return NextResponse.json(
        { error: 'Missing required fields: type, amount, accountId' },
        { status: 400 }
      )
    }

    const txDate = date ? new Date(date) : new Date()
    const amt = Math.abs(parseFloat(amount))

    // ── Transfer: create two linked ledger entries ──────────────────────
    // Transfers move money between accounts without counting as spending.
    // We create a debit on the source account and a credit on the destination,
    // linked by a shared transferGroupId.
    if (type === 'transfer' && toAccountId && toAccountId !== accountId) {
      const groupId = `tg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const fromName = (await db.account.findUnique({ where: { id: accountId } }))?.name ?? 'Account'
      const toName = (await db.account.findUnique({ where: { id: toAccountId } }))?.name ?? 'Account'

      const [outTx, inTx] = await Promise.all([
        db.transaction.create({
          data: {
            userId,
            accountId,
            type: 'transfer',
            amount: amt,
            currency: user.currencyCode,
            merchantName: `Transfer to ${toName}`,
            date: txDate,
            description: description || `Transfer to ${toName}`,
            paymentMethod: 'transfer',
            transferGroupId: groupId,
            status: 'posted',
            excludeFromBudget: true,
          },
        }),
        db.transaction.create({
          data: {
            userId,
            accountId: toAccountId,
            type: 'transfer',
            amount: amt,
            currency: user.currencyCode,
            merchantName: `Transfer from ${fromName}`,
            date: txDate,
            description: description || `Transfer from ${fromName}`,
            paymentMethod: 'transfer',
            transferGroupId: groupId,
            status: 'posted',
            excludeFromBudget: true,
          },
        }),
      ])

      // Adjust both balances: source decreases, destination increases
      await Promise.all([
        db.account.update({
          where: { id: accountId },
          data: { currentBalance: { decrement: amt } },
        }),
        db.account.update({
          where: { id: toAccountId },
          data: { currentBalance: { increment: amt } },
        }),
      ])

      return NextResponse.json({ ok: true, id: outTx.id, transferGroupId: groupId })
    }

    // ── Regular expense / income ────────────────────────────────────────
    const tx = await db.transaction.create({
      data: {
        userId,
        accountId,
        type,
        amount: amt,
        currency: user.currencyCode,
        merchantName: merchantName || null,
        categoryId: categoryId || null,
        date: txDate,
        description: description || null,
        notes: notes || null,
        paymentMethod: paymentMethod || (type === 'transfer' ? 'transfer' : 'debit'),
        status: 'posted',
      },
      include: { category: true, account: true },
    })

    // Update account balance
    const delta =
      type === 'expense' ? -amt : type === 'income' ? amt : 0
    if (delta !== 0) {
      await db.account.update({
        where: { id: accountId },
        data: { currentBalance: { increment: delta } },
      })
    }

    return NextResponse.json({ ok: true, id: tx.id })
  } catch (e: any) {
    if (e instanceof OwnershipError) return NextResponse.json({ error: e.message }, { status: e.statusCode })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/budget/transactions?id=...  — delete a transaction
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Verify ownership — throws OwnershipError (403) if not owned
    await requireTransactionOwnership(id)

    const existing = await db.transaction.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Reverse account balance
    const delta =
      existing.type === 'expense'
        ? existing.amount
        : existing.type === 'income'
          ? -existing.amount
          : 0
    if (delta !== 0) {
      await db.account.update({
        where: { id: existing.accountId },
        data: { currentBalance: { increment: delta } },
      })
    }

    await db.transaction.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof OwnershipError) return NextResponse.json({ error: e.message }, { status: e.statusCode })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH /api/budget/transactions?id=...  — update a transaction (edit / exclude / change category)
export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await req.json()

    // Verify ownership — throws OwnershipError (403) if not owned
    await requireTransactionOwnership(id)

    const existing = await db.transaction.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allowed: Record<string, any> = {}
    if (body.merchantName !== undefined) allowed.merchantName = body.merchantName || null
    if (body.categoryId !== undefined) allowed.categoryId = body.categoryId || null
    if (body.description !== undefined) allowed.description = body.description || null
    if (body.notes !== undefined) allowed.notes = body.notes || null
    if (body.date !== undefined) allowed.date = new Date(body.date)
    if (body.paymentMethod !== undefined) allowed.paymentMethod = body.paymentMethod
    if (body.excludeFromBudget !== undefined) allowed.excludeFromBudget = body.excludeFromBudget
    if (body.accountId !== undefined) allowed.accountId = body.accountId

    // Amount change requires balance adjustment
    if (body.amount !== undefined) {
      const newAmount = Math.abs(parseFloat(body.amount))
      const oldDelta =
        existing.type === 'expense' ? -existing.amount : existing.type === 'income' ? existing.amount : 0
      const newDelta =
        existing.type === 'expense' ? -newAmount : existing.type === 'income' ? newAmount : 0
      const balanceDiff = newDelta - oldDelta
      if (balanceDiff !== 0) {
        await db.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: balanceDiff } },
        })
      }
      allowed.amount = newAmount
    }

    if (Object.keys(allowed).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    await db.transaction.update({ where: { id }, data: allowed })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    if (e instanceof OwnershipError) return NextResponse.json({ error: e.message }, { status: e.statusCode })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT /api/budget/transactions?action=duplicate&id=...  — duplicate a transaction
export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    const action = req.nextUrl.searchParams.get('action')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Verify ownership — throws OwnershipError (403) if not owned
    const userId = await requireTransactionOwnership(id)

    const existing = await db.transaction.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (action === 'duplicate') {
      const dup = await db.transaction.create({
        data: {
          userId,
          accountId: existing.accountId,
          type: existing.type,
          amount: existing.amount,
          currency: existing.currency,
          merchantName: existing.merchantName,
          categoryId: existing.categoryId,
          date: new Date(), // duplicate uses today's date
          description: existing.description,
          notes: existing.notes,
          paymentMethod: existing.paymentMethod,
          status: 'posted',
          excludeFromBudget: existing.excludeFromBudget,
        },
      })
      // Update account balance for the duplicate
      const delta =
        existing.type === 'expense'
          ? -existing.amount
          : existing.type === 'income'
            ? existing.amount
            : 0
      if (delta !== 0) {
        await db.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: delta } },
        })
      }
      return NextResponse.json({ ok: true, id: dup.id })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    if (e instanceof OwnershipError) return NextResponse.json({ error: e.message }, { status: e.statusCode })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
