# ChopDot × Products Devnet Opportunity Matrix

> Operational companion to `RESEARCH-002_PARITY_PRODUCTS_DEVNET_CAPABILITY_CATALOG.md`.

## Decision legend

| Decision | Meaning |
|---|---|
| `ADOPT` | Fits the accepted ChopDot architecture and should be implemented or verified. |
| `ADOPT AS ADAPTER` | Useful behind a narrow interface; the domain must not depend directly on the platform API. |
| `INVESTIGATE` | Potential value, but current capability, product value or security is not proven. |
| `DEFER` | Useful later, not needed for the simplest trustworthy v1. |
| `REJECT FOR V1` | Creates privacy, custody, reliability or complexity costs that outweigh current user value. |

## P0 — current build and verification

| ChopDot capability | Products Devnet primitive | Reference | Decision | Exact next action | Proof required |
|---|---|---|---|---|---|
| App-scoped current-user authority | Product SDK signer + Host + TrUAPI product account | Playground template; dotli | ADOPT AS ADAPTER | Reconcile `productId`, derivation selector and package family; bind explicit provenance. | Real host account/public key observed on Web/Desktop/Mobile; reject path; reload consistency. |
| Native Devnet settlement | Asset Hub + chain-client + tx + signer | Playground; LocalDOT | ADOPT AS ADAPTER | Verify PAS transfer call, sender/receiver derivation, integer base units, finality receipt. | Funded real product account, signed PAS tx, finalized block/hash, exact evidence match, receiver confirmation. |
| Address handling | Product SDK address | Mobile payment UX; Product SDK | ADOPT | Replace ad hoc SS58/H160 parsing and keep public key as identity truth. | Unit vectors across supported prefixes/H160; wrong-network and malformed cases. |
| Host capability detection | Product SDK host / TrUAPI `featureSupported` | dotli; TrUAPI Playground | ADOPT | Centralize capability report and hide unsupported actions. | Named host/version matrix; simulation and real-host result kept separate. |
| Local drafts/cache | Product SDK local-storage / host storage | dotli; Playground | ADOPT AS ADAPTER | Retain local cache but add versioned persistence migration before canonical shape changes. | Reload, corrupted state, blocked storage and migration evidence. |
| Deterministic host E2E | Host API Test SDK | Host test SDK | ADOPT | Keep protocol package family aligned and expand failure-path tests. | CI result plus explicit statement that this is simulation, not real-host proof. |
| `.dot` deployment provenance | `pad` / Playground deploy + DotNS + Bulletin | App deploy; Playground CLI | ADOPT AS ADAPTER | Standardize release record: source commit, build hash, CID, domain, network, tool version. | Reproducible deploy, resolvable CID, host load, rollback instructions. |

## P1 — shared product foundation

| ChopDot capability | Products Devnet primitive | Reference | Decision | Exact next action | Proof required |
|---|---|---|---|---|---|
| Canonical multi-user groups/expenses | ChopDot service + Postgres | Identity backend; Polkadot Hub App | ADOPT | Implement authenticated/idempotent command service and indexed queries. | Transactional integration tests, authorization matrix, concurrency/idempotency proof, two-device reconciliation. |
| Cross-device change notification | Statement Store | LocalDOT; RPS; native chat | ADOPT AS ADAPTER | Send only `{groupId, version/event cursor}` after DB commit; refresh from API. | Duplicate/missed/out-of-order statement tests; DB remains correct without delivery. |
| Durable payment intents | Service/Postgres + chain evidence | Mercado state-machine donor | ADOPT | Persist obligation, intent, attempt, evidence and receiver-confirmation events. | Replay protection, optimistic concurrency, exact asset matching and immutable evidence tests. |
| Encrypted receipt/evidence artifacts | Product SDK cloud-storage / Bulletin | Survey; Mercado; Bulletin SDK | ADOPT AS ADAPTER | Define encrypted envelope, key ownership, size limits, retention and renewal. | Encrypt/decrypt vectors, CID round trip, expiry/renewal and unavailable-Bulletin behavior. |
| Human-readable receive destination | People username or DotNS resolver records | Mobile payments; DotNS UI | INVESTIGATE | Re-resolve at payment time and show recipient/account/network confirmation. | Stale/changed record tests, spoofing tests, real host resolution and explicit user confirmation. |
| Ecosystem discoverability | Browse Publisher + manifest | Browse | DEFER until release gate | Publish ChopDot after accepted v1 proof. | App appears in live registry, manifest/CID correct, host compatibility recorded. |
| Live platform/app catalog | Browse SDK | Browse | ADOPT as tooling | Implement out-of-bundle registry snapshot script. | Timestamped network/genesis/source-version snapshot and diff. |

