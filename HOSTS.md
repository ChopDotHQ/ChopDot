# ChopDot Portable Host Registry

## Purpose

ChopDot has one portable product shell. Web, Telegram, and future mini-app
environments are host profiles, not separate products.

This file defines what must stay common across every host and what is allowed
to vary per host.

## Core Experience Contract

Every host SHALL preserve the same normal group-money journey:

```text
first run
-> guest/profile setup
-> create group
-> add spend
-> review split
-> settle up
-> send request
-> payer pays or marks paid
-> exact wallet match or receiver confirmation
-> finish group
-> group summary/history
```

Every host SHALL preserve these product truths:

- `open`, `request_sent`, `marked_paid`, and `confirmed` are distinct states.
- Sending a request does not reduce the receiver's net position.
- A payer saying they paid does not reduce the receiver's net position.
- A finalized wallet transfer that exactly matches payer, receiver, amount,
  currency, and chain can confirm that exact payment item directly.
- Manual/external payments still require receiver confirmation.
- Finishing a group saves a readable summary without rewriting money truth.
- Normal UI must not show adapter, protocol, host, native, proof, or state
  machine language.
- Payment request links are portable app URLs. Opening one can show the payer's
  exact request when the local shell already has the matching group state.
- Payment request links may include a compact request summary so a fresh device
  can still show the payer what they owe without inventing shared state.
- A fresh-device payer may share a narrow, expiring paid update back to the
  receiver. The receiver shell applies it only when the local group, payer,
  request id, amount, currency, expiry, and receiver authority all match.
- A returned paid update moves only the matching item to `marked_paid`. The
  receiver still confirms what arrived.
- Every host must preserve the security foundation in `SECURITY_FOUNDATION.md`.
  Host launch data, storage mirrors, and URL packets are inputs, not authority.
- Every future cross-device payment mutation must conform to
  `PAYMENT_INTENT_CONTRACT.md`; a host cannot define its own payment states,
  actor authority, evidence matching, or confirmation rules.

## Host Adapter Boundary

Host-specific code may handle:

- identity hints, such as Telegram first name;
- launch parameters;
- host back button;
- safe-area and viewport behavior;
- host theme colors;
- clipboard/share availability;
- request-link sharing and copy fallbacks;
- local persistence mirrors such as Telegram CloudStorage;
- platform setup docs and proof shims.

Host-specific code must not:

- change payment semantics;
- fork the core journey;
- expose internal host/protocol language to normal users;
- add a host-only dashboard or mode;
- silently confirm payments or close groups;
- make one host the source of product truth.
- claim a payer action on a fresh device has notified the receiver or changed
  the receiver's local group state.
- treat host identity, payment events, wallet events, or URL data as sufficient
  mutation authority outside the payment-intent command boundary.

## Shared Host Capability Contract

The app environment seam exposes host behavior as capabilities:

- `hostId`
- `canShare`
- `canUseClipboard`
- `canUseHostBack`
- `canUseHostStorage`
- `safeAreaMode`
- `launchSource`

Product screens must ask this seam before using share, copy, storage, back
navigation, or launch behavior. They must not check host SDK objects directly.

## Payment Request Link Boundary

Request links carry two layers:

- local route identifiers for the normal same-state app flow;
- a compact request summary for fresh devices.

If local state exists, ChopDot opens the normal payer view and can move the
local split to `marked_paid`, or confirm the exact item after independently
matching a finalized wallet transfer. If local state is missing, ChopDot opens a
standalone payment request that lets the payer mark the request as paid and
share a scoped return link to the receiver. Opening that link does not create a
new group or trust payer-supplied money state: the receiver shell accepts it
only against the exact live local request. It does not create fake sync or fake
confirmation.

## Change Classification

Every portable-shell patch should be classified as one of:

- `core`: affects the product journey or shared state behavior across all hosts;
- `host-adapter`: affects one host's integration, launch, storage, viewport, or
  identity seam;
- `proof`: changes validation harnesses, screenshots, or reports;
- `docs`: updates tracking, setup, or operator instructions.

If a patch mixes `core` and `host-adapter`, the PR/commit must state why that
coupling is unavoidable.

## Current Host Profiles

The machine-readable source lives in `proof/host-matrix.json`.

### Web

Role: baseline portable web shell.

Allowed differences:

- no Telegram APIs;
- localStorage persistence only;
- no host back button;
- browser clipboard/share behavior depends on the browser.

Required proof:

- `npm run proof:web`
- live proof with `PROOF_URL=https://portable-shell-trial.vercel.app`

### Telegram Mini App

Role: first real mini-app sandbox.

Allowed differences:

- Telegram user name can prefill first-run guest setup;
- Telegram BackButton can mirror in-app back behavior;
- Telegram theme params can influence host chrome;
- local state can mirror to Telegram CloudStorage when available;
- safe-area padding must account for Telegram mobile chrome.

