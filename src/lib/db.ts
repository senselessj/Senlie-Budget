// Senlie Budget — Supabase-native data adapter
//
// The app originally used Prisma. This adapter intentionally preserves the
// small Prisma-like API already used by the financial engine/routes while
// executing everything through the authenticated Supabase Data API + RLS.
// There is no Prisma client, DATABASE_URL, db push, generate, or runtime
// database connection to maintain.

import { getServerSupabase } from '@/lib/supabase-server'

type ModelName =
  | 'user'
  | 'account'
  | 'category'
  | 'merchant'
  | 'transaction'
  | 'budget'
  | 'budgetCategory'
  | 'recurringRule'
  | 'goal'

type ModelConfig = {
  table: string
  columns: Record<string, string>
  dates?: string[]
}

const MODELS: Record<ModelName, ModelConfig> = {
  user: {
    table: 'users',
    columns: {
      id: 'id', email: 'email', name: 'name', avatarColor: 'avatarColor', avatarUrl: 'avatar_url', pronouns: 'pronouns', birthDate: 'birth_date', walkthroughCompleted: 'walkthrough_completed',
      currencyCode: 'currencyCode', currencySymbol: 'currencySymbol', timezone: 'timezone',
      monthStartDay: 'monthStartDay', hideBalances: 'hideBalances', paySchedule: 'paySchedule',
      language: 'language', onboardingComplete: 'onboarding_complete', termsAccepted: 'terms_accepted',
      termsVersion: 'terms_version', termsAcceptedAt: 'terms_accepted_at', createdAt: 'created_at', updatedAt: 'updated_at',
    },
    dates: ['birthDate', 'termsAcceptedAt', 'createdAt', 'updatedAt'],
  },
  account: {
    table: 'accounts',
    columns: {
      id: 'id', userId: 'user_id', name: 'name', type: 'type', currency: 'currency',
      openingBalance: 'opening_balance', currentBalance: 'current_balance', institution: 'institution',
      color: 'color', icon: 'icon', isArchived: 'is_archived', createdAt: 'created_at', updatedAt: 'updated_at',
    },
    dates: ['createdAt', 'updatedAt'],
  },
  category: {
    table: 'categories',
    columns: {
      id: 'id', userId: 'user_id', parentId: 'parent_id', name: 'name', icon: 'icon', type: 'type',
      color: 'color', isSystem: 'is_system', sortOrder: 'sort_order', createdAt: 'created_at', updatedAt: 'updated_at',
    },
    dates: ['createdAt', 'updatedAt'],
  },
  merchant: {
    table: 'merchants',
    columns: {
      id: 'id', userId: 'user_id', name: 'name', defaultCategoryId: 'default_category_id', logo: 'logo',
      createdAt: 'created_at', updatedAt: 'updated_at',
    },
    dates: ['createdAt', 'updatedAt'],
  },
  transaction: {
    table: 'transactions',
    columns: {
      id: 'id', userId: 'user_id', accountId: 'account_id', type: 'type', amount: 'amount', currency: 'currency',
      merchantId: 'merchant_id', merchantName: 'merchant_name', categoryId: 'category_id', date: 'date',
      description: 'description', notes: 'notes', status: 'status', recurringRuleId: 'recurring_rule_id',
      transferGroupId: 'transfer_group_id', paymentMethod: 'payment_method', tags: 'tags',
      excludeFromBudget: 'exclude_from_budget', createdAt: 'created_at', updatedAt: 'updated_at',
    },
    dates: ['date', 'createdAt', 'updatedAt'],
  },
  budget: {
    table: 'budgets',
    columns: {
      id: 'id', userId: 'user_id', month: 'month', year: 'year', incomeTarget: 'income_target',
      rolloverEnabled: 'rollover_enabled', createdAt: 'created_at', updatedAt: 'updated_at',
    },
    dates: ['createdAt', 'updatedAt'],
  },
  budgetCategory: {
    table: 'budget_categories',
    columns: {
      id: 'id', budgetId: 'budget_id', categoryId: 'category_id', allocatedAmount: 'allocated_amount',
      rolloverAmount: 'rollover_amount', rolloverType: 'rollover_type',
    },
  },
  recurringRule: {
    table: 'recurring_rules',
    columns: {
      id: 'id', userId: 'user_id', transactionType: 'transaction_type', amount: 'amount', frequency: 'frequency',
      startDate: 'start_date', nextDate: 'next_date', categoryId: 'category_id', accountId: 'account_id',
      merchantId: 'merchant_id', merchantName: 'merchant_name', description: 'description', isActive: 'is_active',
      createdAt: 'created_at', updatedAt: 'updated_at',
    },
    dates: ['startDate', 'nextDate', 'createdAt', 'updatedAt'],
  },
  goal: {
    table: 'goals',
    columns: {
      id: 'id', userId: 'user_id', name: 'name', targetAmount: 'target_amount', currentAmount: 'current_amount',
      targetDate: 'target_date', accountId: 'account_id', color: 'color', icon: 'icon', createdAt: 'created_at', updatedAt: 'updated_at',
    },
    dates: ['targetDate', 'createdAt', 'updatedAt'],
  },
}

