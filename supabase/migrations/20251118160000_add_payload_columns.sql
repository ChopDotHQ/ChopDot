-- Adds flexible metadata columns so the frontend can persist the full
-- Pot / Expense structure while we gradually normalize into Supabase.
-- Run this in Supabase SQL editor before switching VITE_DATA_SOURCE to supabase.

alter table public.pots
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists base_currency text default 'DOT',
  add column if not exists pot_type text default 'expense',
  add column if not exists checkpoint_enabled boolean default true,
  add column if not exists budget_enabled boolean default false,
  add column if not exists budget numeric,
  add column if not exists goal_amount numeric,
  add column if not exists goal_description text,
  add column if not exists last_edit_at timestamptz;

alter table public.expenses
  add column if not exists metadata jsonb default '{}'::jsonb;

alter table public.contributions
  add column if not exists metadata jsonb default '{}'::jsonb;
