-- Financial truth is mutated only by the authenticated backend command layer.
-- Browser clients retain member-scoped reads but cannot bypass payer/receiver
-- checks by writing settlement, payment, or event rows directly.

revoke all on table public.settlements from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.settlements from authenticated;

revoke all on table public.payments from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.payments from authenticated;

revoke all on table public.pot_events from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.pot_events from authenticated;

drop policy if exists "Members can insert settlements" on public.settlements;
drop policy if exists "Members can update settlements" on public.settlements;
drop policy if exists "Members can delete settlements" on public.settlements;

drop policy if exists "Members can insert payments" on public.payments;
drop policy if exists "Members can update payments" on public.payments;
drop policy if exists "Members can delete payments" on public.payments;

drop policy if exists "pot_members_can_insert_events" on public.pot_events;

create or replace function public.prevent_direct_client_pot_status_mutation()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and new.status is distinct from 'active' then
      raise exception 'pot status is backend-managed'
        using errcode = '42501';
    end if;

    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      raise exception 'pot status is backend-managed'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_direct_client_pot_status_mutation() from public;

drop trigger if exists prevent_direct_client_pot_status_mutation on public.pots;
create trigger prevent_direct_client_pot_status_mutation
before insert or update on public.pots
for each row
execute function public.prevent_direct_client_pot_status_mutation();