## P2 — optional differentiation

| Opportunity | Primitive | Reference | Decision | Product question before build |
|---|---|---|---|---|
| Request delivered in native chat | Chat modality + Statement Store | Mobile/Desktop chat | INVESTIGATE | Does it reduce recipient friction compared with a normal deep link without making chat availability a correctness dependency? |
| ChopDot dashboard widget | Desktop widget/background modality | Desktop | DEFER | Is a compact “you owe / owed” widget valuable enough to maintain a second modality? |
| Product deep links / QR payment return | Host navigation + mobile deeplinks | Mobile clients | INVESTIGATE | Can one link open the exact verified obligation without carrying authority in the URL? |
| Personhood-gated groups | Individuality | Individuality/mobile | DEFER | Which real abuse problem requires this, and can optional gating solve it without excluding normal users? |
| Signed close-group proof | Attestation Protocol | Browse certification; Attestation | INVESTIGATE | Who benefits from a public/verifiable claim, and can it avoid personal expense data? |
| Direct encrypted receipt transfer | HOP / handoff service | Triangle JS SDKs | DEFER | Is direct transfer materially better than encrypted Bulletin or normal backend upload? |
| CASH/Coinage settlement | People/Individuality | Mobile; Mercado-like reference assets | INVESTIGATE | Is the exact asset live, transferable and useful to the target user; what are redemption and network constraints? |
| Formal dispute system | Contexts/disputes contract | Mercado; contract developer tools | DEFER | Are ChopDot's initial groups social/friend contexts where lightweight correction is better than formal adjudication? |
| Reliability/reputation | Reputation contract | Contract developer tools | REJECT FOR V1 | Does scoring friends create more harm, gaming and social pressure than value? |
| Escrow/shared group pot | Asset Hub contract via CDM | LocalDOT; Mercado | REJECT FOR V1 | This changes ChopDot into a custody/security product and requires a separate threat, regulatory and audit track. |

## Explicit non-goals

The platform catalog must not be used to justify maximizing the number of Polkadot technologies in ChopDot.

Reject these architecture shortcuts:

```text
Statement Store = database
Bulletin = queryable application ledger
DotNS name = verified recipient forever
submitted tx = confirmed receipt
public contract = appropriate place for expense descriptions
personhood = required account creation
mainnet asset ID = valid Devnet asset
host simulator = real host proof
```

## Platform adapter boundaries

ChopDot should expose narrow domain-facing interfaces:

```ts
interface IdentityAuthority {
  probe(): Promise<CapabilityState>;
  connect(): Promise<AuthenticatedProductIdentity>;
  disconnect(): Promise<void>;
}

interface SettlementRail {
  quote(input: SettlementQuoteInput): Promise<SettlementQuote>;
  execute(input: AuthorizedSettlementInput): Promise<SettlementEvidence>;
  verify(evidence: SettlementEvidence, expectation: SettlementExpectation): Promise<VerificationResult>;
}

interface ChangeSignalTransport {
  publish(signal: GroupVersionSignal): Promise<DeliveryResult>;
  subscribe(handler: (signal: GroupVersionSignal) => void): Promise<Unsubscribe>;
}

interface ArtifactStore {
  put(encrypted: Uint8Array, policy: RetentionPolicy): Promise<ArtifactReference>;
  get(reference: ArtifactReference): Promise<Uint8Array>;
}

interface AppPublisher {
  publish(build: ReleaseBuild, identity: ReleaseIdentity): Promise<DeploymentEvidence>;
}
```

The domain layer must not import Product SDK, TrUAPI, Bulletin, Statement Store or CDM types directly.

## Recommended platform sequence

```text
1. Reconcile true current ChopDot source.
2. Verify Product SDK/TrUAPI package family.
3. Prove product identity on real hosts.
4. Prove native PAS settlement end-to-end.
5. Finish mobile/accessibility quality gate.
6. Build service + Postgres canonical shared truth.
7. Add durable obligations/payment intents.
8. Add optional Statement Store version hints.
9. Define encrypted Bulletin artifact policy.
10. Publish accepted build through DotNS/Browse.
11. Evaluate differentiated host modalities and identity features only from measured user value.
```

## Next research/build slice

`PLATFORM-001 — Capability registry + adapter reconciliation`

Deliverables:

- one runtime capability object for identity, chain, storage, messaging, navigation and payment surfaces;
- source package/version/network metadata;
- graceful unsupported states;
- no SDK types crossing into financial domain logic;
- simulated-host matrix;
- real-host verification checklist;
- comparison against current branch's existing Polkadot adapters before any replacement.