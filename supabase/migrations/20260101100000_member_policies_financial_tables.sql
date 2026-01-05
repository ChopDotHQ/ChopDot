-- Member-based access for financial tables
-- Enables authenticated members to read/write expenses, contributions, settlements, payments.

alter table public.expenses enable row level security;
alter table public.contributions enable row level security;
alter table public.settlements enable row level security;
alter table public.payments enable row level security;

revoke all on table public.expenses from anon;
revoke all on table public.contributions from anon;
revoke all on table public.settlements from anon;
revoke all on table public.payments from anon;

grant select, insert, update, delete on table public.expenses to authenticated;
grant select, insert, update, delete on table public.contributions to authenticated;
grant select, insert, update, delete on table public.settlements to authenticated;
grant select, insert, update, delete on table public.payments to authenticated;

drop policy if exists "Members can read expenses" on public.expenses;
drop policy if exists "Members can insert expenses" on public.expenses;
drop policy if exists "Members can update expenses" on public.expenses;
drop policy if exists "Members can delete expenses" on public.expenses;

create policy "Members can read expenses"
on public.expenses
for select
to authenticated
using (public.can_access_pot(pot_id));

create policy "Members can insert expenses"
on public.expenses
for insert
to authenticated
with check (public.can_access_pot(pot_id));

create policy "Members can update expenses"
on public.expenses
for update
to authenticated
using (public.can_access_pot(pot_id))
with check (public.can_access_pot(pot_id));

create policy "Members can delete expenses"
on public.expenses
for delete
to authenticated
using (public.can_access_pot(pot_id));

drop policy if exists "Members can read contributions" on public.contributions;
drop policy if exists "Members can insert contributions" on public.contributions;
drop policy if exists "Members can update contributions" on public.contributions;
drop policy if exists "Members can delete contributions" on public.contributions;

create policy "Members can read contributions"
on public.contributions
for select
to authenticated
using (
  exists (
    select 1
    from public.expenses e
    where e.id = contributions.expense_id
      and public.can_access_pot(e.pot_id)
  )
);

create policy "Members can insert contributions"
on public.contributions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.expenses e
    where e.id = contributions.expense_id
      and public.can_access_pot(e.pot_id)
  )
);

create policy "Members can update contributions"
on public.contributions
for update
to authenticated
using (
  exists (
    select 1
    from public.expenses e
    where e.id = contributions.expense_id
      and public.can_access_pot(e.pot_id)
  )
)
with check (
  exists (
    select 1
    from public.expenses e
    where e.id = contributions.expense_id
      and public.can_access_pot(e.pot_id)
  )
);

create policy "Members can delete contributions"
on public.contributions
for delete
to authenticated
using (
  exists (
    select 1
    from public.expenses e
    where e.id = contributions.expense_id
      and public.can_access_pot(e.pot_id)
  )
);

drop policy if exists "Members can read settlements" on public.settlements;
drop policy if exists "Members can insert settlements" on public.settlements;
drop policy if exists "Members can update settlements" on public.settlements;
drop policy if exists "Members can delete settlements" on public.settlements;

create policy "Members can read settlements"
on public.settlements
for select
to authenticated
using (public.can_access_pot(pot_id));

create policy "Members can insert settlements"
on public.settlements
for insert
to authenticated
with check (public.can_access_pot(pot_id));

create policy "Members can update settlements"
on public.settlements
for update
to authenticated
using (public.can_access_pot(pot_id))
with check (public.can_access_pot(pot_id));

create policy "Members can delete settlements"
on public.settlements
for delete
to authenticated
using (public.can_access_pot(pot_id));

drop policy if exists "Members can read payments" on public.payments;
drop policy if exists "Members can insert payments" on public.payments;
drop policy if exists "Members can update payments" on public.payments;
drop policy if exists "Members can delete payments" on public.payments;

create policy "Members can read payments"
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.settlements s
    where s.id = payments.settlement_id
      and public.can_access_pot(s.pot_id)
  )
);

create policy "Members can insert payments"
on public.payments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.settlements s
    where s.id = payments.settlement_id
      and public.can_access_pot(s.pot_id)
  )
);

create policy "Members can update payments"
on public.payments
for update
to authenticated
using (
  exists (
    select 1
    from public.settlements s
    where s.id = payments.settlement_id
      and public.can_access_pot(s.pot_id)
  )
)
with check (
  exists (
    select 1
    from public.settlements s
    where s.id = payments.settlement_id
      and public.can_access_pot(s.pot_id)
  )
);

create policy "Members can delete payments"
on public.payments
for delete
to authenticated
using (
  exists (
    select 1
    from public.settlements s
    where s.id = payments.settlement_id
      and public.can_access_pot(s.pot_id)
  )
);
