# ChopDot.dot programme routing record

**Kind:** decision
**Status:** historical
**Owner:** release-integrator
**Last reviewed:** 2026-08-24
**Applies to:** chopdot-v1-launch
**Authority:** historical native programme context only; the current context manifest, Cockpit, release state, and active plan win

The historical June 2026 programme plan in the canonical checkout is stale and
contains an earlier two-kernel/Supabase direction. It was reviewed as context,
not copied into this release tree.

Current routing is resolved from `product/context-authority.json` at read time;
this historical plan does not freeze or restate the active plan name. The
2026-08-22 plan also remains a historical execution record, not current
authority.

## Product end state

One participant-held ChopDot engine completes Catch -> Management -> Payout ->
History for normal pots, receipt capture, Spend Card, savings circles,
emergency pots, and community funds. Each observed participant state gets one
obvious bounded action; **Scan a receipt** applies only to a Catch state with a
receipt or spend.
Polkadot is a distribution and evidence rail, not product authority.

## Status board

- Programme A: an immutable candidate was built and its bytes uploaded, but a
  live first-use P0 and Home-hierarchy P1 make it ineligible for promotion.
- Programme B: participant-held authority remains the active architectural
  constraint; exact current implementation status belongs to source/tests and
  `docs/release/current-release-state.json`.
- Contact capability: committed historical evidence exists; current integration
  status belongs to the Cockpit and exact source tests.
- Public release: byte-reachable is not user-reachable; promotion, ownership,
  KG knowledge, and real-user proof remain false in the current release record.
