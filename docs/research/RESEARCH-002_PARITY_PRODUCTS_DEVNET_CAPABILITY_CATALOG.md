# RESEARCH-002 — Parity Products Devnet Capability Catalog

> Snapshot date: 2026-08-21  
> Scope: the current open Products Devnet application stack, the repositories directly linked from its documentation, the host/client implementations that execute products, and active reference products that demonstrate those capabilities.  
> Purpose: give ChopDot and future coding agents one durable map of what exists, what it is for, where authority lives, and whether ChopDot should adopt it.

## 1. Scope and evidence standard

This is intended to be exhaustive for the **current Products Devnet product/application surface**, not for every repository ever created under the `paritytech` organization.

Included:

- the three-chain Products Devnet contour;
- current product hosts and host protocol;
- current Product SDK packages;
- naming, storage, deployment, discovery, contracts, identity, personhood, payments, messaging and testing tooling;
- official/current reference products and directly relevant active examples;
- adjacent or predecessor repositories when they explain an API family or offer a useful implementation donor.

Excluded unless directly relevant:

- general Polkadot SDK/runtime development unrelated to products;
- archived historical experiments;
- generated E2E fixture repositories;
- private/internal repositories that cannot be independently reviewed;
- a static claim that every app currently published in the live Browse registry has been enumerated. That registry is dynamic and must be queried at run time; see `LIVE_DEVNET_REGISTRY_REFRESH.md`.

Primary sources are current repository READMEs, source code, deployment files, and the current Products Devnet documentation. Most of this stack explicitly describes itself as experimental, reference, proof-of-concept and unaudited. `Available` therefore does not mean `production-safe`.

## 2. Executive model

```text
POLKADOT MOBILE / DESKTOP / DOTLI
self-custodial identity + product account + permissions + signing
                       │
                       │ TrUAPI / Product SDK
                       ▼
CHOPDOT PRODUCT
UI + local drafts/cache + domain commands
        │                 │                  │
        │                 │                  │
        ▼                 ▼                  ▼
ASSET HUB             PEOPLE CHAIN       BULLETIN CHAIN
assets/pools          usernames           authorized storage
PVM contracts         personhood          CIDs / IPFS / Bitswap
DotNS                 Statement Store     retention + renewal
CDM registries        Coinage/CASH
attestations
        │
        ▼
CHOPDOT SERVICE + POSTGRES
canonical shared operational state, authorization,
idempotency, queries and append-only application audit
```

The major architectural conclusion is unchanged:

> Polkadot provides user authority, chain facts, portable naming, decentralized content and specialized communication. It does not replace ChopDot's need for a queryable shared application datastore.

## 3. Maturity labels

| Label | Meaning |
|---|---|
| `CURRENT SURFACE` | Part of the currently documented Products Devnet architecture or host path. |
| `REFERENCE / EXPERIMENTAL` | Active and useful, but explicitly prototype/unaudited or not production hardened. |
| `EXECUTION-BLOCKED` | Contract or SDK seam exists, but a required network, allowance, deployment or host capability is not currently verified. |
| `ADJACENT / DONOR` | Not the canonical current surface, but useful for patterns, migration context or product architecture. |
| `LEGACY / PREDECESSOR` | Superseded family; do not introduce into new ChopDot code unless required for compatibility. |

## 4. Chain and system-service catalog

