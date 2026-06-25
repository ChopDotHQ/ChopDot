# ChopDot.dot Polkadot Native Build Map

Updated: 2026-06-19

## Evidence And 99% Programme

Migration decisions must follow the audit SSOT:

- [polkadot-native-audit-dossier.md](./polkadot-native-audit-dossier.md)
- [polkadot-native-evidence-ledger.json](./polkadot-native-evidence-ledger.json)
- [polkadot-native-99-scorecard.md](./polkadot-native-99-scorecard.md)

Do not claim fully native production readiness until runtime proof report shows 7/7 host gates passed in the real Polkadot host container.

## Purpose

Build ChopDot.dot as a strongly Polkadot-native product path without turning the experience into a chain demo.

The product promise stays:

```text
Help groups collect intent, track obligations, move through approvals, confirm what happened, and close with a trusted record.
```

The technical direction is:

```text
ChopDot UX
-> Product Account or local signer identity
-> signed ChopDot events
-> shared event transport
-> deterministic ChopDot kernel state
-> receipt archive
-> optional Asset Hub payment evidence
-> optional proof/hash anchor
```

Normal users should only see:

```text
Leo paid
Mina needs to confirm
Nina is delayed
Omar released outside ChopDot
Round can close
Receipt saved
```

## Method

Every Polkadot-native replacement must be described with:

- `Discovery`: what we inspected.
- `Fact`: what is verified.
- `Inference`: what we believe follows, but have not fully proven.
- `Next Step`: the smallest test or build that proves or disproves the inference.

No candidate is allowed to become product truth just because it is Polkadot-native.

## Discovery

### Current Parity/Polkadot Inputs

- Product SDK: https://github.com/paritytech/product-sdk
  - Current README describes a prototype SDK family with packages for chain client, tx lifecycle, signer, contracts, cloud storage, statement store, keys, local storage, host, address, crypto, descriptors, logger, and utilities.
- Playground app template: https://github.com/paritytech/playground-app-template
  - Current README describes a React/Vite app wired to a Polkadot host for app-scoped product-account signing.
- Bulletin Chain: https://github.com/paritytech/polkadot-bulletin-chain
  - Current README describes experimental distributed data storage/retrieval, IPFS access, proof-of-storage guarantees, and configurable retention.
- Statement Store in Polkadot SDK: https://github.com/paritytech/polkadot-sdk/issues/11684
  - Active/closed issue evidence shows local development can be non-trivial; simple dev modes previously did not expose statement RPCs.

### Current ChopDot Inputs

- Data source and Supabase facade:
  - `src/services/data/DataContext.tsx`
  - `src/services/data/sources/SupabaseSource.ts`
  - `src/services/data/sources/SupabasePotSource.ts`
  - `src/services/data/sources/SupabaseExpenseSource.ts`
- Auth/session:
  - `src/contexts/AuthContext.tsx`
  - `src/services/auth/session-manager.ts`
  - `src/services/auth/wallet-login.ts`
  - `supabase/functions/wallet-auth/index.ts`
- Invites:
  - `src/services/InviteService.ts`
  - `supabase/functions/accept-invite/index.ts`
  - `supabase/functions/decline-invite/index.ts`
- Realtime/checkpoints/receipts:
  - `src/services/crdt/realtimeSync.ts`
  - `src/services/crdt/checkpointManager.ts`
  - `src/services/crdt/receiptService.ts`
- Current ChopDot.dot spike:
  - `src/chopdot-dot/polkadotSession.ts`
  - `src/components/screens/ChapterHome.tsx`
  - `tests/e2e/chopdot-dot-native-session.spec.ts`

## Facts

Supabase is not only a pot database in the current app. It currently covers:

| Current job | Current implementation | Product meaning |
| --- | --- | --- |
| Auth/session | Supabase auth plus local/session storage | Know who is using the app |
| Wallet auth | Supabase edge function, nonce, wallet_links, profiles | Map a wallet to a user/session |
| Pot and expense persistence | Supabase `pots`, `pot_members`, `expenses`, `expense_splits` | Keep group records available |
| Membership/access control | Supabase authenticated user id, RLS, membership rows | Decide who can see/change a pot |
| Invites | Supabase invite rows and accept/decline edge functions | Let people join safely |
| Realtime | Supabase postgres changes over `crdt_changes` | Make devices converge |
| Checkpoints | Supabase `crdt_checkpoints` | Recover without replaying everything |
| Receipt metadata | Supabase receipt metadata plus IPFS upload | Find evidence later |
| Backend command functions | Supabase edge functions | Run sensitive state changes |

