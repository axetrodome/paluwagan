-- Paluwagan Manager - initial schema, indexes, and Row Level Security policies.
-- Run this once against a fresh Supabase project (SQL Editor, or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- ---------------------------------------------------------------------------
-- paluwagans: a savings group, owned by the organizer who created it
-- ---------------------------------------------------------------------------
create table if not exists public.paluwagans (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  contribution_amount numeric not null check (contribution_amount > 0),
  contribution_frequency text not null default 'monthly'
    check (contribution_frequency in ('weekly', 'biweekly', 'monthly')),
  start_date date not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  organizer_id uuid not null references auth.users (id) on delete cascade,
  -- shareable code used by the "join Paluwagan through invitation" flow
  invitation_code uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists paluwagans_organizer_id_idx on public.paluwagans (organizer_id);

-- ---------------------------------------------------------------------------
-- paluwagan_members: members of a paluwagan, matched by email
-- ---------------------------------------------------------------------------
create table if not exists public.paluwagan_members (
  id bigint generated always as identity primary key,
  paluwagan_id bigint not null references public.paluwagans (id) on delete cascade,
  email text not null,
  display_name text not null,
  phone text,
  role text not null default 'member' check (role in ('organizer', 'member')),
  status text not null default 'active' check (status in ('active', 'pending', 'inactive', 'archived')),
  created_by uuid not null references auth.users (id),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists paluwagan_members_paluwagan_id_idx on public.paluwagan_members (paluwagan_id);
create unique index if not exists paluwagan_members_active_email_unique
  on public.paluwagan_members (paluwagan_id, email)
  where (status = 'active');

-- ---------------------------------------------------------------------------
-- contribution_periods: a collection cycle for a paluwagan
-- ---------------------------------------------------------------------------
create table if not exists public.contribution_periods (
  id bigint generated always as identity primary key,
  paluwagan_id bigint not null references public.paluwagans (id) on delete cascade,
  period_number integer not null check (period_number > 0),
  due_date date not null,
  amount_due numeric not null check (amount_due > 0),
  status text not null default 'open' check (status in ('draft', 'open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contribution_periods_paluwagan_id_idx on public.contribution_periods (paluwagan_id);
create unique index if not exists contribution_periods_paluwagan_period_unique
  on public.contribution_periods (paluwagan_id, period_number);

-- ---------------------------------------------------------------------------
-- contributions: one row per member, per contribution period
-- ---------------------------------------------------------------------------
create table if not exists public.contributions (
  id bigint generated always as identity primary key,
  contribution_period_id bigint not null references public.contribution_periods (id) on delete cascade,
  member_id bigint references public.paluwagan_members (id) on delete cascade,
  amount_paid numeric not null default 0 check (amount_paid >= 0),
  status text not null default 'unpaid'
    check (status in ('unpaid', 'partial', 'submitted', 'paid', 'overdue', 'rejected')),
  notes text,
  paid_at timestamptz,
  proof_path text,
  -- kept if the verifying organizer's account is later deleted
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contributions_period_id_idx on public.contributions (contribution_period_id);
create index if not exists contributions_member_id_idx on public.contributions (member_id);

-- ---------------------------------------------------------------------------
-- payouts: scheduled/completed payouts for each paluwagan
-- ---------------------------------------------------------------------------
create table if not exists public.payouts (
  id bigint generated always as identity primary key,
  paluwagan_id bigint not null references public.paluwagans (id) on delete cascade,
  recipient_member_id bigint not null references public.paluwagan_members (id) on delete cascade,
  payout_position integer not null check (payout_position >= 0),
  scheduled_for date not null,
  amount numeric not null check (amount > 0),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists payouts_paluwagan_id_idx on public.payouts (paluwagan_id);
create index if not exists payouts_recipient_member_id_idx on public.payouts (recipient_member_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, kept out of the public schema so they
-- can't be called directly by clients, only used inside RLS policies).
-- ---------------------------------------------------------------------------
create schema if not exists private;

create or replace function private.is_paluwagan_organizer(target_paluwagan_id bigint)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.paluwagans
    where id = target_paluwagan_id
      and organizer_id = (select auth.uid())
  );
$$;

create or replace function private.is_paluwagan_member(target_paluwagan_id bigint)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.paluwagan_members
    where paluwagan_id = target_paluwagan_id
      and status = 'active'
      and email = lower((select auth.jwt() ->> 'email'))
  );
$$;

revoke execute on function private.is_paluwagan_organizer(bigint) from public, anon, authenticated;
revoke execute on function private.is_paluwagan_member(bigint) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.paluwagans enable row level security;
alter table public.paluwagan_members enable row level security;
alter table public.contribution_periods enable row level security;
alter table public.contributions enable row level security;
alter table public.payouts enable row level security;

-- profiles: users manage only their own profile
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_upsert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- paluwagans: organizer has full access, members can view their groups
create policy "paluwagans_select" on public.paluwagans
  for select to authenticated
  using (
    organizer_id = (select auth.uid())
    or private.is_paluwagan_member(id)
  );

create policy "paluwagans_insert" on public.paluwagans
  for insert to authenticated
  with check (organizer_id = (select auth.uid()));

create policy "paluwagans_update" on public.paluwagans
  for update to authenticated
  using (organizer_id = (select auth.uid()))
  with check (organizer_id = (select auth.uid()));

create policy "paluwagans_delete" on public.paluwagans
  for delete to authenticated
  using (organizer_id = (select auth.uid()));

-- paluwagan_members: organizer manages members, members can see their own membership rows
create policy "paluwagan_members_select" on public.paluwagan_members
  for select to authenticated
  using (
    private.is_paluwagan_organizer(paluwagan_id)
    or email = lower((select auth.jwt() ->> 'email'))
  );

create policy "paluwagan_members_insert" on public.paluwagan_members
  for insert to authenticated
  with check (private.is_paluwagan_organizer(paluwagan_id));

create policy "paluwagan_members_update" on public.paluwagan_members
  for update to authenticated
  using (private.is_paluwagan_organizer(paluwagan_id))
  with check (private.is_paluwagan_organizer(paluwagan_id));

create policy "paluwagan_members_delete" on public.paluwagan_members
  for delete to authenticated
  using (private.is_paluwagan_organizer(paluwagan_id));

-- contribution_periods: organizer manages, members can view
create policy "contribution_periods_select" on public.contribution_periods
  for select to authenticated
  using (
    private.is_paluwagan_organizer(paluwagan_id)
    or private.is_paluwagan_member(paluwagan_id)
  );

create policy "contribution_periods_insert" on public.contribution_periods
  for insert to authenticated
  with check (private.is_paluwagan_organizer(paluwagan_id));

create policy "contribution_periods_update" on public.contribution_periods
  for update to authenticated
  using (private.is_paluwagan_organizer(paluwagan_id))
  with check (private.is_paluwagan_organizer(paluwagan_id));

create policy "contribution_periods_delete" on public.contribution_periods
  for delete to authenticated
  using (private.is_paluwagan_organizer(paluwagan_id));

-- contributions: organizer manages all rows in their paluwagan, a member can
-- see and upload proof only for their own contribution row.
create policy "contributions_select" on public.contributions
  for select to authenticated
  using (
    exists (
      select 1 from public.contribution_periods cp
      where cp.id = contribution_period_id
        and (
          private.is_paluwagan_organizer(cp.paluwagan_id)
          or member_id in (
            select id from public.paluwagan_members
            where paluwagan_id = cp.paluwagan_id
              and email = lower((select auth.jwt() ->> 'email'))
          )
        )
    )
  );

create policy "contributions_insert" on public.contributions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.contribution_periods cp
      where cp.id = contribution_period_id
        and private.is_paluwagan_organizer(cp.paluwagan_id)
    )
  );

create policy "contributions_update" on public.contributions
  for update to authenticated
  using (
    exists (
      select 1 from public.contribution_periods cp
      where cp.id = contribution_period_id
        and (
          private.is_paluwagan_organizer(cp.paluwagan_id)
          or member_id in (
            select id from public.paluwagan_members
            where paluwagan_id = cp.paluwagan_id
              and email = lower((select auth.jwt() ->> 'email'))
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.contribution_periods cp
      where cp.id = contribution_period_id
        and (
          private.is_paluwagan_organizer(cp.paluwagan_id)
          or member_id in (
            select id from public.paluwagan_members
            where paluwagan_id = cp.paluwagan_id
              and email = lower((select auth.jwt() ->> 'email'))
          )
        )
    )
  );

create policy "contributions_delete" on public.contributions
  for delete to authenticated
  using (
    exists (
      select 1 from public.contribution_periods cp
      where cp.id = contribution_period_id
        and private.is_paluwagan_organizer(cp.paluwagan_id)
    )
  );

-- payouts: organizer manages, members can view their own payout rows
create policy "payouts_select" on public.payouts
  for select to authenticated
  using (
    private.is_paluwagan_organizer(paluwagan_id)
    or recipient_member_id in (
      select id from public.paluwagan_members
      where paluwagan_id = payouts.paluwagan_id
        and email = lower((select auth.jwt() ->> 'email'))
    )
  );

create policy "payouts_insert" on public.payouts
  for insert to authenticated
  with check (private.is_paluwagan_organizer(paluwagan_id));

create policy "payouts_update" on public.payouts
  for update to authenticated
  using (private.is_paluwagan_organizer(paluwagan_id))
  with check (private.is_paluwagan_organizer(paluwagan_id));

create policy "payouts_delete" on public.payouts
  for delete to authenticated
  using (private.is_paluwagan_organizer(paluwagan_id));

-- ---------------------------------------------------------------------------
-- Storage: private bucket for uploaded proof-of-payment screenshots.
-- Objects are stored at: paluwagans/{paluwagan_id}/periods/{period_id}/contributions/{contribution_id}/{file}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

create policy "payment_proofs_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (
      private.is_paluwagan_organizer(((storage.foldername(name))[2])::bigint)
      or private.is_paluwagan_member(((storage.foldername(name))[2])::bigint)
    )
  );

create policy "payment_proofs_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (
      private.is_paluwagan_organizer(((storage.foldername(name))[2])::bigint)
      or private.is_paluwagan_member(((storage.foldername(name))[2])::bigint)
    )
  );

create policy "payment_proofs_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (
      private.is_paluwagan_organizer(((storage.foldername(name))[2])::bigint)
      or private.is_paluwagan_member(((storage.foldername(name))[2])::bigint)
    )
  );

create policy "payment_proofs_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (
      private.is_paluwagan_organizer(((storage.foldername(name))[2])::bigint)
      or private.is_paluwagan_member(((storage.foldername(name))[2])::bigint)
    )
  );