| Capability | Canonical source | How it works | Authority / data boundary | Maturity | ChopDot decision |
|---|---|---|---|---|---|
| Asset Hub | Polkadot SDK runtime + current Devnet configuration | Native balances/assets, pools, pallet-revive PVM contracts and EVM-compatible calls. Hosts route typed chain access to products. | Chain is canonical for asset balances, transfers, events and contract state. | CURRENT SURFACE | Use for PAS/DOT and verified asset settlement, and only for public contract state that genuinely needs shared enforcement. |
| People / Individuality | `paritytech/individuality-community` plus deployed People contour | Usernames, aliases, personhood state, game/prize flows, person-origin dispatch, Coinage and Statement Store capabilities. | Chain is canonical for personhood/name/status facts; mobile holds private keys. | REFERENCE / EXPERIMENTAL | Read as optional trust/context. Do not make ordinary expense splitting require personhood. |
| Bulletin Chain | `paritytech/polkadot-bulletin-chain` | Authorized writes, automatic chunking, DAG-PB manifests, CID retrieval over IPFS/Bitswap, finite retention and renewals. | Bulletin is canonical for stored bytes while retained, not for relational business state. | CURRENT SURFACE; EXPERIMENTAL | Use only for encrypted receipts, exports, proof bundles or app bundles. Never store plaintext personal expense ledgers by default. |
| Statement Store | People runtime + Product SDK / triangle package | Small signed/encrypted statements, pub/sub and request/response sessions. Delivery can be duplicated, delayed, constrained or unavailable. | Transport signal, not application truth. | CURRENT SURFACE; current ChopDot allowance blocker | Optional wakeup/version hint or tightly scoped peer coordination. Never the ChopDot ledger. |
| Coinage / CASH | Individuality / People runtime | Personhood-related issuance and closed-loop money primitives exposed by runtime/SDK. Reference apps may label test assets as CASH or pUSD. | Chain is canonical for balances/issuance; exact asset registration is network-specific. | EXPERIMENTAL / NETWORK-SPECIFIC | Investigate after core settlement works. Never substitute a similarly named asset without verifying ID, decimals and runtime. |
| Attestations | `paritytech/attestation-protocol` | Permissionless schema registry and immutable/revocable attestations against schemas. Browse also consumes attestations/certification metadata. | Attestation contract is canonical for claims; it does not prove off-chain facts by itself. | REFERENCE / EXPERIMENTAL | Potential future receipt/group-close attestations or verified app badges. Not needed for basic expense truth. |
| Shared system contracts | `paritytech/contract-developer-tools` | `contexts` defines namespaces/operators; `reputation` and `disputes` depend on contexts. | Contract state is public and chain-canonical. | REFERENCE / EXPERIMENTAL | Useful donor for future disputes/reputation, not a v1 dependency. Avoid social credit scores for friends. |

## 5. Host and client catalog

| Surface | Repository | Capabilities | Trust model | ChopDot use |
|---|---|---|---|---|
| TrUAPI | `paritytech/host-rust-core` | Versioned typed host↔product protocol, account management, signing, chain provider, storage, navigation, consent, generated TS client, JS/iOS/Android host runtimes, compatibility diagnosis. | Stable wire IDs are append-only. Host owns consent and signing boundary. Product should normally consume Product SDK rather than raw TrUAPI. | Treat as low-level contract. Use only through Product SDK except for explicit compatibility debugging. |
| Triangle JS SDKs | `paritytech/triangle-js-sdks` | Older/current JS host wrappers, host container, product renderer, product Bulletin adapter, host chat, QuickJS worker sandbox, pooled chain connections, HOP, statement sessions and storage adapters. | Predecessor/compatibility layer around host integrations. | Keep only where inherited host compatibility requires it. New work should converge toward Product SDK + TrUAPI. |
| Polkadot Web / dotli | `paritytech/dotli-community` | Client-side DotNS resolution, smoldot or RPC chain reads, Bulletin/IPFS content fetch, sandboxed per-product origins, app-scoped storage, product accounts, signing relay, chain connections, feature detection, update verification and offline cache. | Not a wallet custodian. The paired Polkadot App signs. Green/orange shields distinguish light-client verification from trusted gateways. | Primary web host target. Exercise capability detection and sandbox-safe behavior here. |
| Polkadot Desktop | `Polkadot-Community-Foundation/polkadot-desktop-community` | DotNS app browser, sandbox permissions, phone signing, chat, contacts sync, widgets/background workers, app install/offline access, RPC/light-client connections. | Desktop does not hold user keys; paired phone approves signing. | Required host verification target. Dashboard/widget modality is a later opportunity, not current v1 scope. |
| Polkadot Android | `Polkadot-Community-Foundation/polkadot-android-community` | Self-custodial keys, username/personhood, chat/media/calls, username/QR/chat payments, auto-conversion, SPA/Chat products, deeplinks, remote signing, sync and backups. | Keys stay in hardware-backed device storage. Product runs sandboxed with permissions. | Key recipient/payer experience target. Test deeplink and mobile-host journeys. |
| Polkadot iOS | `Polkadot-Community-Foundation/polkadot-ios-community` | Same broad superapp surface as Android; secure enclave/Keychain, UIKit/VIPER, CoreData, product sandbox and remote signing. | Keys remain on device; hosts expose capabilities, not secrets. | Key recipient/payer experience target, especially safe areas, signing rejection and return-to-product. |
| Host test SDK | `paritytech/host-api-test-sdk` | Lightweight Playwright host, product iframe, dev accounts, auto-signing, network routing, permission controls, product account mappings, payment behavior and logs. | Simulation only; version family must match product protocol. | Use for deterministic E2E host tests. Never treat it as real-host/real-chain proof. |