function col(model: ModelName, field: string): string {
  return MODELS[model].columns[field] ?? field
}

function toDbValue(value: any): any {
  if (value instanceof Date) return value.toISOString()
  return value
}

function toDbData(model: ModelName, data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    // Arithmetic updates are handled separately in update().
    if (value && typeof value === 'object' && !(value instanceof Date) && ('increment' in value || 'decrement' in value)) continue
    out[col(model, key)] = toDbValue(value)
  }
  return out
}

function fromDbRow(model: ModelName, row: any): any {
  if (!row) return row
  const cfg = MODELS[model]
  const reverse = Object.fromEntries(Object.entries(cfg.columns).map(([camel, db]) => [db, camel]))
  const out: Record<string, any> = {}

  for (const [key, raw] of Object.entries(row)) {
    // Relations returned by Supabase aliases.
    if (key === 'category') {
      out.category = raw ? fromDbRow('category', raw) : null
      continue
    }
    if (key === 'account') {
      out.account = raw ? fromDbRow('account', raw) : null
      continue
    }
    if (key === 'budgetCategories') {
      out.budgetCategories = Array.isArray(raw)
        ? raw.map((v) => fromDbRow('budgetCategory', v))
        : []
      continue
    }

    const camel = reverse[key] ?? key
    let value = raw
    if (cfg.dates?.includes(camel) && typeof raw === 'string') value = new Date(raw)
    out[camel] = value
  }

  // Nested budget-category relation can be present inside each row.
  if (model === 'budgetCategory' && (row as any).category) {
    out.category = fromDbRow('category', (row as any).category)
  }
  return out
}

function selectFor(model: ModelName, include?: any): string {
  if (!include) return '*'
  if (model === 'transaction') {
    const parts = ['*']
    if (include.category) parts.push('category:categories(*)')
    if (include.account) parts.push('account:accounts(*)')
    return parts.join(',')
  }
  if (model === 'recurringRule') {
    const parts = ['*']
    if (include.category) parts.push('category:categories(*)')
    if (include.account) parts.push('account:accounts(*)')
    return parts.join(',')
  }
  if (model === 'budget' && include.budgetCategories) {
    return '*,budgetCategories:budget_categories(*,category:categories(*))'
  }
  return '*'
}

