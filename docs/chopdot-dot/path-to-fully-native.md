# Path to participant-held native delivery

**Kind:** decision
**Status:** active
**Owner:** product-assurance
**Last reviewed:** 2026-08-24
**Applies to:** chopdot-v1-launch
**Authority:** conditional native architecture path; it cannot claim current implementation, deployment, or user reachability

## Definition

Native means the shared record is signed, encrypted, replayable, and held by
participants. It does not mean every payment, notification, or recovery route
runs on-chain. ChopDot remains usable with manual/external settlement and
without a mandatory recovery kit.

## Gates

1. Exact `MoneyV1` and signed `ChopEventV1` converge under replay.
2. Contact proof, account, wallet, membership, organizer, and receiver authority
   remain separate.
3. Encrypted delivery converges across three accounts after loss, reorder,
   duplicate, offline, and restart.
4. Same-account recovery works after local storage is cleared; lost-account
   recovery requires explicit social re-grant or optional user-held kit.
5. Encrypted Bulletin content is integrity checked and its bounded retention is
   visible; Statement Store loss is expected.
6. Exact external/native payment evidence cannot self-confirm or close a group.
7. Every named mode uses One Chop Core and the production entrypoint.
8. One deterministic CAR is staged, promoted unchanged, reached, transferred,
   and recalled by KGv2 with exact-worktree citations.

## Falsifiers

Stop promotion if a second mutable authority survives, raw reusable secrets
reach storage/URLs/reports, recovery only reuses the same browser, removed users
retain future keys, stage/public bytes differ, chain identity is uncertain, or
an agent/fixture result is substituted for a real-person acceptance result.