## 6. Product SDK catalog

Canonical repository: `paritytech/product-sdk`.

The Product SDK is the high-level application-facing layer. It is currently prototype/reference code and must be version-pinned and integration-tested as a package family.

| Package / area | What it provides | ChopDot use |
|---|---|---|
| `@parity/product-sdk` | Umbrella exports. | Avoid importing everything blindly; prefer narrow packages for bundle and boundary clarity. |
| `chain-client` | Typed multi-chain PAPI client for Asset Hub, Bulletin and other configured chains. | Canonical chain client seam. Use host-routed connections and explicit network presets. |
| `tx` | Transaction preparation, submission, batching and lifecycle/finality watching. | Use for native/asset settlement adapters and exact finality evidence. |
| `signer` | Host and development signer providers; product-account access. | Canonical product-account signing boundary. Validate returned public key against stored provenance. |
| `contracts` | Typed PVM contract queries/transactions and `ContractManager` integration with `cdm.json`. | Use only if ChopDot adds a contract-backed feature. Keep contract calls outside money projection logic. |
| `cloud-storage` | Upload/retrieve content through Bulletin-backed cloud storage. | Candidate for encrypted receipts/exports. Record CID, encryption version, retention and renewal policy. |
| `statement-store` | Publish/subscribe and statement transport. | Optional invalidation/wakeup or tightly scoped coordination; fail closed. |
| `individuality` | Personhood, usernames, games/prizes and person-origin calls. | Optional identity context or anti-abuse gates later. Not required for local profile or group membership. |
| `keys` | Product-account/session-key derivation and sr25519 helpers. | Never derive/store user master keys in ChopDot. Use host product-account results. |
| `local-storage` | Host/browser key-value backend detection. | Local drafts/cache and current shell persistence; add explicit schema migrations before relying on it long-term. |
| `host` | Host detection and host storage helpers. | Capability probing and graceful browser fallback. |
| `address` | SS58/H160 validation, encoding and conversion. | Replace ad hoc address handling; public key is identity truth, formatted address is network presentation. |
| `crypto` | Encryption, derivation and NaCl primitives. | Use only with reviewed envelopes/nonce/key lifecycle. Do not invent crypto protocols in UI code. |
| `descriptors` | PAPI-generated chain descriptors. | Pin compatible descriptors with chain-client/runtime. Runtime mismatch must fail visibly. |
| `logger` | Structured namespaced logging. | Use for redacted diagnostic events; never log sensitive notes, signatures or private payment payloads. |
| `utils` | Encoding and token formatting. | Prefer for display/encoding where semantics match; canonical money still needs integer base/minor units. |
| `auth`, `errors`, `result`, `terminal` and internal support packages | Additional repo packages not all promoted in the top-level public package table. | Treat as implementation/support surfaces until individually documented and proven necessary. |
| Product SDK AI skills | App builder, chain, tx, contracts, storage, Statement Store, Individuality, utilities and migration guidance. | Codex/agents may read them as current API guidance, but generated code still passes ChopDot's guardrails and tests. |

