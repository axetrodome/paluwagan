-- Follow-up fixes for an already-provisioned project:
--   1. Let a verifying organizer's account be deleted without blocking on old contribution rows.
--   2. Tighten contribution visibility to "own contribution only" for members, per the product spec
--      (a member should not see other members' payment records in the same Paluwagan).
-- Safe to run on a fresh project too - it's idempotent alongside 20260101000000_init_schema.sql.

alter table public.contributions
  drop constraint if exists contributions_verified_by_fkey;

alter table public.contributions
  add constraint contributions_verified_by_fkey
  foreign key (verified_by) references auth.users (id) on delete set null;

-- Drop whichever contribution-visibility policy currently exists (older/broader names included).
drop policy if exists "Members view group contributions" on public.contributions;
drop policy if exists "contributions_select" on public.contributions;

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
