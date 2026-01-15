-- Normalize expenses into dedicated tables with splits and backfill from pot metadata.

alter table public.expenses add column if not exists paid_by uuid;
alter table public.expenses add column if not exists expense_date timestamptz;
alter table public.expenses add column if not exists legacy_id text;

create index if not exists expenses_paid_by_idx on public.expenses(paid_by);
create index if not exists expenses_pot_expense_date_idx on public.expenses(pot_id, expense_date desc);

create table if not exists public.expense_splits (
  id uuid not null default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  member_id uuid not null,
  amount_minor bigint not null,
  created_at timestamptz not null default now(),
  primary key (id)
);

create unique index if not exists expense_splits_expense_member_idx
  on public.expense_splits(expense_id, member_id);
create index if not exists expense_splits_expense_idx
  on public.expense_splits(expense_id);
create index if not exists expense_splits_member_idx
  on public.expense_splits(member_id);

alter table public.expense_splits enable row level security;

revoke all on table public.expense_splits from anon;
grant select, insert, update, delete on table public.expense_splits to authenticated;

drop policy if exists "Members can read expense splits" on public.expense_splits;
drop policy if exists "Members can insert expense splits" on public.expense_splits;
drop policy if exists "Members can update expense splits" on public.expense_splits;
drop policy if exists "Members can delete expense splits" on public.expense_splits;

create policy "Members can read expense splits"
on public.expense_splits
for select
to authenticated
using (
  exists (
    select 1
    from public.expenses e
    where e.id = expense_splits.expense_id
      and public.can_access_pot(e.pot_id)
  )
);

create policy "Members can insert expense splits"
on public.expense_splits
for insert
to authenticated
with check (
  exists (
    select 1
    from public.expenses e
    where e.id = expense_splits.expense_id
      and public.can_access_pot(e.pot_id)
  )
);

create policy "Members can update expense splits"
on public.expense_splits
for update
to authenticated
using (
  exists (
    select 1
    from public.expenses e
    where e.id = expense_splits.expense_id
      and public.can_access_pot(e.pot_id)
  )
)
with check (
  exists (
    select 1
    from public.expenses e
    where e.id = expense_splits.expense_id
      and public.can_access_pot(e.pot_id)
  )
);

create policy "Members can delete expense splits"
on public.expense_splits
for delete
to authenticated
using (
  exists (
    select 1
    from public.expenses e
    where e.id = expense_splits.expense_id
      and public.can_access_pot(e.pot_id)
  )
);

with pot_expenses as (
  select
    p.id as pot_id,
    p.created_by as pot_owner,
    p.base_currency as base_currency,
    jsonb_array_elements(p.metadata->'expenses') as expense
  from public.pots p
  where p.metadata ? 'expenses'
),
normalized as (
  select
    pot_id,
    pot_owner,
    base_currency,
    expense,
    expense->>'id' as legacy_id,
    expense->>'paidBy' as paid_by_raw,
    expense->>'currency' as currency_raw,
    expense->>'memo' as memo_raw,
    expense->>'description' as description_raw,
    expense->>'date' as date_raw,
    expense->>'createdAt' as created_at_raw,
    expense->'split' as split_raw,
    expense->'attestations' as attestations_raw,
    expense->>'hasReceipt' as has_receipt_raw,
    expense->>'receiptUrl' as receipt_url_raw,
    expense->>'amount' as amount_raw
  from pot_expenses
),
prepared as (
  select
    pot_id,
    pot_owner,
    base_currency,
    legacy_id,
    split_raw,
    case
      when paid_by_raw is null or paid_by_raw = '' or paid_by_raw = 'owner' then pot_owner
      when paid_by_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then paid_by_raw::uuid
      else pot_owner
    end as paid_by,
    case
      when amount_raw ~ '^[0-9]+(\\.[0-9]+)?$' then round((amount_raw)::numeric * 100)::bigint
      else null
    end as amount_minor,
    coalesce(nullif(currency_raw, ''), base_currency, 'USD') as currency_code,
    coalesce(nullif(memo_raw, ''), nullif(description_raw, '')) as description,
    case
      when date_raw ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then date_raw::timestamptz
      when created_at_raw ~ '^[0-9]+$' then to_timestamp((created_at_raw)::bigint / 1000.0)
      else now()
    end as expense_date,
    jsonb_strip_nulls(
      jsonb_build_object(
        'split', split_raw,
        'attestations', attestations_raw,
        'hasReceipt', case
          when has_receipt_raw in ('true', '1') then true
          when has_receipt_raw in ('false', '0') then false
          else null
        end,
        'receiptUrl', receipt_url_raw,
        'memo', memo_raw,
        'description', description_raw
      )
    ) as metadata
  from normalized
)
insert into public.expenses (
  id,
  pot_id,
  creator_id,
  paid_by,
  amount_minor,
  currency_code,
  description,
  expense_date,
  legacy_id,
  metadata
)
select
  gen_random_uuid(),
  pot_id,
  pot_owner,
  paid_by,
  amount_minor,
  currency_code,
  description,
  expense_date,
  legacy_id,
  metadata
from prepared
where amount_minor is not null
  and legacy_id is not null
  and not exists (
    select 1
    from public.expenses e
    where e.pot_id = prepared.pot_id
      and e.legacy_id = prepared.legacy_id
  );

insert into public.expense_splits (expense_id, member_id, amount_minor)
select
  e.id as expense_id,
  case
    when split_item->>'memberId' is null or split_item->>'memberId' = '' then p.created_by
    when split_item->>'memberId' = 'owner' then p.created_by
    when split_item->>'memberId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (split_item->>'memberId')::uuid
    else p.created_by
  end as member_id,
  case
    when (split_item->>'amount') ~ '^[0-9]+(\\.[0-9]+)?$' then round((split_item->>'amount')::numeric * 100)::bigint
    else 0
  end as amount_minor
from public.expenses e
join public.pots p on p.id = e.pot_id
join lateral jsonb_array_elements(coalesce(e.metadata->'split', '[]'::jsonb)) split_item on true
where e.legacy_id is not null
  and not exists (
    select 1
    from public.expense_splits s
    where s.expense_id = e.id
      and s.member_id = case
        when split_item->>'memberId' is null or split_item->>'memberId' = '' then p.created_by
        when split_item->>'memberId' = 'owner' then p.created_by
        when split_item->>'memberId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (split_item->>'memberId')::uuid
        else p.created_by
      end
  );

update public.receipts r
set expense_id = e.id::text
from public.expenses e
where e.legacy_id is not null
  and r.expense_id = e.legacy_id;