## 7. Naming, deployment and discovery catalog

| Capability | Repository/tool | How it works | ChopDot decision |
|---|---|---|---|
| DotNS protocol | `paritytech/dotns` | ERC-721 name ownership, registry/resolvers, address/text/contenthash/chat-key records, subnames, reverse resolution, public commit-reveal and PoP gateway issuance. | Use the deployed ChopDot `.dot` name as product identity only after resolving exact environment/product ID. Consider optional receive/contact records later; do not treat a name alone as payment authority without current resolution and user confirmation. |
| DotNS client tooling | `paritytech/dotns-sdk` | Canonical parsing, normalization, namehash, ABIs, deployments and composable register/record/reverse flows. | Use instead of hand-rolling name logic when a supported release matches the target network. |
| `pad` / app deploy | `paritytech/polkadot-app-deploy` | Builds/uploads static content to Bulletin, updates DotNS contenthash and optionally publishes to Browse. Supports QR mobile sessions, incremental chunks and environment presets. | Candidate production deployment tool after package/network verification. Record domain, CID, version, source commit and environment on every release. |
| Browse registry | `paritytech/browse` | Publisher contract enumerates labelhashes; clients resolve labels via DotNS, hydrate manifest/contenthash, publication time, attestations and certifications. | Publish ChopDot only after the release gate. Use as ecosystem discovery and compatibility donor. |
| Browse SDK | `@parity/browse-sdk` | Third-party app listing/search without running an indexer/backend. | Future optional in-app ecosystem/help surface, not core expense UX. Use for automated live catalog refresh. |
| Playground registry | `paritytech/playground-app-community` | Registry of deployable/moddable `.dot` apps with owner, metadata/repository and app discovery/rating flows. | Useful for builder workflows and donor discovery, not consumer ChopDot runtime. |
| Playground CLI | `paritytech/playground-cli` | QR login, allowances, product-account funding/status, project init/build/deploy, multi-deploy, site decentralization, CDM contract workflows and source modding. | Use as a development/deployment comparison. Do not assume aliases imply the network is actually wired; current README says only the primary preview environment is fully wired. |
| Playground template/tutorial | `paritytech/playground-app-template`, `paritytech/playground-tutorial` | Minimal host-account/signing app; tutorial layers Bulletin, PVM contract indexing and Statement Store multiplayer. | Strong reference for smallest host integration and for testing our adapter assumptions. Do not replace ChopDot architecture with a tutorial pattern wholesale. |

## 8. Contracts and package lifecycle catalog

| Capability | Repository | How it works | ChopDot decision |
|---|---|---|---|
| CDM | `paritytech/contract-dependency-manager` | Dependency-ordered PVM build/deploy, ABI/readme publication to Bulletin, package registration, typed installs and TS/Rust/Solidity codegen. | If ChopDot adds contracts, CDM owns lifecycle/dependencies while Product SDK owns runtime calls. Pin the exact registry/network; `paseo` and `devnet` presets have different meanings. |
| Contract registry frontend | CDM frontend / `contracts.dot.li` | Browse packages, addresses and metadata registered through CDM. | Use to discover and verify shared packages, not as a hidden runtime dependency. |
| Attestation protocol | `paritytech/attestation-protocol` | Schema registry + issue/revoke/verify attestation service. | Potential later signed group-close or app certification. Keep personal expense details off public schemas. |
| Context/reputation/disputes | `paritytech/contract-developer-tools` | Shared context ownership/operator model with dependent review and dispute contracts. | Donor for future formal disputes; not a reason to over-engineer v1. |

