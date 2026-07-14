-- Capture link tokens for pay / spend / confirm deep links (P1b)

create table if not exists public.capture_link_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  type text not null check (type in ('pay', 'spend', 'confirm')),
  pot_id uuid not null references public.pots(id) on delete cascade,
  payload jsonb not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists capture_link_tokens_token_idx
  on public.capture_link_tokens (token);

create index if not exists capture_link_tokens_pot_idx
  on public.capture_link_tokens (pot_id);

alter table public.capture_link_tokens enable row level security;

-- Pot creators and active members can mint links for their pots.
create policy capture_link_tokens_insert_member
  on public.capture_link_tokens
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.can_access_pot(pot_id)
  );

-- Capture-link rows are never globally enumerable by authenticated users.
create policy capture_link_tokens_select_member
  on public.capture_link_tokens
  for select
  to authenticated
  using (public.can_access_pot(pot_id));

-- Consumption remains pot-scoped. Payment actor authority is enforced elsewhere.
create policy capture_link_tokens_update_member
  on public.capture_link_tokens
  for update
  to authenticated
  using (public.can_access_pot(pot_id))
  with check (public.can_access_pot(pot_id));

grant select, insert on public.capture_link_tokens to authenticated;
grant update (consumed_at) on public.capture_link_tokens to authenticated;
grant all on public.capture_link_tokens to service_role;