Required proof:

- `npm run proof:telegram`
- live proof with `PROOF_URL=https://portable-shell-trial.vercel.app?tgWebAppStartParam=portable-proof`
- manual Telegram client check;
- real phone Telegram check before launch-ready status.

### Dot Host

Role: throwaway Paseo `.dot` host proof for the portable shell.

Allowed differences:

- app may run inside a host iframe;
- app may need the rpc-gateway query parameter for fast deterministic loading;
- storage and clipboard behavior are host-dependent;
- safe-area and bottom action reachability must be proven inside host chrome.

Required proof:

- live proof with `PROOF_URL=https://chopdot-shell-proof.paseo.li/?chainBackend=rpc-gateway PROOF_OUT=proof/portable-shell-dot-host npm run proof:dot-host`
- screenshot packet proving the same core journey inside the hosted iframe.

`npm run proof:dot-host` intentionally fails fast without `PROOF_URL`. A direct
localhost app is not a `.dot` host wrapper and cannot satisfy this proof.
The proof runner writes `report.json` even when a journey assertion fails and
redacts query values from stored URLs.

Current proof:

- domain: `chopdot-shell-proof.dot`
- working gateway: `https://chopdot-shell-proof.paseo.li/?chainBackend=rpc-gateway`
- CLI-printed gateway: `https://chopdot-shell-proof.dot.li`
- source commit: `07936cde23a4de5aa1779c17616897021792a41c`
- deploy tag: `chopdot-portable-capture-truth-07936cd`
- CID: `bafybeigpwh2lbozdsxp6hddiw7f562kylhsxo7s6pltrrqxf47jlcpwhty`
- phase-A storage tx: `0x48263163809fa883fedfdf844ee4912965c3e12c8cdeb4d0cfcc70194d75f0f7`
- storage finalization tx: `0xd3ae1d3351368741a3e15901b78782c996be7c428667e8edb274ee8f2d0af29e`
- contenthash tx: `0xb66490089c0e79f7fbbefba77e3bfd4aaf418ab5d1e50d076468cc27e02f0d17`
- app subname contenthash tx: `0x92f355538b979c599865990fac02f4d08155273b765257b6a7a78e57c2b132be`
- latest complete live report: passed on 2026-07-15 against the capture-truth CID;
- evidence: `proof/portable-shell-dot-host/report.json` plus screenshots `01`
  through `22`.
- capture truth evidence:
  `proof/portable-capture-live-host-proof-2026-07-15.md` proves manual amount
  and reason entry, Review split authority, payer action, receiver
  confirmation, settled summary, and persisted reload on the deployed build.
- late-expense recovery evidence:
  `proof/dot-host-late-expense-2026-07-15.md` and
  `proof/late-expense-live-2026-07-15/` prove Mina can add a forgotten expense
  after a request, send the additional amount, and give Leo one usable payment
  action for the updated total.
- guest payment return evidence:
  `proof/dot-host-guest-payment-return-2026-07-15.md` and
  `proof/guest-payment-return-live-dot/` prove a fresh Leo context can open the
  public hosted link, mark the exact request paid, return a scoped update, and
  leave Mina as the only person who can confirm the matching item.
- Product SDK capability evidence:
  `proof/polkadot-host-capability-live/report.json` reports a real host
  container, identity `needs_login`, and available Statement Store, payment,
  and receipt archive managers.
- Product Account ceremony evidence:
  `proof/product-account-login-boundary-2026-07-14.md` and
  `proof/polkadot-host-capability-live/product-account-login-qr.png` prove the
  live host reaches its real Polkadot Mobile QR prompt. Completion remains
  blocked on a runnable Polkadot Mobile client.
- Official host-simulation evidence:
  `proof/polkadot-host-sim/report.json` proves separate Alice and Bob Product
  Accounts, ciphertext-only shared-session transport, Bob receiving Alice's
  decrypted event, observed-only payment status, and redacted receipt
  submit/retrieval through `@parity/host-api-test-sdk@0.10.0`.
- Five-person stress evidence:
  `proof/polkadot-host-stress/report.json` proves five distinct Product
  Accounts converge on five concurrent encrypted events without retries,
  reject a wrong session secret, deduplicate repeated delivery, isolate three
  concurrent observed-only payments, and retrieve a redacted five-member
  receipt. The test exposed and fixed a shared-channel last-write-wins defect;
  session events are now append-only.
- Five-person real-UI evidence:
  `proof/polkadot-host-real-ui/report.json` and screenshots `01` through `08`
  prove Mina, Leo, Nina, Omar, and Vera operating the normal ChopDot UI from
  five isolated official test hosts. They create a group, split one spend,
  share four payment requests, mark each payer's own share paid, confirm each
  receipt, finish the group, and converge on the same saved summary. The test
  relay transports official signed statements only; it never invokes the
  reducer or mutates product state directly.