The current no-Supabase ChopDot.dot spike proves only part of the replacement:

- signed local session events
- Product Account signer adapter seam with demo fallback
- Polkadot raw session signature verification in unit tests
- Product Account host preflight requires distinct signer addresses for different people before a native multi-user claim can pass
- deterministic replay into the ChopDot.dot kernel
- separate-browser-context convergence through a no-Supabase Statement Store-style lab transport
- strict transport preflight now requires signed append, load-back, and deterministic replay of a no-op probe event
- idempotent duplicate access-event handling when multiple devices seed the same signed membership grants at startup
- explicit signed `save_receipt` archive event after native closeout
- Product SDK cloud-storage receipt adapter seam with local fallback
- strict archive preflight now requires host-shaped receipt save, retrieval, and hash match
- Product SDK tx payment-evidence adapter seam with local fallback
- strict payout evidence preflight now requires finalized matching Asset Hub evidence and proves evidence-only replay does not confirm or close
- signed membership grant enforcement for the native savings-circle session path
- Product SDK crypto private-payload sidecars for sensitive payment refs and notes
- signed event replay rejects private sidecar events that also leak direct Asset Hub refs or sensitive exception notes into the shared event log
- signed invitation acceptance can derive membership grants and a private chapter key in the local savings-circle path
- accepted/revoked invitations can be represented as ordered access events on the no-Supabase transport boundary
- claim does not equal confirmation
- finalized payment evidence does not equal receipt confirmation
- duplicate/wrong/unauthorized events are rejected by tests

It does not yet prove:

- real Product SDK host Statement Store sync
- Product Account signing inside a host container
- live Product SDK tx lifecycle observation inside a host/signer context
- real invite delivery, Product SDK host transport, revocation propagation UX, and abuse controls
- Bulletin/cloud-storage archive from the real SDK
- live Bulletin/cloud-storage upload and retrieve inside a Product SDK host
- production readiness

## Inferences

### Product Truth

Signed ChopDot events are the right direction for replacing mutable provider rows as product truth.

Why: the kernel can derive state from actions and preserve the distinction between claim, confirmation, approval, release, and closeout.

Falsifier: if a real shared transport cannot preserve ordering, privacy, dedupe, and recovery well enough for ordinary group use.

### Identity

Product Account signing is the most relevant Polkadot-native identity primitive for ChopDot.dot.

Why: it can scope signing to the app/product and reduce raw wallet ceremony.

Falsifier: if users need Polkadot host setup before they can even join or inspect a savings circle.

### Transport

Statement Store is the highest-value and highest-risk replacement candidate for Supabase realtime.

Why: ChopDot.dot needs signed event sharing more than generic database synchronization.

Falsifier: if local setup, privacy, latency, or retrieval is too brittle for a group-money loop.

### Receipt Archive

Bulletin/cloud-storage is a strong candidate for redacted receipt and snapshot archive.

Why: closeout history is a natural storage/proof use case, and receipts can be hash-addressed.

Falsifier: if retention/renewal semantics are too temporary or confusing for the History promise.

### Payment Evidence

Asset Hub DOT/USDC should remain evidence, not product truth.

Why: chain finality can say a transaction finalized; it cannot say the human recipient agrees the obligation is resolved.

Current proof: `ProductSdkAssetHubEvidenceAdapter` can runtime-load the Product SDK tx boundary or fall back to a local evidence reference. Unit tests prove a finalized reference still leaves a contribution claimed, not confirmed, and `chopdot-dot-asset-hub=host-required` blocks local fallback, missing tx/signer, and failed host submitter paths.

Falsifier: none acceptable. This is a domain boundary.

## Replacement Matrix

The source of truth for the row-level build map is:

```text
docs/chopdot-dot/polkadot-native-replacement-matrix.json
```

The validator is:

```text
scripts/validate-chopdot-dot-native-map.mjs
```

