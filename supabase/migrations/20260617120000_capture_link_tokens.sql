-- Capture link tokens for pay / spend / confirm deep links (P1b)

create table if not exists public.capture_link_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  type text not null check (type in ('pay', 'spend', 'confirm')),
  pot_id text not null references public.pots(id) on delete cascade,
  payload jsonb not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create unique index if not exists capture_link_tokens_token_idx
  on public.capture_link_tokens (token);

create index if not exists capture_link_tokens_pot_idx
  on public.capture_link_tokens (pot_id);

alter table public.capture_link_tokens enable row level security;

-- Pot members can mint links for their pots
create policy capture_link_tokens_insert_member
  on public.capture_link_tokens
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.pots p
      where p.id = pot_id
        and (
          p.created_by = auth.uid()
          or exists (
            select 1
            from jsonb_array_elements(coalesce(p.members, '[]'::jsonb)) as member
            where member->>'id' = auth.uid()::text
          )
        )
    )
  );

-- Anyone authenticated can read unconsumed tokens by token id (opaque lookup)
create policy capture_link_tokens_select_authenticated
  on public.capture_link_tokens
  for select
  to authenticated
  using (true);

-- Consume (update) own pot tokens
create policy capture_link_tokens_update_member
  on public.capture_link_tokens
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.pots p
      where p.id = pot_id
        and (
          p.created_by = auth.uid()
          or exists (
            select 1
            from jsonb_array_elements(coalesce(p.members, '[]'::jsonb)) as member
            where member->>'id' = auth.uid()::text
          )
        )
    )
  )
  with check (true);

grant select, insert, update on public.capture_link_tokens to authenticated;
grant all on public.capture_link_tokens to service_role;