- Five-person PAS wallet evidence:
  `proof/polkadot-host-wallet-settlement/report.json`, `report.md`, and
  screenshots `01` through `08` prove Mina, Leo, Nina, Omar, and Casey using
  five separate browser contexts. Each payer taps `Pay Mina`, an automated
  EIP-1193 wallet signs a real 0.01 PAS transfer, ChopDot independently checks
  the finalized public transaction, and only that payer's item clears. Four
  fresh top-up hashes, four payment hashes, before/after balances, and explorer
  links are retained. The wallet harness uses disposable agent keys; this is
  not a manual extension-popup or Polkadot Mobile proof.

Known limitations:

- The CLI printed `dot.li` URL did not resolve this Paseo Next V2 deployment;
  `paseo.li` was the working gateway.
- Plain `paseo.li` initially stalled on local light-client resolution during
  proof. Adding `?chainBackend=rpc-gateway` loaded the app directly and is now
  the canonical proof URL for this throwaway host.
- Direct external payer-link query forwarding and the scoped return link are
  proven through the working `paseo.li` gateway. The return remains an explicit
  share/copy step; automatic cross-device synchronization is not claimed.
- The portable worktree now owns a matching deploy config. Root manifest,
  `app.chopdot-shell-proof.dot`, executable version `0.2.0`, icon, and text
  records published cleanly.
- The host-owned app iframe is cross-origin from its wrapper but currently uses
  `sandbox="allow-scripts allow-same-origin ..."`. Chromium emits a generic
  sandbox warning. Cross-origin isolation prevents the same-origin escape case
  in the observed deployment, but the host sandbox policy remains an external
  configuration boundary to monitor.
- During the focused amount/title frame, automated `.dot` screenshots can show
  a temporary black host-owned area above the app. The form and bottom action
  remain usable, and normal host chrome returns on the review screen. Treat
  this as a host viewport/chrome polish item, not hidden product completion.

## Adding A New Mini-App Host

Before adding code for a new host:

1. Add an entry to `proof/host-matrix.json`.
2. Name the host's identity, back navigation, storage, clipboard/share,
   safe-area, and payment capabilities.
3. State which existing proof profile it extends.
4. Add a proof command or shim before adding host-specific UI behavior.
5. Run the same core journey proof.
6. Map any identity, payment, or evidence capability to the actor and command
   rules in `PAYMENT_INTENT_CONTRACT.md` before enabling it.

Do not add product features solely because a host supports them. A host feature
must reduce friction, increase trust, or preserve the same journey more cleanly.

## Current Open Items

- Real Telegram mobile device proof passed by user-reported manual validation on
  2026-07-07. See `proof/mobile-telegram-step-count.md`.
- Server-side Telegram `initData` validation is not implemented.
- BotFather Main Mini App registration is still manual.
- The Product SDK host bridge now has a local capability probe, explicit
  product-scoped identity request, encrypted Statement Store packet boundary,
  observed-only payment status, and redacted preimage receipt boundary. See
  `plans/2026-07-14-polkadot-hosted-two-person-journey-v1.md`.
- The full bridge boundary passes against Parity's official local Host API Test
  SDK. This is integration proof, not a live-network claim.
- The five-person official host stress passes. It proves the adapter can carry
  concurrent append-only events.
- The five-person real-UI journey now passes against five isolated instances of
  Parity's official Host API Test SDK. It uses only normal ChopDot controls and
  preserves separate mark-paid and receiver-confirmed states.
- The five-person PAS wallet journey now passes against the same official local
  host shape plus the public Polkadot Hub TestNet. It uses normal ChopDot
  controls, four real wallet-signed transfers, direct RPC matching, and closes
  at zero open amount. See `proof/polkadot-host-wallet-settlement/`.
- Statement Store payloads are limited to 512 bytes in the tested SDK. ChopDot
  now chunks, encrypts, signs, reassembles, and validates larger product events
  before applying them.
- The host's Statement Store signing key is distinct from its Product Account
  key in the tested SDK. The local proof binds the first valid statement signer
  to the stable Product Account participant and rejects later signer changes.
  A live host-owned attestation between those identities is still required
  before treating that binding as production-ready.
- Live two-device Statement Store convergence, host PaymentManager exact
  matching, and live redacted receipt retrieval remain unproven until Product Account
  login is completed with a runnable Polkadot Mobile client.
- Building the Polkadot iOS reference host is an optional fallback, not a
  ChopDot requirement. This workstation has Apple Command Line Tools but not
  full Xcode. See
  `proof/polkadot-ios-reference-host-setup-2026-07-14.md`.
