-- Migration: shared commitment kernel
-- Adds:
--   1. pot_events table  — typed, append-only commitment history
--   2. pots.status       — lifecycle state column
--   3. settlements.tx_hash comment to document repurposed column

-- ─── 1. pot_events ────────────────────────────────────────────────────────────

create table if not exists "public"."pot_events" (
  "id"         uuid not null default gen_random_uuid(),
  "pot_id"     uuid not null references "public"."pots"("id") on delete cascade,
  -- type: chapter_proposed | leg_marked_paid | leg_confirmed | chapter_closed | commitment_cancelled
  "type"       text not null,
  "actor_id"   uuid not null,
  "meta"       jsonb default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  constraint pot_events_pkey primary key ("id")
);

alter table "public"."pot_events" enable row level security;

-- Members of a pot can read its events
create policy "pot_members_can_read_events"
  on "public"."pot_events"
  for select
  using (
    exists (
      select 1 from "public"."pot_members" pm
      where pm.pot_id = pot_events.pot_id
        and pm.user_id = auth.uid()
        and pm.status = 'active'
    )
  );

-- Members can insert events for their own pots
create policy "pot_members_can_insert_events"
  on "public"."pot_events"
  for insert
  with check (
    exists (
      select 1 from "public"."pot_members" pm
      where pm.pot_id = pot_events.pot_id
        and pm.user_id = auth.uid()
        and pm.status = 'active'
    )
    and actor_id = auth.uid()
  );

create index if not exists pot_events_pot_id_idx on "public"."pot_events" ("pot_id");
create index if not exists pot_events_created_at_idx on "public"."pot_events" ("created_at");

-- ─── 2. pots.status ───────────────────────────────────────────────────────────

alter table "public"."pots"
  add column if not exists "status" text default 'active';

comment on column "public"."pots"."status" is
  'Commitment lifecycle: draft | active | partially_settled | completed | cancelled';

-- ─── 3. settlements.tx_hash documentation ────────────────────────────────────

comment on column "public"."settlements"."tx_hash" is
  'Repurposed from on-chain tx hash. Now stores JSON: { method, reference, paidAt, confirmedAt }';
