-- Fixes Supabase RLS so authenticated users can create pots and persist changes.
-- This is intentionally idempotent (safe to run multiple times).

begin;

-- Ensure RLS is enabled on core tables.
alter table if exists public.users enable row level security;
alter table if exists public.pots enable row level security;
alter table if exists public.pot_members enable row level security;

-- Backfill app-level users rows for existing auth users (needed for FK constraints like pots.created_by -> public.users.id).
insert into public.users (id)
select au.id
from auth.users au
left join public.users u on u.id = au.id
where u.id is null
on conflict (id) do nothing;

-- USERS: allow client to create their own user row (required by SupabaseSource.ensureUserRecord()).
drop policy if exists "Users can insert their own record" on public.users;
create policy "Users can insert their own record"
on public.users
for insert
with check (id = auth.uid());

-- Helper: access check without reintroducing circular RLS recursion.
create or replace function public.can_access_pot(pot_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    exists (
      select 1 from public.pots p
      where p.id = pot_uuid
        and p.created_by = auth.uid()
    )
    or exists (
      select 1 from public.pot_members pm
      where pm.pot_id = pot_uuid
        and pm.user_id = auth.uid()
        and pm.status = 'active'
    );
$$;

revoke all on function public.can_access_pot(uuid) from public;
grant execute on function public.can_access_pot(uuid) to authenticated;

-- POTS: reset policies to a known-good, non-recursive set.
drop policy if exists "Users can read pots they are members of" on public.pots;
drop policy if exists "Users can read their own pots" on public.pots;
drop policy if exists "Users can read accessible pots" on public.pots;
drop policy if exists "Users can create pots" on public.pots;
drop policy if exists "Pot owners can update pots" on public.pots;
drop policy if exists "Users can update their own pots" on public.pots;
drop policy if exists "Users can delete their own pots" on public.pots;

create policy "Users can read accessible pots"
on public.pots
for select
using (public.can_access_pot(id));

create policy "Users can create pots"
on public.pots
for insert
with check (created_by = auth.uid());

create policy "Users can update their own pots"
on public.pots
for update
using (created_by = auth.uid());

create policy "Users can delete their own pots"
on public.pots
for delete
using (created_by = auth.uid());

-- POT_MEMBERS: creator-managed membership, member-readable.
drop policy if exists "Users can read pot members if they are a member" on public.pot_members;
drop policy if exists "Users can read members of their pots" on public.pot_members;
drop policy if exists "Members can read pot_members" on public.pot_members;
drop policy if exists "Pot owners can manage members" on public.pot_members;
drop policy if exists "Pot creators can add members" on public.pot_members;
drop policy if exists "Pot creators can update members" on public.pot_members;
drop policy if exists "Pot creators can remove members" on public.pot_members;

create policy "Members can read pot_members"
on public.pot_members
for select
using (public.can_access_pot(pot_members.pot_id));

create policy "Pot creators can add members"
on public.pot_members
for insert
with check (
  exists (
    select 1 from public.pots p
    where p.id = pot_members.pot_id
      and p.created_by = auth.uid()
  )
);

create policy "Pot creators can update members"
on public.pot_members
for update
using (
  exists (
    select 1 from public.pots p
    where p.id = pot_members.pot_id
      and p.created_by = auth.uid()
  )
);

create policy "Pot creators can remove members"
on public.pot_members
for delete
using (
  exists (
    select 1 from public.pots p
    where p.id = pot_members.pot_id
      and p.created_by = auth.uid()
  )
);

comment on function public.can_access_pot is 'True if auth user created the pot or is an active member (used to gate pot and pot_members RLS).';

commit;

