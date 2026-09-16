# Integrated Product Preview V1 — implementation status

Status: **started**

Human strategy approval: 2026-09-16.

Build branch: `research/integrated-preview-build-v1`.

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

## Current execution order

1. Browser shell + deterministic store.
2. Route all 28 journey contracts into one app.
3. Wire the core continuity scenario.
4. Add reviewer/journey jump + failure injection.
5. Add validation and browser QA.
6. Only after Milestone A is usable, validate the same core through a Polkadot host adapter.
