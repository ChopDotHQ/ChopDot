-- Shared pot access: allow active members to read pots without reintroducing recursion.

-- Helper function: returns true if current user is pot creator or active member.
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

-- POTS RLS: allow select if creator or member; updates remain creator-only.
drop policy if exists "Users can read their own pots" on public.pots;
drop policy if exists "Users can read accessible pots" on public.pots;
create policy "Users can read accessible pots"
on public.pots
for select
using (public.can_access_pot(id));

-- Keep update/insert scoped to creator.
drop policy if exists "Users can update their own pots" on public.pots;
create policy "Users can update their own pots"
on public.pots
for update
using (created_by = auth.uid());

-- Allow creators to delete their own pots (was missing; deletes would fail silently in app).
drop policy if exists "Users can delete their own pots" on public.pots;
create policy "Users can delete their own pots"
on public.pots
for delete
using (created_by = auth.uid());

-- POT_MEMBERS RLS: members can read; only creator can manage.
drop policy if exists "Users can read members of their pots" on public.pot_members;
drop policy if exists "Pot creators can add members" on public.pot_members;
drop policy if exists "Pot creators can update members" on public.pot_members;
drop policy if exists "Pot creators can remove members" on public.pot_members;

drop policy if exists "Members can read pot_members" on public.pot_members;
create policy "Members can read pot_members"
on public.pot_members
for select
using (public.can_access_pot(pot_members.pot_id));

drop policy if exists "Pot creators can add members" on public.pot_members;
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

drop policy if exists "Pot creators can update members" on public.pot_members;
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

drop policy if exists "Pot creators can remove members" on public.pot_members;
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
