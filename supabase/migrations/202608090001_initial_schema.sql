-- ═══════════════════════════════════════════════════════════════════════
-- SENLIE BUDGET — ONE-SHOT SUPABASE DATABASE SETUP
-- Senlie Technologies
--
-- Run this ONCE in Supabase Dashboard → SQL Editor → New query → Run.
-- It creates the complete Senlie Budget schema, Auth profile trigger,
-- indexes, RLS policies, and required API grants.
--
-- Runtime data is written directly to Supabase by Senlie Budget.
-- The app polls periodically only to refresh data shown in open tabs.
-- ═══════════════════════════════════════════════════════════════════════

begin;

create extension if not exists pgcrypto;

-- ── updated_at helper ─────────────────────────────────────────────────
create or replace function public.senlie_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Core profile table, linked 1:1 to Supabase Auth ──────────────────
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  "avatarColor" text not null default '#5965F3',
  "currencyCode" text not null default 'DOP',
  "currencySymbol" text not null default 'RD$',
  timezone text not null default 'America/Santo_Domingo',
  "monthStartDay" integer not null default 1 check ("monthStartDay" between 1 and 31),
  "hideBalances" boolean not null default false,
  "paySchedule" text not null default 'biweekly',
  pay_anchor_date date,
  pay_amount double precision,
  language text not null default 'en',
  onboarding_complete boolean not null default false,
  terms_accepted boolean not null default false,
  terms_version text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Profile fields added after the first public release. `alter table` keeps this
-- one-shot file safe for existing Senlie projects as well as new ones.
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists pronouns text;
alter table public.users add column if not exists birth_date date;
alter table public.users add column if not exists walkthrough_completed boolean not null default false;
alter table public.users add column if not exists pay_anchor_date date;