## 9. Identity, money and communication catalog

| Capability | Source | How it works | ChopDot interpretation |
|---|---|---|---|
| Product account | Host + TrUAPI + Product SDK signer | Host derives an app-scoped account from product identifier/selector; signing stays with host/mobile. | Authorizes product-scoped chain actions. It is not a ChopDot user database and does not automatically prove another member's destination. |
| Username/alias | People/Individuality + DotNS bridge paths | User-readable names resolve to on-chain accounts/records. Mobile clients can pay by username. | Great for recipient selection after verified resolution. Store provenance and re-resolve before payment. |
| Proof of Unique Device / Personhood | Mobile + People/Individuality | Device and personhood flows earn allowances and higher status. | Optional anti-abuse or community feature; never block normal expense use by default. |
| Identity backend | `paritytech/identity-backend-community` | PostgreSQL-backed BFF, migrations, API docs, E2E/load tests, coordination around identity/product flows. | Confirms a normal service/database is compatible with Parity's architecture. Strong donor for migrations, idempotency and operations, not a library to copy blindly. |
| Native/asset payments | Asset Hub + Product SDK chain/tx/signer | Host account signs transfer; chain provides finality and transaction evidence. | One settlement rail. Match network, asset, sender, recipient and integer base units before `marked_paid`; receiver confirmation remains current ChopDot policy. |
| Payment Host API | TrUAPI / host test SDK payment methods | Host may expose balance, top-up, request-payment and status behavior. | Catalog and capability-detect it, but do not assume it is a generic DOT/USDC transfer API. Keep direct chain adapter until a verified host surface replaces it. |
| Statement messaging | Statement Store packages + host chat | Signed/encrypted statements, chat codecs and sessions; clients use it for messages and coordination. | Optional request notification/wakeup. Canonical request/settlement state lives in ChopDot service/DB. |
| HOP / handoff | triangle `handoff-service` | End-to-end encrypted peer file transfer coordinated with Bulletin-related infrastructure. | Possible later receipt/media handoff. Not necessary for v1. |
| Calls | Native clients / WebRTC | Encrypted peer-to-peer voice/video, with chain-host identity and signaling around it. | No direct v1 need; useful example of capability-gated host integration. |

## 10. Reference-product pattern catalog

| Product | Repository | Pattern demonstrated | ChopDot lesson |
|---|---|---|---|
| Browse | `paritytech/browse` | Dynamic app registry, DotNS resolution, manifests, attestations, certification, client-side hydration. | Build catalog refresh from source of truth rather than a hard-coded app list. |
| DotNS UI | DotNS repositories/current deployed UI | Human name registration and record management. | Use its validation, resolver and confirmation patterns for any receive-name feature. |
| Contracts frontend | CDM frontend | Discover/install typed shared contracts and metadata. | Verify packages/addresses through registry, do not paste addresses into UI code. |
| Playground | `paritytech/playground-app-community` | Registry, app ownership, moddable source metadata and builder journeys. | Strong donor for deployment provenance and app-release records. |
| Playground template | `paritytech/playground-app-template` | Smallest Product SDK account/signing integration. | Reference for isolating host adapter from product UI. |
| Playground tutorial | `paritytech/playground-tutorial` | Local → Bulletin → contract index → Statement Store progression. | Validates progressive adoption: add primitives only when a feature needs them. |
| Simple Survey | `paritytech/simple-survey` | JSON bodies on Bulletin; compact contract indexes CIDs. | If storing receipt artifacts, keep large/private bytes out of contract state and index only minimal references. |
| Feedback Board | `paritytech/feedback-board` | Shared contract index + Bulletin content; remixes share one contract. | Demonstrates shared public state, but ChopDot must not share personal ledger data this way. |
| Rock Paper Scissors | `paritytech/Rock-Paper-Scissors` | Commit-reveal over Statement Store, contract leaderboard, Bulletin history. | Statement Store can coordinate an interaction, but contract/Bulletin hold durable outcomes; still not a financial database pattern. |
| Mercado | `paritytech/mercado-community` | Escrow, menus/orders, matchmakers, dispute governance, evidence CIDs and stable asset. | Strong donor for settlement/dispute state machines and evidence, but far more custody/contract complexity than ChopDot v1 needs. |
| LocalDOT | `paritytech/localdot-community` | Asset Hub escrow/offer book, Bulletin evidence, Statement Store negotiation, host-routed chains and no wallet-connect screen. | Best donor for host-native multi-rail coordination and evidence, while showing why escrow should remain a separate later product decision. |