function applyWhere(query: any, model: ModelName, where: Record<string, any> | undefined) {
  if (!where) return { query, postFilters: [] as Array<(row: any) => boolean> }
  const postFilters: Array<(row: any) => boolean> = []

  for (const [field, condition] of Object.entries(where)) {
    if (field === 'OR' && Array.isArray(condition)) {
      // Keep free-text search out of raw PostgREST filter strings so arbitrary
      // merchant text never becomes filter syntax. Filter the user-scoped rows
      // in memory instead (activity is capped to a small ledger window).
      const predicates = condition.map((branch: any) => {
        const [branchField, branchCondition] = Object.entries(branch)[0] as [string, any]
        const needle = String(branchCondition?.contains ?? '').toLowerCase()
        return (row: any) => String(row?.[branchField] ?? '').toLowerCase().includes(needle)
      })
      postFilters.push((row) => predicates.some((p: any) => p(row)))
      continue
    }

    const dbField = col(model, field)
    if (condition && typeof condition === 'object' && !(condition instanceof Date)) {
      if (Array.isArray(condition.in)) query = query.in(dbField, condition.in)
      if (condition.gte !== undefined) query = query.gte(dbField, toDbValue(condition.gte))
      if (condition.lte !== undefined) query = query.lte(dbField, toDbValue(condition.lte))
      if (condition.gt !== undefined) query = query.gt(dbField, toDbValue(condition.gt))
      if (condition.lt !== undefined) query = query.lt(dbField, toDbValue(condition.lt))
      if (condition.contains !== undefined) {
        const needle = String(condition.contains).toLowerCase()
        postFilters.push((row) => String(row?.[field] ?? '').toLowerCase().includes(needle))
      }
    } else if (condition === null) {
      query = query.is(dbField, null)
    } else {
      query = query.eq(dbField, toDbValue(condition))
    }
  }
  return { query, postFilters }
}

function applyOrder(query: any, model: ModelName, orderBy?: Record<string, 'asc' | 'desc'>) {
  if (!orderBy) return query
  const [field, direction] = Object.entries(orderBy)[0] ?? []
  if (!field) return query
  return query.order(col(model, field), { ascending: direction !== 'desc' })
}

function pickSelect(row: any, select?: Record<string, boolean>) {
  if (!row || !select) return row
  const out: Record<string, any> = {}
  for (const [key, enabled] of Object.entries(select)) if (enabled) out[key] = row[key]
  return out
}

function errorMessage(error: any): string {
  if (!error) return 'Unknown Supabase error.'
  return [error.message, error.details, error.hint].filter(Boolean).join(' — ')
}