create table if not exists public.accounts (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type text not null,
  currency text not null default 'DOP',
  opening_balance double precision not null default 0,
  current_balance double precision not null default 0,
  institution text,
  color text not null default '#5965F3',
  icon text not null default 'wallet',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  parent_id text,
  name text not null,
  icon text not null default 'tag',
  type text not null default 'expense',
  color text not null default '#5965F3',
  is_system boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.merchants (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  default_category_id text,
  logo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  month integer not null check (month between 1 and 12),
  year integer not null,
  income_target double precision not null default 0,
  rollover_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_user_month_year_key unique (user_id, month, year)
);

create table if not exists public.recurring_rules (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  transaction_type text not null,
  amount double precision not null,
  frequency text not null,
  start_date timestamptz not null,
  next_date timestamptz not null,
  category_id text references public.categories(id) on delete set null,
  account_id text references public.accounts(id) on delete set null,
  merchant_id text,
  merchant_name text,
  description text,
  is_active boolean not null default true,
  is_pay_schedule boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  account_id text not null references public.accounts(id) on delete cascade,
  type text not null,
  amount double precision not null,
  currency text not null default 'DOP',
  merchant_id text,
  merchant_name text,
  category_id text references public.categories(id) on delete set null,
  date timestamptz not null,
  description text,
  notes text,
  status text not null default 'posted',
  recurring_rule_id text references public.recurring_rules(id) on delete set null,
  transfer_group_id text,
  payment_method text,
  tags text,
  exclude_from_budget boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_categories (
  id text primary key default gen_random_uuid()::text,
  budget_id text not null references public.budgets(id) on delete cascade,
  category_id text not null references public.categories(id) on delete cascade,
  allocated_amount double precision not null,
  rollover_amount double precision not null default 0,
  rollover_type text not null default 'monthly',
  constraint budget_categories_budget_category_key unique (budget_id, category_id)
);

create table if not exists public.goals (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  target_amount double precision not null,
  current_amount double precision not null default 0,
  target_date timestamptz,
  account_id text,
  color text not null default '#5965F3',
  icon text not null default 'target',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Useful indexes ───────────────────────────────────────────────────
create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists merchants_user_id_idx on public.merchants(user_id);
create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_account_id_idx on public.transactions(account_id);
create index if not exists transactions_category_id_idx on public.transactions(category_id);
create index if not exists transactions_date_idx on public.transactions(date);
create index if not exists transactions_type_idx on public.transactions(type);
create index if not exists budgets_user_id_idx on public.budgets(user_id);
create index if not exists recurring_rules_user_id_idx on public.recurring_rules(user_id);
create index if not exists recurring_rules_next_date_idx on public.recurring_rules(next_date);
create index if not exists goals_user_id_idx on public.goals(user_id);

-- ── Automatic updated_at ─────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array['users','accounts','categories','merchants','transactions','budgets','recurring_rules','goals']
  loop
    execute format('drop trigger if exists senlie_set_updated_at on public.%I', t);
    execute format(
      'create trigger senlie_set_updated_at before update on public.%I for each row execute function public.senlie_set_updated_at()',
      t
    );
  end loop;
end $$;

-- ── Automatically create public.users after Supabase Auth signup ─────
create or replace function public.senlie_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null then
    return new;
  end if;

  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1), 'Friend')
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.senlie_handle_new_auth_user();

-- Backfill profiles for Auth users that existed before this migration.
insert into public.users (id, email, name)
select
  au.id,
  au.email,
  coalesce(nullif(au.raw_user_meta_data ->> 'name', ''), split_part(au.email, '@', 1), 'Friend')
from auth.users au
where au.email is not null
on conflict (id) do nothing;


-- ── Self-heal a missing profile for the currently authenticated user ───
-- The auth.users trigger above is the primary path. This RPC is a safe
-- fallback for accounts that were created before the trigger existed or
-- while an older Senlie schema was installed. It can only repair the row
-- belonging to auth.uid(); callers cannot choose another user id.
create or replace function public.senlie_ensure_profile()
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  auth_email text;
  auth_name text;
  profile_row public.users;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select
    au.email,
    coalesce(
      nullif(au.raw_user_meta_data ->> 'name', ''),
      split_part(au.email, '@', 1),
      'Friend'
    )
  into auth_email, auth_name
  from auth.users au
  where au.id = current_user_id;

  if auth_email is null then
    raise exception 'Authenticated Senlie user has no email address';
  end if;

  insert into public.users (id, email, name)
  values (current_user_id, auth_email, auth_name)
  on conflict (id) do update
    set email = excluded.email
  returning * into profile_row;

  return profile_row;
end;
$$;

revoke all on function public.senlie_ensure_profile() from public;
revoke all on function public.senlie_ensure_profile() from anon;
grant execute on function public.senlie_ensure_profile() to authenticated;

-- ── Row Level Security ────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.merchants enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_categories enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.goals enable row level security;

-- Drop policy names before recreating them, making this file safe to rerun.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('users','accounts','categories','merchants','transactions','budgets','budget_categories','recurring_rules','goals')
      and policyname like 'senlie_%'
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

create policy senlie_users_select_own on public.users
  for select to authenticated using ((select auth.uid()) = id);
create policy senlie_users_update_own on public.users
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy senlie_accounts_all_own on public.accounts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy senlie_categories_all_own on public.categories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy senlie_merchants_all_own on public.merchants
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy senlie_transactions_all_own on public.transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy senlie_budgets_all_own on public.budgets
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy senlie_budget_categories_all_own on public.budget_categories
  for all to authenticated
  using (
    exists (
      select 1 from public.budgets b
      where b.id = budget_categories.budget_id
        and b.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.budgets b
      where b.id = budget_categories.budget_id
        and b.user_id = (select auth.uid())
    )
  );

create policy senlie_recurring_rules_all_own on public.recurring_rules
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy senlie_goals_all_own on public.goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Raw-SQL-created tables need API privileges as well as RLS policies.
grant usage on schema public to authenticated;
grant select, update on public.users to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.merchants to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update, delete on public.budget_categories to authenticated;
grant select, insert, update, delete on public.recurring_rules to authenticated;
grant select, insert, update, delete on public.goals to authenticated;

-- ── Profile pictures ─────────────────────────────────────────────────
-- Public avatar URLs are intentional: profile pictures are display assets,
-- while financial data remains private behind RLS. Each user can only write
-- inside avatars/<their-auth-uuid>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists senlie_avatars_insert_own on storage.objects;
drop policy if exists senlie_avatars_update_own on storage.objects;
drop policy if exists senlie_avatars_delete_own on storage.objects;

create policy senlie_avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy senlie_avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy senlie_avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;

-- Verification (optional):
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
--   and tablename in ('users','accounts','categories','merchants','transactions','budgets','budget_categories','recurring_rules','goals')
-- order by tablename;
