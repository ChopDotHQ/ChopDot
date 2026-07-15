---
title: ChopDot Dot Smoke Lane
status: current
owner: Dev
last_reviewed: 2026-07-15
review_frequency: weekly
source_of_truth: false
related_code:
  - scripts/build-chopdot-dot-smoke.mjs
  - scripts/check-chopdot-dot-smoke.mjs
related_docs:
  - docs/superpowers/plans/2026-07-07-chopdot-dot-smoke-lane.md
  - docs/wiki/05-polkadot-native/chopdot-dot-overview.md
  - docs/wiki/05-polkadot-native/native-boundaries.md
  - docs/wiki/08-context-intake/w3s-open-source-map-2026-07-07.md
tags:
  - polkadot-native
  - dot
  - smoke
---

# ChopDot Dot Smoke Lane

This lane tests whether ChopDot can put a tiny static proof page onto the current Parity `.dot` deployment path.

## Boundary

Passing this lane proves only static delivery readiness. It does not prove full ChopDot product readiness, host-native shared state, Statement Store, Product Account signing, Asset Hub payments, Bulletin receipt archive, or production security.

## Commands

```bash
npm run dot:smoke:build
npm run dot:smoke:check
```

The check command does not deploy by default. To attempt a controlled testnet deploy, provide an explicit domain and opt in:

```bash
CHOPDOT_DOT_SMOKE_DEPLOY=1 CHOPDOT_DOT_SMOKE_DOMAIN=your-name.dot npm run dot:smoke:check
```

## Promotion Rule

Move this from smoke to stronger evidence only after:

- the static page is viewable through `https://<name>.dot.li`;
- the deploy report is saved under `artifacts/chopdot-dot-smoke/`;
- the blocker list says whether the blocker is funding, name ownership, signer session, deploy permission, rendering, or gateway availability;
- normal ChopDot UI remains unchanged and free of `.dot` or protocol language.

## Current Result

As of 2026-07-07, the static smoke lane passed on `paseo-next-v2`.

- Domain: `chopdot-smoke07.dot`
- Working browser path: `https://chopdot-smoke07.paseo.li`
- Final content CID: `bafybeihwgmlxeym6wx6zi7fi7o5oesn7tmbsst32trfabtmjyhopha5tmm`
- DotNS link tx: `0x7d6539a9d2522f310c537c6cb968a9342e6423e37f4d7c34ff77def6153633e5`
- Report: `artifacts/chopdot-dot-smoke/2026-07-07/chopdot-dot-smoke-report.json`
- Screenshot: `artifacts/chopdot-dot-smoke/2026-07-07/chopdot-smoke07-paseoli-trusted-explicit.png`

This is still static delivery evidence only.