function modelApi(model: ModelName) {
  const cfg = MODELS[model]

  return {
    async findFirst(args: any = {}) {
      const client = await getServerSupabase()
      let query: any = client.from(cfg.table).select(selectFor(model, args.include))
      const applied = applyWhere(query, model, args.where)
      query = applyOrder(applied.query, model, args.orderBy)
      // If post-filters are needed, retrieve a bounded user-scoped set first.
      if (applied.postFilters.length) {
        const { data, error } = await query.limit(Math.max(args.take ?? 1, 1000))
        if (error) throw new Error(errorMessage(error))
        let rows = (data ?? []).map((r: any) => fromDbRow(model, r))
        for (const filter of applied.postFilters) rows = rows.filter(filter)
        return pickSelect(rows[0] ?? null, args.select)
      }
      const { data, error } = await query.limit(1).maybeSingle()
      if (error) throw new Error(errorMessage(error))
      return pickSelect(fromDbRow(model, data), args.select)
    },

    async findUnique(args: any = {}) {
      return this.findFirst(args)
    },

    async findMany(args: any = {}) {
      const client = await getServerSupabase()
      let query: any = client.from(cfg.table).select(selectFor(model, args.include))
      const applied = applyWhere(query, model, args.where)
      query = applyOrder(applied.query, model, args.orderBy)
      if (!applied.postFilters.length && args.take) query = query.limit(args.take)
      else if (applied.postFilters.length) query = query.limit(Math.max(args.take ?? 200, 1000))
      const { data, error } = await query
      if (error) throw new Error(errorMessage(error))
      let rows = (data ?? []).map((r: any) => fromDbRow(model, r))
      for (const filter of applied.postFilters) rows = rows.filter(filter)
      if (args.take) rows = rows.slice(0, args.take)
      if (args.select) rows = rows.map((r: any) => pickSelect(r, args.select))
      return rows
    },

    async create(args: any) {
      const client = await getServerSupabase()
      const payload = toDbData(model, args.data ?? {})
      const { data, error } = await client
        .from(cfg.table)
        .insert(payload)
        .select(selectFor(model, args.include))
        .single()
      if (error) throw new Error(errorMessage(error))
      return fromDbRow(model, data)
    },

    async update(args: any) {
      const client = await getServerSupabase()
      const data = args.data ?? {}
      const arithmetic = Object.entries(data).filter(([, value]: any) =>
        value && typeof value === 'object' && !(value instanceof Date) && ('increment' in value || 'decrement' in value)
      )

      const payload = toDbData(model, data)
      if (arithmetic.length) {
        // Resolve arithmetic against the latest row. This remains RLS-scoped.
        // Senlie serializes UI mutations, so this is adequate for the current
        // single-user budget workload without needing a privileged DB key.
        let readQuery: any = client.from(cfg.table).select('*')
        const appliedRead = applyWhere(readQuery, model, args.where)
        const { data: currentRaw, error: readError } = await appliedRead.query.limit(1).maybeSingle()
        if (readError) throw new Error(errorMessage(readError))
        if (!currentRaw) throw new Error(`${cfg.table} row not found.`)
        const current = fromDbRow(model, currentRaw)
        for (const [field, operation] of arithmetic as Array<[string, any]>) {
          const base = Number(current[field] ?? 0)
          const delta = operation.increment !== undefined ? Number(operation.increment) : -Number(operation.decrement)
          payload[col(model, field)] = base + delta
        }
      }

      let query: any = client.from(cfg.table).update(payload)
      const applied = applyWhere(query, model, args.where)
      const { data: rows, error } = await applied.query.select(selectFor(model, args.include))
      if (error) throw new Error(errorMessage(error))
      const row = Array.isArray(rows) ? rows[0] : rows
      if (!row) throw new Error(`${cfg.table} row not found or access denied.`)
      return fromDbRow(model, row)
    },

    async delete(args: any) {
      const client = await getServerSupabase()
      let query: any = client.from(cfg.table).delete()
      const applied = applyWhere(query, model, args.where)
      const { data: rows, error } = await applied.query.select('*')
      if (error) throw new Error(errorMessage(error))
      const row = Array.isArray(rows) ? rows[0] : rows
      return fromDbRow(model, row)
    },

    async deleteMany(args: any = {}) {
      const client = await getServerSupabase()
      let query: any = client.from(cfg.table).delete({ count: 'exact' })
      const applied = applyWhere(query, model, args.where)
      const { error, count } = await applied.query
      if (error) throw new Error(errorMessage(error))
      return { count: count ?? 0 }
    },

    async count(args: any = {}) {
      const client = await getServerSupabase()
      let query: any = client.from(cfg.table).select('*', { count: 'exact', head: true })
      const applied = applyWhere(query, model, args.where)
      const { error, count } = await applied.query
      if (error) throw new Error(errorMessage(error))
      return count ?? 0
    },

    async aggregate(args: any = {}) {
      // Only _max is currently used by Senlie (category sort order).
      const client = await getServerSupabase()
      const maxField = Object.keys(args._max ?? {})[0]
      if (!maxField) return { _max: {} }
      let query: any = client.from(cfg.table).select(col(model, maxField))
      const applied = applyWhere(query, model, args.where)
      const { data, error } = await applied.query.order(col(model, maxField), { ascending: false }).limit(1)
      if (error) throw new Error(errorMessage(error))
      const raw = data?.[0]?.[col(model, maxField)] ?? null
      return { _max: { [maxField]: raw } }
    },
  }
}

export const db: any = {
  user: modelApi('user'),
  account: modelApi('account'),
  category: modelApi('category'),
  merchant: modelApi('merchant'),
  transaction: modelApi('transaction'),
  budget: modelApi('budget'),
  budgetCategory: modelApi('budgetCategory'),
  recurringRule: modelApi('recurringRule'),
  goal: modelApi('goal'),
}
