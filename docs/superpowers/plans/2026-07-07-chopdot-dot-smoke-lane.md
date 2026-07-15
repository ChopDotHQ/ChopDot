# ChopDot.dot Static Smoke Lane

Date: 2026-07-07
Lane: Programme A static `.dot` smoke
Status: live static deploy passed

## Current Truth To Preserve

- ChopDot product work remains anchored on the normal pot journey and product cockpit.
- Native Polkadot infrastructure must stay invisible in normal user UI.
- A static `.dot` deploy does not prove host-native shared state, Product Account signing, Statement Store, Bulletin receipt archive, Asset Hub payments, or production readiness.

## Scope In

- Capture the current W3S open-source map discovery in repo wiki context.
- Add an isolated static smoke artifact for `.dot` deploy testing.
- Add repeatable scripts for building and checking the smoke artifact.
- Verify Parity deploy tooling is callable from this repo without live publish.

## Scope Out

- No changes to normal ChopDot app routes, UI, product flows, Supabase, wallets, or payment state.
- No live deploy or publish without explicit operator opt-in and a chosen `.dot` test name.
- No claim that ChopDot is fully native or production-ready.

## Requirements

- The smoke lane SHALL build a static site outside the normal app bundle.
- The smoke lane SHALL verify Node version, static artifact presence, and Parity deploy CLI availability.
- The default check SHALL NOT deploy or publish.
- A live deploy SHALL require `CHOPDOT_DOT_SMOKE_DEPLOY=1` and `CHOPDOT_DOT_SMOKE_DOMAIN=<name>.dot`.
- The wiki SHALL distinguish static `.dot` smoke evidence from Programme B native truth.

## Scenarios

### Preflight only

GIVEN the repo has Node 22 or newer
WHEN `npm run dot:smoke:preflight` runs
THEN it builds a static smoke site
AND checks `@parity/polkadot-app-deploy`
AND records a report under `artifacts/chopdot-dot-smoke/`
AND does not attempt live deployment.

### Live deploy opt-in

GIVEN a throwaway `.dot` name is chosen
AND the operator opts in with `CHOPDOT_DOT_SMOKE_DEPLOY=1`
WHEN `npm run dot:smoke:check` runs
THEN the script attempts the controlled testnet deploy
AND records the exact result or blocker.

## Evidence

- `scripts/build-chopdot-dot-smoke.mjs`
- `scripts/check-chopdot-dot-smoke.mjs`
- `docs/wiki/05-polkadot-native/chopdot-dot-smoke.md`
- `docs/wiki/08-context-intake/w3s-open-source-map-2026-07-07.md`
- `artifacts/chopdot-dot-smoke/2026-07-07/chopdot-dot-smoke-report.json`

## Result

- Domain: `chopdot-smoke07.dot`
- Resolver URL tested: `https://chopdot-smoke07.paseo.li`
- Static deploy result: pass
- Final content CID: `bafybeihwgmlxeym6wx6zi7fi7o5oesn7tmbsst32trfabtmjyhopha5tmm`
- DotNS link tx: `0x7d6539a9d2522f310c537c6cb968a9342e6423e37f4d7c34ff77def6153633e5`
- Gateway screenshot: `artifacts/chopdot-dot-smoke/2026-07-07/chopdot-smoke07-paseoli-trusted-explicit.png`

## Follow-Up

The CLI printed `https://chopdot-smoke07.dot.li`, but the official dotli-community README and browser test showed the Paseo resolver at `https://chopdot-smoke07.paseo.li` for the `paseo-next-v2` environment. Treat `.dot.li` vs `paseo.li` as a gateway routing detail to verify before any public demo.