## 11. Adjacent, predecessor and donor repositories

| Repository | Classification | Relevance |
|---|---|---|
| `paritytech/polkadot-apps` | LEGACY / PREDECESSOR | Earlier package family with chain, signer, tx, contracts, Bulletin, Statement Store, storage and agent skills. Do not mix `@polkadot-apps/*` and `@parity/product-sdk-*` unless a migration/compatibility requirement is proven. |
| `paritytech/polkadot-hub-app` | ADJACENT / DONOR | React/Node/Postgres modular application; useful evidence for conventional service/data architecture and module isolation, unrelated to the current on-chain product host. |
| `paritytech/polkadot-app-design-system` and native platform design repos | ADJACENT / DONOR | Shared Figma-derived tokens and platform emitters. Useful for aligning ChopDot with host look/feel, but ChopDot should retain a product-specific consumer UI. |
| `paritytech/gift-app` | ADJACENT / DONOR | Potential payment/gifting flow donor; verify recency and target architecture before reuse. |
| `paritytech/decentralize` | ADJACENT / DONOR | Static-site decentralization/deployment pattern; Playground CLI now exposes a `decentralize` workflow. |
| `paritytech/dotli-starter` | LEGACY / DONOR | Earlier starter for `.dot` products; current Playground template/Product SDK guidance should win unless compatibility demands otherwise. |

## 12. What ChopDot should adopt

### P0 — adopt or verify now

1. **Product SDK signer + host provenance** for the current user's product account.
2. **Product SDK chain client/tx** for exact PAS Devnet transaction submission and finality evidence.
3. **Product SDK address utilities** for SS58/H160 presentation and validation.
4. **Host feature detection** with browser/local fallbacks and honest unavailable states.
5. **Host test SDK + real host verification** as separate evidence levels.
6. **`pad` or equivalent reproducible deployment records** once the release gate is ready.
7. **DotNS product identifier reconciliation** before treating the derived account as stable authority.

### P1 — build after reconciliation/backend foundation

1. **ChopDot service + Postgres** as canonical multi-user operational state.
2. **Statement Store invalidation/version hints** only after committed DB changes.
3. **Bulletin encrypted evidence/export policy** with explicit retention and renewal.
4. **Browse publication** for discoverability after quality/security acceptance.
5. **DotNS verified receive records** as an optional human-friendly settlement destination.
6. **CDM** only if a concrete contract-backed feature survives a threat/product review.

### P2 — investigate later

1. People usernames/aliases as reusable contact lookup.
2. Personhood for anti-spam or community-gated groups.
3. Attestations for closed-group proofs, app certification or organization workflows.
4. Host Payment API if it becomes a proven generic transfer surface.
5. Chat modality, widget/dashboard modality and deeplink-native request experiences.
6. HOP for direct encrypted receipt/media transfer.
7. CASH/Coinage only after exact network semantics and user value are verified.

### Do not use as v1 shortcuts

- Statement Store as the financial ledger;
- Bulletin as a relational/query database;
- public contracts for personal expense descriptions;
- a `.dot` label or manually typed address as unquestioned recipient authority;
- a chain transaction submission as automatic receiver confirmation;
- mainnet asset metadata on Paseo;
- escrow/shared-pot contracts merely to look more Web3-native;
- mixed Product SDK predecessor families without a deliberate migration plan;
- simulated host tests as proof that mobile/Desktop/chain execution works.

