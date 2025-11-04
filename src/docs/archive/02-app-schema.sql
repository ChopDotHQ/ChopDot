-- Archived: Supabase app schema for optional server-backed sync
-- Not used in wallet-only, light-client, local-first MVP

-- (Content moved from src/database/init/02-app-schema.sql)

-- App schema (no RLS), crypto-only for now
-- Run this in Supabase SQL editor

create extension if not exists pgcrypto;

-- PROFILES (minimal; username optional)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles disable row level security;

-- WALLET LINKS (all wallets live here)
create table if not exists public.wallet_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chain text not null check (chain in ('polkadot','evm')),
  address text not null,
  provider text not null,          -- 'polkadotjs','subwallet','talisman','nova','metamask', etc.
  verified_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists wallet_links_user_chain_addr_unique
  on public.wallet_links (user_id, chain, lower(address));

create unique index if not exists wallet_links_verified_unique
  on public.wallet_links (lower(address), chain)
  where verified_at is not null;

drop trigger if exists wallet_links_set_updated_at on public.wallet_links;
create trigger wallet_links_set_updated_at
before update on public.wallet_links
for each row execute function public.set_updated_at();

alter table public.wallet_links disable row level security;

-- POTS & MEMBERSHIP
create table if not exists public.pots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  base_currency text not null default 'DOT', -- crypto-only for now
  created_at timestamptz not null default now(),
  archived_at timestamptz null
);

create index if not exists pots_owner_created_idx on public.pots(owner_id, created_at desc);

create table if not exists public.pot_members (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references public.pots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  status text not null default 'active' check (status in ('active','invited')),
  created_at timestamptz not null default now()
);

create unique index if not exists pot_members_unique on public.pot_members(pot_id, user_id);
create index if not exists pot_members_pot_idx on public.pot_members(pot_id);

alter table public.pots disable row level security;
alter table public.pot_members disable row level security;

-- EXPENSES (crypto-only amounts in minor units)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references public.pots(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete set null,
  amount_minor bigint not null,
  currency_code text not null default 'DOT',
  description text null,
  receipt_path text null,
  receipt_thumb_path text null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_pot_created_idx on public.expenses(pot_id, created_at desc);

alter table public.expenses disable row level security;

-- CONTRIBUTIONS (per-member shares for an expense)
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  member_id uuid not null references public.pot_members(id) on delete cascade,
  share_minor bigint not null,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contributions_expense_idx on public.contributions(expense_id);

alter table public.contributions disable row level security;

-- SETTLEMENTS (track on-chain status; avoid heavy explorer polling)
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  pot_id uuid not null references public.pots(id) on delete cascade,
  from_member_id uuid not null references public.pot_members(id) on delete cascade,
  to_member_id uuid not null references public.pot_members(id) on delete cascade,
  amount_minor bigint not null,
  currency code text not null default 'DOT',
  status text not null default 'pending' check (status in ('pending','broadcast','finalised','failed','cancelled')),
  tx_hash text null,
  confirmations integer not null default 0,
  last_checked_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists settlements_pot_created_idx on public.settlements(pot_id, created_at desc);

alter table public.settlements disable row level security;

-- PAYMENTS (optional linkage; non-chain methods can still be recorded)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  method text not null,
  reference text null,
  created_at timestamptz not null default now()
);

create index if not exists payments_settlement_idx on public.payments(settlement_id);

alter table public.payments disable row level security;


