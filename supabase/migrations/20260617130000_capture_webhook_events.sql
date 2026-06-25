-- Capture webhook events for Firma L2 idempotency + audit

create table if not exists public.capture_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('firma')),
  delivery_id text not null,
  event_type text not null,
  payload jsonb not null,
  pot_id text,
  chapter_id text,
  leg_id text,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now()
);

create unique index if not exists capture_webhook_events_delivery_idx
  on public.capture_webhook_events (provider, delivery_id);

create index if not exists capture_webhook_events_pot_idx
  on public.capture_webhook_events (pot_id);

alter table public.capture_webhook_events enable row level security;

create policy capture_webhook_events_service_only
  on public.capture_webhook_events
  for all
  to service_role
  using (true)
  with check (true);

grant all on public.capture_webhook_events to service_role;
