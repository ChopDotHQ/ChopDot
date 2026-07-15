# Portable Shell Integration Checkpoint

Date: 2026-07-15
Programme: A - portable shell product integration checkpoint
Owner: Codex
Starting commit: `ddd980d59d5b3f07d9e6ec6b943bcd1bb9db3c90`

## Current Truth To Preserve

- The same group-money journey runs on web, Telegram, and the Paseo `.dot` host.
- Payment request, marked-paid, exact wallet match, receiver confirmation, and
  finished-group states retain their existing authority boundaries.
- Late expenses can be added after a request without discarding prior work.
- A fresh payer can open a bounded request and return a scoped paid update;
  only the receiver can confirm a manual/external payment.
- Host, session, security, and payment-intent code remains infrastructure and
  does not leak technical language into the normal product journey.

## Scope

### In

- Inventory and classify the tested filesystem ahead of the starting commit.
- Reconcile the replaced web and Telegram proof sequences.
- Run all applicable local, host-simulated, wallet, live guest-return, and
  production-build checks.
- Stage only intended files and create one integration commit.

### Out

- Receipt OCR, review, or correction.
- D-019.
- Legacy root `SpendCardScreen` work.
- New product features.
- Deployment or live `.dot` redeployment.
- Changes outside this worktree.

## Change Classification

### Intended implementation

- App and domain state: `src/App.tsx`, `src/types.ts`, `src/utils.ts`,
  `src/state/**`.
- Product surfaces: changed files under `src/components/**`, including the new
  `StandalonePayerRequest.tsx`.
- Portable request links and Telegram launch: `src/requestLinks.ts`,
  `src/telegramBootstrap.ts`, `src/main.tsx`, and `index.html`.
- Host/session boundary: `src/environment/**`.
- Wallet settlement boundary: `src/payments/**`.
- Payment-intent service boundary: `src/contracts/**` and
  `server/payment-intents/**`.
- Build and dependency configuration: `.env.example`, `package.json`,
  `package-lock.json`, `playwright.host-sim.config.ts`,
  `playwright.live-dot.config.ts`, and `polkadot-app-deploy.config.ts`.

### Intended tests

- Unit tests beside `src/state`, `src/requestLinks`, `src/environment`,
  `src/payments`, and `server/payment-intents`.
- Browser journeys under `tests/**` for host simulation, five-person stress,
  real UI convergence, PAS wallet settlement, late expense, local guest return,
  and live `.dot` guest return.

### Intended plans and documentation

- `HOSTS.md`, `PORTABLE_SHELL_TRIAL.md`, `SECURITY_FOUNDATION.md`,
  `PAYMENT_INTENT_CONTRACT.md`, and `PAYMENT_INTENT_SERVICE_FOUNDATION.md`.
- Dated bounded plans under `plans/**`, including this checkpoint.
- Host and proof notes under `proof/*.md`.

### Intended proof

- `proof/host-matrix.json`.
- Host capability, host simulation, five-person stress, real UI, wallet
  settlement, late-expense, guest-return, and `.dot` packets under `proof/**`.
- `scripts/run-portable-shell-proof.mjs` and
  `scripts/run-host-capability-proof.mjs`.

### Generated or replaced proof

- Web and Telegram screenshots `10` through `20` from the starting commit are
  replaced by the coherent `10` through `24` sequences. The new sequences add
  late-expense recovery, standalone payer request/return, and the second payer
  before finish and persistence checks.
- The matching web and Telegram `report.json` files are generated read models
  for those 24-step sequences.
- Replaced screenshots remain recoverable from the starting commit; their
  deletions and replacements are staged together.

### Excluded scratch output

- `test-results/` is Playwright scratch output, not durable evidence. It is not
  part of the integration commit and may remain untracked after the checkpoint.

## Invariants

1. Sending a request does not mark money paid or received.
2. A standalone payer update can affect only its exact live local request.
3. A manual/external payer update remains `marked_paid` until receiver
   confirmation.
4. A finalized wallet transfer can confirm only the exact matching payment.
5. No payment action silently closes another share or the group.
6. Host data, URL packets, and storage mirrors are inputs, not authority.
7. Normal product UI does not expose host, protocol, adapter, or proof language.

## Required Proof

- Type-check/lint and production build.
- Security baseline.
- Payment-intent, host-adapter/session, wallet, late-expense, and guest-return
  unit tests.
- Web, Telegram, local host, five-person stress, real UI, PAS wallet, and live
  guest-return browser checks.
- Regenerated coherent web, Telegram, and live `.dot` proof reports.
- Staged diff audit and one integration commit.

## Verification Results

All checks below passed on 2026-07-15 from this worktree:

- `npm run lint`
- `npm run build`
- `npm run security:baseline` - 53 files checked
- `npm run test:payment-intents` - 12 tests
- `npm run test:host-adapter` - 16 tests
- `npm run test:wallet` - 4 tests
- `npm run test:late-expense` - 2 reducer tests and 1 browser journey
- `npm run test:guest-link` - 5 unit tests and 1 two-context browser journey
- `npm run test:guest-link:live-dot` - 1 live two-context `.dot` journey
- `npm run test:host-sim` - 1 encrypted two-person host journey
- `npm run test:host-stress` - 1 concurrent five-person host journey
- `npm run test:host-ui` - 1 five-person real-UI host journey
- `npm run test:host-wallet` - 1 five-person journey with four fresh
  wallet-signed PAS payments
- `npm run proof:web` - 24 screenshots and passing report
- `npm run proof:telegram` - 24 screenshots and passing report
- `PROOF_URL=https://chopdot-shell-proof.paseo.li/?chainBackend=rpc-gateway
  PROOF_OUT=proof/portable-shell-dot-host npm run proof:dot-host` - 22
  screenshots and passing report; no deployment performed
- local and live `npm run proof:host-capabilities` - local remains fail-visible;
  live host reports `needs_login` identity plus available shared-session,
  payment, and receipt managers
- `git diff --check`

Two proof-only defects were found and fixed during verification:

1. Headless mobile Chromium exposed a share API without a real share sheet,
   leaving the standalone proof waiting forever. The proof context now exercises
   the existing copy fallback.
2. The wallet proof retained the prior screen's scroll position during its
   final element screenshot. The capture helper now resets the visible hosted
   frame before recording proof; the regenerated final summary is complete.

The only intentionally excluded path is `test-results/`, which contains
Playwright scratch metadata rather than durable product evidence.

## Documentation Impact

This checkpoint updates portable-shell-local product, host, security, and proof
documentation. It does not update the main ChopDot wiki or ADRs because the
approved scope forbids changes outside `portable-shell-trial`; the integration
commit is the branchable source for any later main-repo documentation sync.
