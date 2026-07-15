---
title: W3S Open Source Map 2026 07 07
status: current
owner: Dev
last_reviewed: 2026-07-14
review_frequency: weekly
source_of_truth: false
related_code:
  - scripts/check-chopdot-dot-smoke.mjs
related_docs:
  - docs/superpowers/plans/2026-07-07-chopdot-dot-smoke-lane.md
  - docs/wiki/05-polkadot-native/chopdot-dot-smoke.md
  - docs/wiki/05-polkadot-native/chopdot-dot-overview.md
  - docs/wiki/05-polkadot-native/native-boundaries.md
  - .worktrees/portable-shell-trial/HOSTS.md
tags:
  - context-intake
  - polkadot-native
  - w3s
  - parity
---

# W3S Open Source Map 2026-07-07

This page captures the current Parity W3S open-source discovery as repo evidence. It is not product truth; it routes native research.

## Discovery

The current open-source map makes the static `.dot` path more actionable than earlier ChopDot notes assumed.

Useful current official sources:

- `https://paritytech.github.io/w3s-architecture/open-source-map.html`
- `https://github.com/paritytech/polkadot-app-deploy`
- `https://github.com/paritytech/dotli-community`
- `https://github.com/paritytech/dotli-starter`
- `https://github.com/paritytech/product-sdk`
- `https://github.com/paritytech/w3spay`
- `https://github.com/paritytech/polkadot-ios-community`
- `https://github.com/paritytech/polkadot-android-community`

## What Looks Newly Actionable

- `polkadot-app-deploy` is published as `@parity/polkadot-app-deploy` and can deploy a built static site to Bulletin Chain under a `.dot` name for testnet use.
- The default deploy environment is `paseo-next-v2`; the CLI also exposes a `summit` environment.
- `dotli-community` documents the browser/gateway side for resolving `.dot` names through dotNS and fetching content.
- `dotli-starter` gives a minimal starter path that can be compared with a ChopDot static build.
- `product-sdk` and `host-api-test-sdk` are published packages, but they are not the same proof as a deployed static site.
- `w3spay` is directly relevant to ChopDot's checkout/payment-capture lane, but it is a product pattern/reference first, not a permission to collapse payment into receipt truth.
- The Polkadot iOS and Android reference implementations are now public. They
  include remote signing and hosted `.dot` app support, but both repositories
  explicitly label the apps unaudited prototypes. The iOS repository has no
  published release, and the Android release candidate has no downloadable
  binary asset; source availability is not consumer-store availability.

## ChopDot Inference

The old statement "we can only wait for the Polkadot app" is now too broad.

Better current statement:

> Full host-native ChopDot remains unproven, but a static `.dot.li` smoke deploy looks testable now.

## Next Gate

Run the isolated smoke lane:

```bash
npm run dot:smoke:build
npm run dot:smoke:check
```

## Executed Gate

The controlled testnet deploy was run on 2026-07-07.

- Domain: `chopdot-smoke07.dot`
- Static deploy: passed
- Browser-rendered resolver: `https://chopdot-smoke07.paseo.li`
- Evidence screenshot: `artifacts/chopdot-dot-smoke/2026-07-07/chopdot-smoke07-paseoli-trusted-explicit.png`

This updates the inference:

> Static `.dot` delivery is now proven for a tiny ChopDot page. Full host-native ChopDot remains unproven.

## Portable Shell Gate

The full portable group-money shell was deployed and replayed successfully on
2026-07-14.

- Domain: `chopdot-shell-proof.dot`
- Working gateway: `https://chopdot-shell-proof.paseo.li/?chainBackend=rpc-gateway`
- Core journey: passed from first run through two payments, confirmations,
  closeout, saved summary, and reload persistence
- Evidence: `.worktrees/portable-shell-trial/proof/portable-shell-dot-host/report.json`

This proves portable product delivery inside the current Paseo host. It does
not prove Product Account login, Statement Store shared truth, Bulletin receipt
archive, or Asset Hub payment execution inside ChopDot.