High-level current verdict:

| Area | Polkadot-native candidate | Status | Why |
| --- | --- | --- | --- |
| Auth/session | Product Account signer + local identity fallback | In progress | Adapter seam and raw signature verification exist; host signing not yet proven |
| Wallet identity | Product Account / keys / signed membership grants | In progress | Signed grants and invite-derived access exist locally; host identity missing |
| Pot persistence | Signed event log + deterministic reducer | In progress | Local lab transport proof exists, host transport missing |
| Access control | Signed membership grants + encrypted payloads | In progress | Grant enforcement, encrypted sidecars, and access-event-derived grants exist |
| Invites | Signed invitation object + membership grant | In progress | Invite accept/revoke access events exist; delivery/abuse controls missing |
| Realtime | Statement Store event transport | Highest-priority spike | Local adapter contract proof exists; real Product SDK host adapter missing |
| Checkpoints | Signed snapshots + Bulletin/cloud-storage | After transport | Needs archive/recovery semantics |
| Receipts | Bulletin/cloud-storage + hash-only anchor | In progress | Signed archive event and runtime-loaded Product SDK adapter seam exist; live upload/retrieve pending |
| Payment evidence | Product SDK tx + Asset Hub references | In progress | Adapter seam and invariant tests exist; live host tx proof missing |
| Server commands | Client-signed deterministic commands + optional relay | Deferred | Must not recreate trusted server truth |
| Deployment | Playground/.dot | Deferred | Useful only after the core loop works |

## First Credible Savings-Circle Path

Build this next:

```text
Leo opens savings circle
-> Product Account or host/dev signer signs "Leo marked paid"
-> event envelope is validated locally
-> event is published to shared transport
-> Mina opens from a separate context
-> event is retrieved and replayed
-> Mina sees "Confirm Leo"
-> Mina signs confirmation
-> Leo sees confirmed
-> Omar delay is recorded once
-> payout/release/closeout proceeds
-> redacted receipt is archived
```

Success means:

- no Supabase product truth
- no shared localStorage dependency
- no raw chain/storage language in normal UI
- no payment finality treated as receipt confirmation
- no unauthorized participant actions accepted
- receipt archive excludes sensitive details by default

## Required Build Order

1. **Signer Adapter**
   - `DotSessionSignerAdapter` boundary exists.
   - Current demo signer is the browser/offline fallback.
   - Product SDK signer is runtime-loaded to avoid breaking the normal ChopDot bundle.
   - `chopdot-dot-signer=host-required` blocks demo fallback so IdentityGate cannot accidentally pass without Product Account host signing.
   - Proof so far: signed event replay rejects wrong app/signer/participant, Polkadot raw signatures can verify without demo secrets, the native pot UI surfaces the strict host-gate failure under Developer checks, aggregate host preflight reports Product Account signing separately from other native gates, and Product Account signer addresses must match a valid participant membership grant before IdentityGate can pass.
   - Missing proof: Product Account signing inside the real host container.

2. **Transport Adapter**
   - Split the current `LocalSignedSessionAdapter`.
   - Keep local storage as offline/dev.
   - Keep the local Statement Store-style lab endpoint as the browser proof harness.
   - Add Product SDK host Statement Store adapter as the real Polkadot-native transport candidate.
   - `chopdot-dot-transport=host-required` now blocks local/lab fallback so B2 cannot accidentally pass on Vite middleware.
   - Proof: separate browser contexts converge with no shared localStorage; parallel membership/access seeding is idempotent in the lab harness; the native pot UI surfaces strict host transport failure under Developer checks; aggregate host preflight reports Statement Store separately from signer/archive/proof/payment gates.
   - Missing proof: real Product SDK host Statement Store load/append/subscribe round-trip.

3. **Membership / Privacy**
   - Signed membership grants now exist for the native savings-circle session path.
   - Product SDK crypto private-payload sidecars now exist for sensitive payment refs and notes.
   - Signed invitation acceptance now derives membership grants and a private chapter key in the local savings-circle path.
   - Accepted and revoked invitations now replay as ordered access events through local/Statement Store-style transport adapters.
   - Proof so far: replay accepts valid grants and rejects missing, expired, or revoked grants before applying events; unit tests prove raw payment refs stay out of the signed event and decrypt only through the private payload adapter; invite tests reject expired/revoked/forwarded invites; access-event tests remove grants after revocation.
   - Missing proof: production invite delivery, Product SDK host Statement Store transport, revocation propagation UX, abuse controls, and viewer-scoped decryption on encrypted/shared transport.

