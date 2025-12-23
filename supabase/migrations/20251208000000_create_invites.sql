-- Invites table for cross-user pots
-- Stores outbound invitations so members can be added across accounts/devices.

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references public.pots(id) on delete cascade,
  invitee_email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  token uuid not null default gen_random_uuid(),
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Clean up any duplicate invites before creating unique index
-- Keep the most recent invite for each pot_id + invitee_email combination
delete from public.invites a
using public.invites b
where a.id < b.id
  and a.pot_id = b.pot_id
  and a.invitee_email = b.invitee_email;

-- Avoid duplicate invites to the same email for the same pot
create unique index if not exists invites_pot_email_idx on public.invites(pot_id, invitee_email);
-- Fast lookup by token for acceptance flow
create unique index if not exists invites_token_idx on public.invites(token);
create index if not exists invites_pot_idx on public.invites(pot_id);
create index if not exists invites_status_idx on public.invites(status);

alter table public.invites enable row level security;

-- Policies: creators or current members of a pot can see/manage invites for that pot.
drop policy if exists "Inviter or members can view invites" on public.invites;
create policy "Inviter or members can view invites"
on public.invites
for select
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.pot_members pm
    where pm.pot_id = invites.pot_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
  )
);

drop policy if exists "Inviter or members can insert invites" on public.invites;
create policy "Inviter or members can insert invites"
on public.invites
for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.pot_members pm
    where pm.pot_id = invites.pot_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
  )
);

drop policy if exists "Inviter or members can update invites" on public.invites;
create policy "Inviter or members can update invites"
on public.invites
for update
using (
  created_by = auth.uid()
  and exists (
    select 1 from public.pot_members pm
    where pm.pot_id = invites.pot_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
  )
);

drop policy if exists "Inviter or members can delete invites" on public.invites;
create policy "Inviter or members can delete invites"
on public.invites
for delete
using (
  created_by = auth.uid()
  and exists (
    select 1 from public.pot_members pm
    where pm.pot_id = invites.pot_id
      and pm.user_id = auth.uid()
      and pm.status = 'active'
  )
);

comment on table public.invites is 'Pending/accepted invites for pots; used to add cross-user members';
