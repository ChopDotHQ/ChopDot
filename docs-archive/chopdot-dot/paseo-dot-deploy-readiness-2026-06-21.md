# Paseo `.dot` Deploy Readiness

Status: `local-preflight-pass-setup-required`
Date: 2026-06-21
Programme: `A static deploy + B host-native readiness`

## Discovery

The latest public signal from the W3S builders says external builders can deploy a static site to the Bulletin Chain with a DotNS address on Paseo now, without waiting for the full Polkadot app/host release.

Official repo evidence supports the shape of that path:

- [`paritytech/polkadot-app-deploy`](https://github.com/paritytech/polkadot-app-deploy) publishes a built static app to a `.dot` name and serves it at `https://<name>.dot.li`.
- Its deployment guide defines an environment as Asset Hub for DotNS, Bulletin Chain for content storage, and an IPFS gateway for serving content.
- The guide says the built-in environment presets include worked examples such as `paseo-next-v2` and that deployed content is content-addressed on Bulletin, then resolved via DotNS.
- [`paritytech/localdot-community`](https://github.com/paritytech/localdot-community) shows a product app using the Paseo Next v2 stack: Asset Hub Next, Bulletin Next, and People Next.

## Inference

Our old statement, "live `.dot` is blocked until the Polkadot app opens," is now too broad.

The updated split is:

| Lane | Current judgment |
| --- | --- |
| Static `.dot` site on Paseo via Bulletin + DotNS | Potentially unblocked; needs a real deploy run with funded signer and DotNS eligibility. |
| Full Polkadot host app features | Still gated by host availability and Product SDK runtime behavior. |
| ChopDot product readiness | Continue locally and in host-sim; do not wait for static deploy to improve the app. |

## Repo Changes

Added `polkadot-app-deploy.config.ts` at repo root so `polkadot-app-deploy` can find a product manifest for `dist-dot-host`.

Added script:

```bash
npm run preflight:dot-host:paseo
npm run deploy:dot-host:paseo
```

The preflight command is non-writing. It builds the dot-host bundle, checks the manifest/icon/bundle shape, checks whether `polkadot-app-deploy` is installed, and writes an operator report under `artifacts/polkadot-native/`.

The deploy command is strict. It builds, runs strict preflight, and only then attempts:

```bash
polkadot-app-deploy ./dist-dot-host ${DOT_DEPLOY_DOMAIN:-chopdotws01.dot} --env paseo-next-v2 --js-merkle
```

Updated live verification to default to the Paseo Bulletin Next IPFS gateway:

```bash
npm run verify:dot-host
```

## Human Boundary

Do not auto-run the live deploy from an agent without explicit signer/funding approval.

Live publish requires:

- `@parity/polkadot-app-deploy` installed, or the default pinned `npx --yes @parity/polkadot-app-deploy@0.11.0` path;
- Node 22+;
- a deploy domain such as `DOT_DEPLOY_DOMAIN=<name>.dot`;
- a signer or logged-in deploy session;
- enough Paseo Asset Hub balance for DotNS fees;
- DotNS registration eligibility / personhood state if the chosen label requires it;
- Bulletin storage authorization for upload accounts.

## Current Preflight Result

Command:

```bash
npm run preflight:dot-host:paseo
```

Result on 2026-06-21:

| Check | Result |
| --- | --- |
| Node version | pass — Node 24.1.0 |
| Domain shape | pass — `chopdotws01.dot` |
| Dot-host bundle | pass — `dist-dot-host` exists, 10.30 MB |
| `index.html` | pass |
| Assets | pass |
| Dev artifacts removed | pass |
| Deploy manifest | pass — points at `./dist-dot-host` |
| Manifest icon | pass — `public/assets/Logos/choptdot_whitebackground.png` |
| `polkadot-app-deploy` available | pass — `polkadot-app-deploy v0.11.0` via pinned `npx` |
| `paseo-next-v2` environment listed | pass |
| Deploy signer session | setup required |

Report:

```text
artifacts/polkadot-native/dot-deploy-preflight-2026-06-21.json
```

## Done For This Slice

- Dot host build remains local and deterministic.
- Product manifest exists.
- Non-writing preflight exists and passes for local bundle/manifest checks.
- Deploy command exists but has not been executed.
- Verification command points at the current Paseo Bulletin Next gateway by default.
- Master plan now separates static `.dot` deploy from full host app readiness.

## Next Gate

Complete signer setup, then run a controlled deploy attempt with a funded test signer:

```bash
npx --yes @parity/polkadot-app-deploy@0.11.0 login
npm run preflight:dot-host:paseo
```

Then:

```bash
DOT_DEPLOY_DOMAIN=<available-name>.dot npm run deploy:dot-host:paseo
```

Record:

- deployed domain;
- root CID;
- deploy stdout/stderr;
- gateway URL;
- `.dot.li` URL;
- screenshot of the loaded app;
- whether the experience is static-only, host-sim, or real host-native.
