# Integrated Product Preview V1 — implementation status

Status: **Milestone A implementation in validation**

Human strategy approval: 2026-09-16.

Implementation branch: `research/integrated-preview-platform-v1`.

The implementation consumes the 28 approved Golden journeys and Phase C1 contracts as read-only product authority. It must not edit Golden HTML, select a concrete spend rail/provider, enable Product Integrator, deploy, sign, spend, or handle secrets.

## Milestone A

One browser entry that behaves like one ChopDot product:

- shared deterministic scenario state across J01–J28;
- normal user mode without journey numbers;
- reviewer mode that exposes journey/state identity;
- guest → account continuity with stable Participant identity;
- expense → review → position → settlement → activity continuity;
- deliberate J28 failure/recovery injection;
- persistence across navigation/reload;
- narrow platform capability adapter with simulated browser behavior only.

## Implemented foundation

The executable preview lives at `prototypes/integrated-product-preview/` and currently includes:

- one app shell and one hash router covering all 28 journey IDs;
- deterministic localStorage state seeded with one group, participants, expenses, payment methods, savings and activity;
- stable guest Participant ID preserved through the demo account-link transition;
- shared state across expense review, position, settlement and activity;
- explicit payment-unknown/offline/stale-restore/identity-link recovery injection through J28 semantics;
- JSON export and local backup checkpoints;
- a narrow platform adapter seam for identity/signing/QR/share/notification capabilities;
- hidden reviewer mode with journey jumping and state inspection;
- deterministic structural validation plus Playwright browser continuity QA at 393×852 and 430×890.

## Current gate

Do not call Milestone A review-ready until the exact implementation head has:

1. integrated-preview deterministic validation green;
2. integrated-preview browser continuity QA green at both canonical mobile viewports;
3. no page/console errors in the preview QA;
4. guest→account Participant continuity proved;
5. expense→review→position continuity proved;
6. settlement unknown→J28→verified result continuity proved;
7. all 28 journey routes rendered from the same persisted product state.

The existing repository CI/Coverage/Smoke/E2E checks remain regression evidence but do not substitute for the preview-specific browser gate.

## Next after Milestone A

Only after Devinson can use and review the browser experience should we validate the same product core through a real/reference Polkadot host adapter. Browser simulation must not be described as live host signing or production behavior.
