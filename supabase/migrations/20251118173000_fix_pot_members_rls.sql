-- Fixes recursive RLS policies on pot_members that caused
-- "infinite recursion detected in policy" errors whenever the app
-- queried the pots table.
-- Run this in Supabase (or via supabase db push) before enabling the
-- Supabase data source in the app.

begin;

-- Drop the problematic policies that referenced pot_members from
-- inside pot_members, triggering recursion.
drop policy if exists "Users can read pot members if they are a member" on public.pot_members;
drop policy if exists "Pot owners can manage members" on public.pot_members;

-- Allow owners (pots.created_by) to manage membership rows without
-- referencing pot_members recursively.
create policy "Pot owners can manage members"
  on public.pot_members
  using (
    exists (
      select 1
      from public.pots p
      where p.id = pot_members.pot_id
        and p.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.pots p
      where p.id = pot_members.pot_id
        and p.created_by = auth.uid()
    )
  );

-- Let a user read their own membership row or any rows that belong to
-- pots they created. This keeps RLS enabled without recursion and is
-- enough for the metadata bridge phase where only the owner row exists.
create policy "Users can read pot members if they are a member"
  on public.pot_members
  for select
  using (
    pot_members.user_id = auth.uid()
    or exists (
      select 1
      from public.pots p
      where p.id = pot_members.pot_id
        and p.created_by = auth.uid()
    )
  );

commit;
