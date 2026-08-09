import 'dotenv/config'
// Senlie Budget — Seed script
// Generates rich August 2026 demo data for Jason (Senlie test user)

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Helper: build a date in August 2026 (America/Santo_Domingo)
function aug(day: number, hour = 12, minute = 0): Date {
  // Use UTC to keep deterministic; UI formats in local TZ
  return new Date(Date.UTC(2026, 7, day, hour + 4, minute, 0)) // UTC-4 ~ AST
}

function jul(day: number, hour = 12): Date {
  return new Date(Date.UTC(2026, 6, day, hour + 4, 0, 0))
}

async function main() {
  console.log('Seeding Senlie Budget...')

  // Wipe
  await db.transactionSplit?.deleteMany?.()
  await db.transaction.deleteMany()
  await db.budgetCategory.deleteMany()
  await db.budget.deleteMany()
  await db.recurringRule.deleteMany()
  await db.goal.deleteMany()
  await db.merchant.deleteMany()
  await db.category.deleteMany()
  await db.account.deleteMany()
  await db.user.deleteMany()

  // User
  const user = await db.user.create({
    data: {
      email: 'jason@senlie.tech',
      name: 'Jason',
      avatarColor: '#5965F3',
      currencyCode: 'DOP',
      currencySymbol: 'RD$',
      timezone: 'America/Santo_Domingo',
      monthStartDay: 1,
      hideBalances: false,
      paySchedule: 'biweekly',
      onboardingComplete: true,
      termsAccepted: true,
      termsVersion: '1.0',
      termsAcceptedAt: new Date('2026-08-01'),
    },
  })

  // Accounts
  const [popular, bhd, cash, wallet] = await Promise.all([
    db.account.create({
      data: {
        userId: user.id,
        name: 'Banco Popular',
        type: 'checking',
        currency: 'DOP',
        openingBalance: 8000,
        currentBalance: 18420,
        institution: 'Banco Popular',
        color: '#5965F3',
        icon: 'landmark',
      },
    }),
    db.account.create({
      data: {
        userId: user.id,
        name: 'BHD Savings',
        type: 'savings',
        currency: 'DOP',
        openingBalance: 20000,
        currentBalance: 32500,
        institution: 'BHD',
        color: '#34C759',
        icon: 'piggy-bank',
      },
    }),
    db.account.create({
      data: {
        userId: user.id,
        name: 'Cash',
        type: 'cash',
        currency: 'DOP',
        openingBalance: 0,
        currentBalance: 1250,
        color: '#FF9F0A',
        icon: 'banknote',
      },
    }),
    db.account.create({
      data: {
        userId: user.id,
        name: 'Digital Wallet',
        type: 'wallet',
        currency: 'DOP',
        openingBalance: 0,
        currentBalance: 500,
        color: '#AF52DE',
        icon: 'smartphone',
      },
    }),
  ])

  // Categories (with Lucide icon names + brand colors)
  const cat = (name: string, icon: string, color: string, type = 'expense', sortOrder: number) =>
    db.category.create({
      data: { userId: user.id, name, icon, color, type, sortOrder, isSystem: true },
    })

  const housing = await cat('Housing', 'home', '#5965F3', 'expense', 1)
  const groceries = await cat('Groceries', 'shopping-cart', '#34C759', 'expense', 2)
  const dining = await cat('Eating Out', 'utensils', '#FF9F0A', 'expense', 3)
  const transport = await cat('Transport', 'car', '#0A84FF', 'expense', 4)
  const utilities = await cat('Utilities', 'plug-zap', '#AF52DE', 'expense', 5)
  const internet = await cat('Internet', 'wifi', '#6E6E73', 'expense', 6)
  const phone = await cat('Phone', 'phone', '#64D2FF', 'expense', 7)
  const entertainment = await cat('Entertainment', 'film', '#FF375F', 'expense', 8)
  const shopping = await cat('Shopping', 'shopping-bag', '#BF5AF2', 'expense', 9)
  const health = await cat('Health', 'heart-pulse', '#FF453A', 'expense', 10)
  const salaryCat = await cat('Salary', 'briefcase', '#34C759', 'income', 1)
  const freelanceCat = await cat('Freelance', 'laptop', '#5965F3', 'income', 2)

  // Budget for August 2026
  const budget = await db.budget.create({
    data: {
      userId: user.id,
      month: 8,
      year: 2026,
      incomeTarget: 49000,
      rolloverEnabled: true,
    },
  })

  const alloc = (categoryId: string, amount: number, rolloverType = 'monthly', rollover = 0) =>
    db.budgetCategory.create({
      data: { budgetId: budget.id, categoryId, allocatedAmount: amount, rolloverAmount: rollover, rolloverType },
    })

  await Promise.all([
    alloc(housing.id, 16000, 'fixed'),
    alloc(groceries.id, 7500, 'flexible'),
    alloc(dining.id, 4000, 'flexible'),
    alloc(transport.id, 4500, 'flexible'),
    alloc(utilities.id, 3500, 'fixed'),
    alloc(internet.id, 2500, 'fixed'),
    alloc(phone.id, 1200, 'fixed'),
    alloc(entertainment.id, 3000, 'rollover', 1200),
    alloc(shopping.id, 2500, 'flexible'),
    alloc(health.id, 1500, 'flexible'),
  ])

  // Recurring rules
  const recurring = await Promise.all([
    db.recurringRule.create({
      data: {
        userId: user.id,
        transactionType: 'expense',
        amount: 16000,
        frequency: 'monthly',
        startDate: jul(15),
        nextDate: aug(15),
        categoryId: housing.id,
        accountId: popular.id,
        merchantName: 'Landlord',
        description: 'Monthly rent',
        isActive: true,
      },
    }),
    db.recurringRule.create({
      data: {
        userId: user.id,
        transactionType: 'expense',
        amount: 2500,
        frequency: 'monthly',
        startDate: jul(18),
        nextDate: aug(18),
        categoryId: internet.id,
        accountId: popular.id,
        merchantName: 'Claro',
        description: 'Internet',
        isActive: true,
      },
    }),
    db.recurringRule.create({
      data: {
        userId: user.id,
        transactionType: 'expense',
        amount: 329,
        frequency: 'monthly',
        startDate: jul(22),
        nextDate: aug(22),
        categoryId: entertainment.id,
        accountId: popular.id,
        merchantName: 'Spotify',
        description: 'Spotify Premium',
        isActive: true,
      },
    }),
    db.recurringRule.create({
      data: {
        userId: user.id,
        transactionType: 'expense',
        amount: 1200,
        frequency: 'monthly',
        startDate: jul(25),
        nextDate: aug(25),
        categoryId: phone.id,
        accountId: popular.id,
        merchantName: 'Claro',
        description: 'Mobile plan',
        isActive: true,
      },
    }),
  ])

  // Goals
  await Promise.all([
    db.goal.create({
      data: {
        userId: user.id,
        name: 'New Apartment',
        targetAmount: 60000,
        currentAmount: 32500,
        targetDate: new Date('2026-10-31'),
        accountId: bhd.id,
        color: '#5965F3',
        icon: 'home',
      },
    }),
    db.goal.create({
      data: {
        userId: user.id,
        name: 'Emergency Fund',
        targetAmount: 30000,
        currentAmount: 18000,
        targetDate: new Date('2026-12-31'),
        accountId: bhd.id,
        color: '#34C759',
        icon: 'shield',
      },
    }),
    db.goal.create({
      data: {
        userId: user.id,
        name: 'Laptop',
        targetAmount: 12000,
        currentAmount: 4200,
        targetDate: new Date('2026-11-30'),
        accountId: bhd.id,
        color: '#AF52DE',
        icon: 'laptop',
      },
    }),
  ])

  // ============= TRANSACTIONS — August 2026 =============
  type Tx = {
    type: 'expense' | 'income' | 'transfer'
    amount: number
    date: Date
    merchantName?: string
    categoryId?: string
    accountId: string
    description?: string
    notes?: string
    paymentMethod?: string
    recurringRuleId?: string
    transferGroupId?: string
  }

  // August transactions — Today is Aug 8, 2026 (Friday)
  const august: Tx[] = [
    // Income — Aug 1 (first biweekly paycheck)
    { type: 'income', amount: 24500, date: aug(1, 9), merchantName: 'Acme Corp', categoryId: salaryCat.id, accountId: popular.id, description: 'Salary — first half', paymentMethod: 'transfer' },
    // Recurring / fixed costs
    { type: 'expense', amount: 2500, date: aug(2, 10), merchantName: 'Claro', categoryId: internet.id, accountId: popular.id, description: 'Internet', paymentMethod: 'debit', recurringRuleId: recurring[1].id },
    { type: 'expense', amount: 329, date: aug(3, 8), merchantName: 'Spotify', categoryId: entertainment.id, accountId: popular.id, description: 'Spotify Premium', paymentMethod: 'debit', recurringRuleId: recurring[2].id },
    // Groceries
    { type: 'expense', amount: 2183.42, date: aug(8, 18, 42), merchantName: 'Bravo Supermarket', categoryId: groceries.id, accountId: popular.id, description: 'Weekly groceries', paymentMethod: 'debit' },
    { type: 'expense', amount: 1820.55, date: aug(5, 17, 10), merchantName: 'Bravo Supermarket', categoryId: groceries.id, accountId: popular.id, description: 'Groceries', paymentMethod: 'debit' },
    { type: 'expense', amount: 945.20, date: aug(3, 13, 0), merchantName: 'La Sirena', categoryId: groceries.id, accountId: cash.id, description: 'Quick groceries', paymentMethod: 'cash' },
    { type: 'expense', amount: 670.80, date: aug(2, 19, 30), merchantName: 'Jumbo', categoryId: groceries.id, accountId: popular.id, paymentMethod: 'debit' },
    // Dining
    { type: 'expense', amount: 845, date: aug(7, 21, 15), merchantName: 'Adrián Tropical', categoryId: dining.id, accountId: popular.id, description: 'Dinner', paymentMethod: 'debit' },
    { type: 'expense', amount: 420, date: aug(6, 13, 30), merchantName: 'Taco Bell', categoryId: dining.id, accountId: wallet.id, paymentMethod: 'credit' },
    { type: 'expense', amount: 1280, date: aug(4, 20, 0), merchantName: 'La Cassina', categoryId: dining.id, accountId: popular.id, description: 'Date night', paymentMethod: 'debit' },
    { type: 'expense', amount: 350, date: aug(3, 9, 0), merchantName: 'Coffee Shop', categoryId: dining.id, accountId: cash.id, paymentMethod: 'cash' },
    { type: 'expense', amount: 455, date: aug(2, 8, 30), merchantName: 'Coffee Shop', categoryId: dining.id, accountId: wallet.id, paymentMethod: 'credit' },
    // Transport
    { type: 'expense', amount: 312, date: aug(8, 9, 15), merchantName: 'Uber', categoryId: transport.id, accountId: wallet.id, description: 'To work', paymentMethod: 'credit' },
    { type: 'expense', amount: 285, date: aug(7, 18, 0), merchantName: 'Uber', categoryId: transport.id, accountId: wallet.id, paymentMethod: 'credit' },
    { type: 'expense', amount: 340, date: aug(6, 8, 30), merchantName: 'Uber', categoryId: transport.id, accountId: wallet.id, paymentMethod: 'credit' },
    { type: 'expense', amount: 250, date: aug(5, 17, 0), merchantName: 'Gas Station', categoryId: transport.id, accountId: popular.id, paymentMethod: 'debit' },
    { type: 'expense', amount: 980, date: aug(4, 10, 0), merchantName: 'Gas Station', categoryId: transport.id, accountId: popular.id, paymentMethod: 'debit' },
    // Utilities
    { type: 'expense', amount: 1850, date: aug(5, 11, 0), merchantName: 'EdeNorte', categoryId: utilities.id, accountId: popular.id, description: 'Electricity', paymentMethod: 'debit' },
    { type: 'expense', amount: 920, date: aug(3, 11, 0), merchantName: 'Coraaqua', categoryId: utilities.id, accountId: popular.id, description: 'Water', paymentMethod: 'debit' },
    // Entertainment
    { type: 'expense', amount: 650, date: aug(6, 20, 0), merchantName: 'Cinema', categoryId: entertainment.id, accountId: popular.id, description: 'Movie night', paymentMethod: 'debit' },
    // Shopping
    { type: 'expense', amount: 1290, date: aug(4, 16, 0), merchantName: 'Amazon', categoryId: shopping.id, accountId: popular.id, description: 'Books', paymentMethod: 'debit' },
    // Health
    { type: 'expense', amount: 750, date: aug(2, 15, 0), merchantName: 'Pharmacy', categoryId: health.id, accountId: popular.id, paymentMethod: 'debit' },
    // Transfer to savings
    { type: 'transfer', amount: 5000, date: aug(1, 10, 0), accountId: popular.id, description: 'Transfer to savings', transferGroupId: 'tg-aug-1', paymentMethod: 'transfer' },
    { type: 'transfer', amount: -5000, date: aug(1, 10, 0), accountId: bhd.id, description: 'Transfer from checking', transferGroupId: 'tg-aug-1', paymentMethod: 'transfer' },
    { type: 'transfer', amount: 1500, date: aug(6, 12, 0), accountId: popular.id, description: 'Cash withdrawal', transferGroupId: 'tg-aug-6', paymentMethod: 'transfer' },
    { type: 'transfer', amount: -1500, date: aug(6, 12, 0), accountId: cash.id, description: 'ATM withdrawal', transferGroupId: 'tg-aug-6', paymentMethod: 'transfer' },
  ]

  // July transactions — for comparison (last month)
  const july: Tx[] = [
    { type: 'income', amount: 24500, date: jul(1, 9), merchantName: 'Acme Corp', categoryId: salaryCat.id, accountId: popular.id, description: 'Salary — first half', paymentMethod: 'transfer' },
    { type: 'income', amount: 24500, date: jul(15, 9), merchantName: 'Acme Corp', categoryId: salaryCat.id, accountId: popular.id, description: 'Salary — second half', paymentMethod: 'transfer' },
    { type: 'income', amount: 3200, date: jul(20, 14), merchantName: 'Freelance Client', categoryId: freelanceCat.id, accountId: popular.id, description: 'Web project', paymentMethod: 'transfer' },
    { type: 'expense', amount: 16000, date: jul(15, 10), merchantName: 'Landlord', categoryId: housing.id, accountId: popular.id, description: 'Rent', paymentMethod: 'transfer', recurringRuleId: recurring[0].id },
    { type: 'expense', amount: 2500, date: jul(18, 10), merchantName: 'Claro', categoryId: internet.id, accountId: popular.id, paymentMethod: 'debit' },
    { type: 'expense', amount: 329, date: jul(22, 8), merchantName: 'Spotify', categoryId: entertainment.id, accountId: popular.id, paymentMethod: 'debit' },
    { type: 'expense', amount: 1200, date: jul(25, 10), merchantName: 'Claro', categoryId: phone.id, accountId: popular.id, paymentMethod: 'debit' },
    // Groceries — July was higher
    { type: 'expense', amount: 2450, date: jul(5, 17), merchantName: 'Bravo Supermarket', categoryId: groceries.id, accountId: popular.id, paymentMethod: 'debit' },
    { type: 'expense', amount: 1980, date: jul(12, 17), merchantName: 'Bravo Supermarket', categoryId: groceries.id, accountId: popular.id, paymentMethod: 'debit' },
    { type: 'expense', amount: 1670, date: jul(19, 17), merchantName: 'La Sirena', categoryId: groceries.id, accountId: cash.id, paymentMethod: 'cash' },
    { type: 'expense', amount: 1420, date: jul(26, 17), merchantName: 'Jumbo', categoryId: groceries.id, accountId: popular.id, paymentMethod: 'debit' },
    // Dining — July was higher
    { type: 'expense', amount: 1850, date: jul(8, 21), merchantName: 'Adrián Tropical', categoryId: dining.id, accountId: popular.id, paymentMethod: 'debit' },
    { type: 'expense', amount: 980, date: jul(14, 13), merchantName: 'La Cassina', categoryId: dining.id, accountId: popular.id, paymentMethod: 'debit' },
    { type: 'expense', amount: 540, date: jul(20, 13), merchantName: 'Taco Bell', categoryId: dining.id, accountId: wallet.id, paymentMethod: 'credit' },
    // Transport — July was higher (the spec mentions this!)
    { type: 'expense', amount: 450, date: jul(2, 9), merchantName: 'Uber', categoryId: transport.id, accountId: wallet.id, paymentMethod: 'credit' },
    { type: 'expense', amount: 380, date: jul(5, 18), merchantName: 'Uber', categoryId: transport.id, accountId: wallet.id, paymentMethod: 'credit' },
    { type: 'expense', amount: 410, date: jul(9, 9), merchantName: 'Uber', categoryId: transport.id, accountId: wallet.id, paymentMethod: 'credit' },
    { type: 'expense', amount: 290, date: jul(12, 18), merchantName: 'Uber', categoryId: transport.id, accountId: wallet.id, paymentMethod: 'credit' },
    { type: 'expense', amount: 1050, date: jul(7, 10), merchantName: 'Gas Station', categoryId: transport.id, accountId: popular.id, paymentMethod: 'debit' },
    { type: 'expense', amount: 980, date: jul(21, 10), merchantName: 'Gas Station', categoryId: transport.id, accountId: popular.id, paymentMethod: 'debit' },
    { type: 'expense', amount: 720, date: jul(28, 10), merchantName: 'Gas Station', categoryId: transport.id, accountId: popular.id, paymentMethod: 'debit' },
    // Utilities
    { type: 'expense', amount: 1850, date: jul(5, 11), merchantName: 'EdeNorte', categoryId: utilities.id, accountId: popular.id, paymentMethod: 'debit' },
    { type: 'expense', amount: 920, date: jul(3, 11), merchantName: 'Coraaqua', categoryId: utilities.id, accountId: popular.id, paymentMethod: 'debit' },
    // Entertainment
    { type: 'expense', amount: 850, date: jul(13, 20), merchantName: 'Cinema', categoryId: entertainment.id, accountId: popular.id, paymentMethod: 'debit' },
    // Shopping
    { type: 'expense', amount: 2190, date: jul(18, 16), merchantName: 'Amazon', categoryId: shopping.id, accountId: popular.id, paymentMethod: 'debit' },
    // Health
    { type: 'expense', amount: 1100, date: jul(10, 15), merchantName: 'Pharmacy', categoryId: health.id, accountId: popular.id, paymentMethod: 'debit' },
  ]

  const allTx = [...august, ...july]

  for (const t of allTx) {
    await db.transaction.create({
      data: {
        userId: user.id,
        accountId: t.accountId,
        type: t.type,
        amount: Math.abs(t.amount),
        currency: 'DOP',
        merchantName: t.merchantName,
        categoryId: t.categoryId,
        date: t.date,
        description: t.description,
        paymentMethod: t.paymentMethod,
        recurringRuleId: t.recurringRuleId,
        transferGroupId: t.transferGroupId,
        status: 'posted',
      },
    })
  }

  console.log('Seeded:')
  console.log(' - 1 user (Jason)')
  console.log(' - 4 accounts')
  console.log(' - 12 categories')
  console.log(' - 4 recurring rules')
  console.log(' - 3 goals')
  console.log(' - 1 budget (August 2026) with 10 category allocations')
  console.log(` - ${allTx.length} transactions (Aug + July)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
