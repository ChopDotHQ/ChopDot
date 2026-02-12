-- Lock down financial tables (expenses, contributions, settlements, payments)
-- Reason: These tables currently have RLS disabled and anon grants enabled.
-- This migration enables RLS and revokes anon/authenticated access until
-- member-based policies are defined.

alter table public.expenses enable row level security;
alter table public.contributions enable row level security;
alter table public.settlements enable row level security;
alter table public.payments enable row level security;

-- Revoke public access
revoke all on table public.expenses from anon;
revoke all on table public.contributions from anon;
revoke all on table public.settlements from anon;
revoke all on table public.payments from anon;

-- Revoke authenticated access until policies are added
revoke all on table public.expenses from authenticated;
revoke all on table public.contributions from authenticated;
revoke all on table public.settlements from authenticated;
revoke all on table public.payments from authenticated;
