# ChatGPT Work Factory — Standing Journey Approval Policy

**Status:** active experiment  
**Effective:** 2026-09-14  
**Scope:** remaining registered Experience Workbench journeys from the current journey through the last registered journey in `registry/journeys.json`  
**Current registered tail when activated:** Journey 26 through Journey 28

## Human authorization

Devinson explicitly granted standing approval for the remaining registered journey builds so the factory can test end-to-end autonomous progression without stopping at the repeated human Golden approval gate.

This is **not** blanket approval of whatever the Builder produces.

Standing approval becomes applicable only when all of the following are true for the current journey:

1. the candidate is the live canonical current journey candidate;
2. the newest non-superseded independent `### UX Reviewer — REVIEW RECEIPT` classifies the exact unchanged candidate as `GOLDEN-READY`;
3. all five review lenses are cleared, including direct visual inspection;
4. required journey evidence, caller-reachability requirements, deterministic/browser/layout QA and exact CI/Coverage/Smoke/E2E are green as required by the current factory contract;
5. no newer candidate bytes, `REVISE`, contradictory evidence, authority change or blocker supersedes that receipt;
6. the Supervisor re-fetches and binds the exact candidate head, HTML checksum, Reviewer receipt and evidence immediately before freeze.

When those conditions are satisfied, the standing instruction counts as the required human approval for that exact candidate. The Supervisor may record a derived per-candidate approval record referencing this policy and freeze the reviewed bytes byte-for-byte without asking Devinson again.

## Fail-closed rules

Standing approval does **not** apply to:

- `REVISE` candidates;
- `REVIEWABLE` candidates;
- changed candidate bytes after review;
- missing or ambiguous evidence;
- failed exact-head/resulting-state checks;
- unreviewed scope expansion;
- a journey not present in the registered Experience Workbench roadmap at the time this policy was activated;
- protected branch merges;
- production or Products Devnet deployment;
- spending/funding/signing;
- secrets or credential handling;
- runtime architecture decisions outside the approved journey contract.

Any of those conditions must stop or route to the existing owner/reviewer/human authority instead of treating this policy as consent.

## End condition

The experiment ends automatically when the last journey that was registered when this policy was activated has been frozen and exact-head validated as a Golden, or when Devinson explicitly revokes or changes this standing instruction.

A later-added journey beyond the activation-time registered tail does not inherit this approval automatically.

## Measurement goal

The Factory Observer should compare this autonomous tail against prior cycles, especially:

- `GOLDEN-READY → freeze start` latency;
- approval-related idle time removed;
- revision count and quality-gate behavior;
- unauthorized or stale freeze attempts (target: zero);
- whether journey-to-journey progression completes without human prompting;
- whether the worker roster or authority model drifts while autonomy increases.

The experiment succeeds only if cycle time improves **without** weakening independent review, exact-byte binding, Golden immutability, resulting-state verification or authority boundaries.
