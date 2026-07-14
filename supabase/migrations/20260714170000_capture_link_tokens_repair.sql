-- Converge capture_link_tokens for environments that may already have the
-- defective text pot_id table. Fresh installs receive the corrected source
-- migration first; this migration is intentionally idempotent.

create table if not exists public.capture_link_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  type text not null check (type in ('pay', 'spend', 'confirm')),
  pot_id uuid not null references public.pots(id) on delete cascade,
  payload jsonb not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

do $$
declare
  pot_id_type text;
  malformed_count bigint;
begin
  select c.udt_name
    into pot_id_type
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'capture_link_tokens'
    and c.column_name = 'pot_id';

  if pot_id_type is distinct from 'uuid' then
    select count(*)
      into malformed_count
    from public.capture_link_tokens
    where pot_id::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

    if malformed_count > 0 then
      raise exception using
        errcode = '22023',
        message = format(
          'capture_link_tokens contains %s non-UUID pot_id value(s); repair them explicitly before migration',
          malformed_count
        );
    end if;

    alter table public.capture_link_tokens
      drop constraint if exists capture_link_tokens_pot_id_fkey;

    alter table public.capture_link_tokens
      alter column pot_id type uuid using pot_id::uuid;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.capture_link_tokens'::regclass
      and conname = 'capture_link_tokens_pot_id_fkey'
  ) then
    alter table public.capture_link_tokens
      add constraint capture_link_tokens_pot_id_fkey
      foreign key (pot_id) references public.pots(id) on delete cascade;
  end if;
end
$$;

alter table public.capture_link_tokens
  alter column created_by set default auth.uid();

create unique index if not exists capture_link_tokens_token_idx
  on public.capture_link_tokens (token);

create index if not exists capture_link_tokens_pot_idx
  on public.capture_link_tokens (pot_id);

alter table public.capture_link_tokens enable row level security;

drop policy if exists capture_link_tokens_insert_member
  on public.capture_link_tokens;
drop policy if exists capture_link_tokens_select_authenticated
  on public.capture_link_tokens;
drop policy if exists capture_link_tokens_select_member
  on public.capture_link_tokens;
drop policy if exists capture_link_tokens_update_member
  on public.capture_link_tokens;

create policy capture_link_tokens_insert_member
  on public.capture_link_tokens
  for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.can_access_pot(pot_id)
  );

create policy capture_link_tokens_select_member
  on public.capture_link_tokens
  for select
  to authenticated
  using (public.can_access_pot(pot_id));

create policy capture_link_tokens_update_member
  on public.capture_link_tokens
  for update
  to authenticated
  using (public.can_access_pot(pot_id))
  with check (public.can_access_pot(pot_id));

revoke all on public.capture_link_tokens from anon;
revoke select, insert, update on public.capture_link_tokens from authenticated;
grant select, insert on public.capture_link_tokens to authenticated;
grant update (consumed_at) on public.capture_link_tokens to authenticated;
grant all on public.capture_link_tokens to service_role;

comment on table public.capture_link_tokens is
  'Pot-scoped capture-link records. Token possession is not payment actor authority.';
