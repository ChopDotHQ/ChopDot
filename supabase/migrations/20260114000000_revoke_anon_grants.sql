-- Revoke anonymous access to sensitive tables.
revoke all on table public.auth_nonces from anon;
revoke all on table public.auth_nonces from authenticated;
revoke all on table public.contributions from anon;
revoke all on table public.expenses from anon;
revoke all on table public.payments from anon;
revoke all on table public.settlements from anon;
