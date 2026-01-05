-- Lock down auth_nonces to service_role only

alter table public.auth_nonces enable row level security;

revoke all on table public.auth_nonces from anon;
revoke all on table public.auth_nonces from authenticated;

grant select, insert, update, delete on table public.auth_nonces to service_role;
