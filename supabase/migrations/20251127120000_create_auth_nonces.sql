-- Create table to store short-lived nonces for wallet auth
create table if not exists public.auth_nonces (
  address text primary key,
  nonce text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Index to prune/lookup expired entries
create index if not exists auth_nonces_expires_at_idx on public.auth_nonces (expires_at);

comment on table public.auth_nonces is 'Short-lived nonces for wallet signature verification.';