4. **Receipt Archive**
   - Add `DotReceiptArchiveAdapter`.
   - Current lab stores a redacted receipt hash/reference as a signed `save_receipt` event.
   - Product SDK cloud-storage adapter seam exists and runtime-loads the SDK to avoid breaking the normal ChopDot bundle.
   - `chopdot-dot-archive=host-required` now blocks local archive fallback so ArchiveGate cannot accidentally pass on `bulletin_lab`.
   - Next proof: Bulletin/cloud-storage stores redacted receipt or encrypted private payload inside a real host/signer context.
   - Proof so far: savings-circle closeout emits `Receipt saved` in replayed Activity; unit tests prove cloud-storage references can pass through the adapter boundary; strict archive mode fails honestly without host storage and surfaces the host-gate failure under Developer checks; aggregate host preflight reports archive readiness separately.
   - Missing proof: live Product SDK cloud-storage/Bulletin upload and retrieve.

5. **Closeout Proof Anchor**
   - Add `DotCloseoutProofAdapter`.
   - Current lab stores a separate signed `anchor_receipt` event after closeout and receipt archive.
   - Hash-only proof remains a lab fallback; it is not legal settlement, custody, or payment truth.
   - `chopdot-dot-closeout=host-required` now blocks hash-only fallback so CloseoutProofGate cannot accidentally pass without host proof.
   - Proof so far: unit tests prove proof anchoring is explicit replayed evidence, strict host proof mode fails honestly without a host submitter, Product SDK-style tx references can pass through the boundary, and aggregate host preflight reports proof-anchor readiness separately under Developer checks.
   - Missing proof: live host proof anchor / tx submission and retrieval in the Polkadot app container.

6. **Asset Hub Evidence**
   - Product SDK tx lifecycle adapter seam exists for optional DOT/USDC references.
   - `chopdot-dot-asset-hub=host-required` now blocks lab fallback so PayoutEvidenceGate cannot accidentally pass without a Product SDK tx path and signer.
   - Proof so far: finalized tx evidence supports a claim but does not confirm receipt; strict host-required mode fails honestly without host tx evidence; aggregate host preflight reports Asset Hub readiness separately from receipt/proof readiness.
   - Missing proof: submit/observe a live Product SDK tx in a host/signer context and keep the UI copy as payment reference, not confirmation.

7. **.dot Deployment**
   - Only after the above user flow is real.
   - Proof: deployed/hosted app can run the same savings-circle convergence test.

## Engineering Judgment

The direction is sound, but the completion bar is much higher than “we removed Supabase from one local route.”

The strongest architecture is:

```text
local-first ChopDot UX
+ signed event truth
+ Polkadot-native identity/transport/archive/proof adapters
+ explicit domain kernel
```

The weak architecture would be:

```text
same app
+ hidden localStorage
+ Polkadot labels
+ no real cross-device transport
```

We should avoid the weak version.

## Next Move

Implement the first two adapter boundaries:

```text
DotSessionSignerAdapter
DotSessionTransportAdapter
```

Then replace the current demo-only local signer and local storage transport with:

```text
Demo signer -> Product SDK signer lab
Local storage -> Statement Store lab
```

The first decisive test remains:

```text
Two separate browser contexts,
no shared localStorage,
same savings circle,
Leo marks paid,
Mina sees it,
Mina confirms,
Leo sees confirmed,
no Supabase.
```

Current result: the local Statement Store-style lab transport passes this browser proof, and strict host-required mode fails honestly instead of using local fallback. The next decisive test is the same flow using Product SDK host Statement Store instead of the local Vite endpoint.

Product Account signer result: the adapter seam is implemented and raw signature verification passes, but host signing is not yet proven. The installed Product SDK host dependency currently exposes a local bundling/import mismatch around `@polkadot-api/json-rpc-provider`, so the host package is loaded only at runtime and guarded behind host preflight.
