-- Align the migration-owned settlement states with the current Express path.
--
-- Canonical runtime states:
--   pending -> paid -> confirmed
--
-- Legacy states remain accepted so already-persisted history is not rewritten.
-- New application code must use only the canonical runtime states above.

alter table public.settlements
  drop constraint if exists settlements_status_check;

alter table public.settlements
  add constraint settlements_status_check
  check (
    status = any (
      array[
        'pending'::text,
        'paid'::text,
        'confirmed'::text,
        'broadcast'::text,
        'finalised'::text,
        'failed'::text,
        'cancelled'::text
      ]
    )
  ) not valid;

alter table public.settlements
  validate constraint settlements_status_check;

comment on column public.settlements.status is
  'Runtime: pending | paid | confirmed. Legacy history may contain broadcast | finalised | failed | cancelled.';