## 13. ChopDot capability opportunity matrix

| ChopDot need | Best current primitive | Reference donor | Decision |
|---|---|---|---|
| Local identity and product account | Host + Product SDK signer | Playground template, dotli | Already building; reconcile product ID and verify on real host. |
| Shared group/expense queries | Service + Postgres | Identity backend, Polkadot Hub App | Required production architecture; not replaced by chain storage. |
| Cash acknowledgement | ChopDot domain/event model | No chain needed | Keep simple; payer attests, receiver confirms. |
| Native PAS/DOT settlement | Asset Hub + signer + tx + chain client | Playground/LocalDOT | PAS Devnet adapter first; production DOT only after network proof. |
| Stable asset settlement | Asset Hub asset calls | Mercado/LocalDOT | Execution blocked until exact supported asset/runtime path is verified. |
| Request notification | API/push first; Statement Store optional | RPS/LocalDOT | DB is truth; statement carries a tiny pointer/version only. |
| Receipt/evidence artifact | Encrypted Bulletin object | Survey/Feedback/Mercado | Optional; never plaintext by default; record retention/renewal. |
| Human payment destination | People username / DotNS record | Mobile payment UX, DotNS UI | Re-resolve and confirm at payment time; store provenance. |
| App discoverability | Browse Publisher + manifest | Browse | Publish after release acceptance. |
| Contract dependency | CDM + Product SDK contracts | CDM examples | Introduce only for a justified shared enforcement feature. |
| Disputes | Application workflow first; optional context/dispute contract later | Mercado, contract developer tools | Do not force formal governance into friend groups. |
| Cross-device recovery | ChopDot backend plus authenticated session | Identity backend/native clients | Identity reconnect alone does not restore local ledger state. |
| Portable proof/export | Signed/encrypted snapshot + optional Bulletin CID | Survey/Bulletin | Later, after privacy schema and key-recovery policy. |

## 14. Open questions requiring live proof

1. Which exact DotNS product identifier and derivation selector does the deployed `chopdotproof02.dot` host use?
2. Which Product SDK/TrUAPI version family is actually installed in each current host build?
3. Does the real Desktop/mobile host grant the Statement Store allowance ChopDot needs, and under what exact permission flow?
4. Which native/asset networks are exposed by current host `featureSupported` and chain provider catalogs?
5. Is there a currently supported stable asset on the exact Devnet contour, with verified ID, decimals and transfer call?
6. What are the maximum practical request/response sizes and retention semantics for Statement Store on the current runtime?
7. What Bulletin allowance and renewal experience can a normal ChopDot user obtain without operator intervention?
8. Which reference apps in the live Browse/Playground registry are current, certified and compatible with the current host?
9. Are chat/widget/background-worker modalities consistent across iOS, Android, Desktop and Web?
10. Which contracts/packages in the CDM registry are current for the `devnet` versus `paseo` presets?

These questions become reproducible probes, not assumptions.

## 15. Maintenance rule

This catalog is a snapshot, not permanent truth.

Refresh it when any of these changes:

- Product SDK or TrUAPI minor version;
- host release or protocol compatibility report;
- Devnet genesis/runtime/configuration;
- DotNS/CDM/Publisher/attestation deployment;
- supported asset registration;
- Statement Store or Bulletin permission/retention behavior;
- official reference-product list.

Every refresh must record:

```text
source repo/tag/commit
network + genesis
contract/asset IDs where relevant
host/version tested
what was read from source
what was executed on a real host/chain
known limitations
```

The machine-readable companion is `PARITY_PRODUCTS_DEVNET_CATALOG.json`. The dynamic app-registry procedure is `LIVE_DEVNET_REGISTRY_REFRESH.md`.