# ChopDot public-beta launch worktree

**Kind:** measurement
**Status:** active
**Owner:** release integrator
**Last reviewed:** 2026-08-27
**Applies to:** chopdot-v1-launch
**Authority:** human orientation only; it cannot override product law, Cockpit source, or release evidence

This exact worktree is the governed implementation and release train for the
no-private-backend ChopDot public beta. It grew from an earlier portable-shell
trial, but it now contains source paths for the production entrypoint,
participant-held signed authority, receipt capture, normal pots, Spend Card,
savings circle, emergency pot, community fund, recovery, testnet payment, and
`.dot` release tooling. Source presence is not usability or completion proof;
the current release record remains partial and failed at its live product gate.
The historical `PORTABLE_SHELL_TRIAL.md` is evidence of that earlier scope, not
the current product or release contract.

## Start here

```bash
npm ci
npm run context:validate
npm run product:query -- "next"
npm run product:validate
npm run wiki:validate
npm run dev
```

The exact routing hierarchy is in `product/context-authority.json`. Do not read
the canonical `/Users/devinsonpena/ChopDot` checkout as current source for this
release.

## Product spine

```text
Catch -> Management -> Payout -> History
```

Each observed participant or operator state gets one obvious bounded action;
there is no universal first product action. A participant entering Catch with
a receipt or spend sees **Scan a receipt**. Receipt capture creates a local
draft; reviewed participant-signed actions change shared state. Claimed paid,
cleared, receiver-confirmed, released, and closed states remain distinct.

## Current release status

The prior frozen public candidate is immutable and byte-reachable, but it is
not eligible for promotion after a live guest group-creation blocker and
overloaded empty-Home finding. The current next work is P-035, then the P-013
category-floor gate before P-022 can be accepted. Source must be repaired and a new deterministic candidate must be
frozen; release-tool retries cannot repair product bytes.

Track these separately:

`implemented`, `tested`, `committed`, `pushed`, `candidate_built`, `staged`,
`promoted`, `reachable`, `user_owned`, `user_proven`, `kg_known`.

## Verification

The bounded command order and stop conditions are documented in
`docs/CHOPDOT_LOOP_RUNNER.md`. Common entrypoints:

```bash
npx tsc --noEmit
npm run build
npm run build:dot-host
npm run e2e:dot-host-preview
npm run security:baseline
npm run test:node
npx playwright test
```

Passing local tests is not deployment or user proof. Live evidence must name
the exact commit, tree, build ID, CAR hash, CID, network, owner, URL, and user
journey.
