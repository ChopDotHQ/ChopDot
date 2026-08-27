# Savings circle journey

**Kind:** reference
**Status:** active
**Owner:** product
**Last reviewed:** 2026-08-24
**Applies to:** `chopdot-v1-launch`
**Authority:** scoped journey reference derived from Product Truth, current Cockpit decisions and contracts, ADRs, and exact mode evidence; it cannot set priority or release status
**Sources:** P-006, DC-004, production-entrypoint mode tests

GIVEN accepted order and round rules, WHEN participants contribute and the
recipient confirms payout evidence, THEN the circle advances exactly once.
Delay, default, correction, replacement, exit, recovery, and cycle close remain
explicit. ChopDot does not guarantee payout, lend, debit automatically, or take
custody.

The production workspace derives one next action from the current actor and
the signed circle projection. The organizer sets one exact contribution,
cadence, and complete participant order; every person signs acceptance. A
participant records only their contribution, the round recipient confirms what
arrived, and a delay or missed contribution remains visible. The organizer may
record a handoff only after every due contribution is received or explicitly
missed. The recipient confirms the handoff before the organizer can advance
exactly once. The final round closes to a saved circle record.

Canonical member removal does not silently rewrite the accepted order. The
organizer opens **Manage members**, selects the active member, and waits while
every remaining account safely acknowledges the next group access. Only then
can the organizer finish the canonical removal. ChopDot next asks the
organizer to sign the circle exit, then name an active member whose signed
membership acceptance already exists. The replacement takes the departed
person's exact position and accepts the same rules. An active round keeps prior
contributions and missed-contribution history; if its recipient departed, the
accepted replacement becomes the recipient and can confirm the recorded
handoff. This explicit sequence prevents a departed due participant from
stranding the next round without inventing authority for a new person.
