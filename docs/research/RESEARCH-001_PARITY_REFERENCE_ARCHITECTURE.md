# RESEARCH-001 — Parity Reference Architecture Review

Status: COMPLETE FOR V1 DATA DECISION
Date: 2026-08-15
Owner: product + engineering
Purpose: determine how Parity's own current apps, SDKs, starters, and reference implementations divide product state, identity, signing, storage, messaging, chain state, and conventional backend infrastructure before ChopDot commits to a data architecture.

## Executive conclusion

Parity's current ecosystem does **not** present Statement Store, Bulletin/Cloud Storage, or smart-contract state as a general replacement for an application's relational operational database.

The recurring pattern across the first-party material reviewed is:

1. keep keys/signing on the user device / Polkadot App;
2. use Product SDK / Host API for product-account identity, permissions, signing, chain access, local host-scoped storage, Statement Store, Cloud Storage, and contracts;
3. use Statement Store for small signed ephemeral pub/sub data;
4. use Bulletin / Cloud Storage for content-addressed blobs and application files retrieved by CID;
5. use chain state/contracts where verifiable public state or programmable on-chain behavior is actually needed;
6. use a conventional queryable backend database for server-side application coordination when the product needs relational queries, API state, queues, subscriptions, indexing, retries, or multi-instance service coordination.

The strongest first-party evidence is the **Polkadot App Backend** itself: Parity's current backend-for-frontend for the Polkadot mobile app runs PostgreSQL and explicitly states that Postgres is its only coordination point across service instances. It keeps user keys on-device and combines the database with People Chain / Statement Store / push infrastructure rather than attempting to store normal backend operational state entirely on-chain.

This supports a hybrid ChopDot architecture rather than an "everything on Polkadot" architecture.

---

## Sources reviewed

### Current Product SDK

Repository:

- https://github.com/paritytech/product-sdk

The repo describes the SDK as an experimental prototype/reference implementation and exposes packages for:

- multi-chain clients;
- transaction submission and lifecycle watching;
- signer/account management through Host API and dev accounts;
- smart contracts on Asset Hub / PolkaVM;
- Cloud Storage backed by Bulletin;
- Statement Store;
- product/session keys;
- local host/browser KV storage;
- host container capabilities;
- address/crypto/logging utilities.

Important Product SDK separation:

```text
chain-client       -> chain queries
transactions       -> chain writes + lifecycle
signer/auth        -> account authority / signing
contracts          -> programmable on-chain state
cloud-storage      -> CID-addressed content storage
statement-store    -> ephemeral pub/sub
local-storage      -> product-scoped local KV
host               -> container/permission boundary
```

There is no SDK package positioned as a relational application database.

Reference:

- https://github.com/paritytech/product-sdk/blob/main/README.md
- https://github.com/paritytech/product-sdk/blob/main/product-sdk/skills/product-sdk-app-builder/SKILL.md

### Product SDK app-builder guidance

The first-party app-builder skill classifies application requirements as:

- read chain state;
- submit transactions;
- store data in Cloud Storage;
- real-time messaging via Statement Store;
- address/encryption/key utilities.

It separately selects packages for those capabilities. This is meaningful: Parity's reference builder treats storage and messaging as different concerns and does not claim either one is a general-purpose database.

It currently warns that the SDK is highly experimental and environment support is moving; exact Product SDK and TrUAPI versions must therefore be pinned and verified during implementation rather than relying on `latest`.

Reference:

- https://github.com/paritytech/product-sdk/blob/main/product-sdk/skills/product-sdk-app-builder/SKILL.md

---

## Local product storage pattern

### dotli-starter

Repository:

- https://github.com/paritytech/dotli-starter

The starter demonstrates:

- host-container detection;
- product-account resolution bound to the DotNS identifier;
- raw-message signing;
- a chain transaction;
- finalized chain reads;
- **app-scoped host local storage for a draft**.

This is a strong reference for ChopDot's device-local cache/drafts/preferences layer. It does not demonstrate shared relational state.

Reference:

- https://github.com/paritytech/dotli-starter

### Product SDK local storage

`@parity/product-sdk-local-storage` provides a persistent KV abstraction with host/browser backend detection.

Good ChopDot uses:

- UI preferences;
- drafts;
- offline cache/projections;
- migration checkpoints;
- non-authoritative local convenience state.

It should not become canonical multi-user financial authority.

Reference:

- https://github.com/paritytech/product-sdk/blob/main/product-sdk/skills/product-sdk-utilities/SKILL.md

---

## Statement Store pattern

Product SDK describes Statement Store as **small signed ephemeral pub/sub**.

Important current properties:

- JSON payload size limit: 512 bytes;
- topic/channel addressing;
- `ChannelStore` last-write-wins semantics;
- host mode or local signer mode;
- intended use is signaling/pub-sub, not bulk state.

The older/newer first-party demos follow this exact model: connect a signer, subscribe to a topic, publish small events, and use ChannelStore for small replaceable channel state.

This validates ChopDot's measured conclusion from the existing portable-shell spike: Statement Store is appropriate for signals such as:

```text
group_changed
request_updated
payment_submitted
payment_confirmed
presence/version hint
```

but not a complete expense ledger or event database.

A useful long-term pattern is:

```text
Statement Store signal arrives
-> client knows group/version X changed
-> client fetches canonical state from authoritative storage
```

rather than attempting to fit the canonical state itself inside the statement.

Current ChopDot is additionally blocked by the real Desktop Statement Store allowance issue:

- https://github.com/paritytech/polkadot-desktop-community/issues/29

Reference:

- https://github.com/paritytech/product-sdk/blob/main/product-sdk/skills/product-sdk-statement-store/SKILL.md
- https://github.com/paritytech/polkadot-apps/tree/main/examples/statement-store-demo

---

## Bulletin / Cloud Storage pattern

### Product SDK Cloud Storage

`@parity/product-sdk-cloud-storage` is content-addressed storage backed by the Bulletin Chain.

Important current characteristics:

- bytes are addressed by CID;
- uploads require a signer;
- large content can be chunked with a manifest;
- reads are CID-oriented;
- current product-host reads use host preimage lookup;
- the API is designed around `store(bytes)` and `fetch.../query...` by CID, not relational predicates.

That makes it suitable for ChopDot artifacts such as:

- encrypted receipt files;
- a closed-group export;
- signed settlement packages;
- audit snapshots;
- proof/evidence blobs;
- application/static content.

It is not naturally suited to queries like:

```text
all open obligations for user X
all groups where user X is a member
latest 50 expenses in group Y
all failed settlement attempts needing retry
```

Those are relational/indexed application queries.

Privacy warning for ChopDot:

- expense descriptions and receipts may contain highly sensitive personal data;
- do not place them into public content-addressed storage in plaintext merely because Bulletin is available;
- any Bulletin use for personal records requires an explicit encryption, key-management, retention, and sharing policy.

Reference:

- https://github.com/paritytech/product-sdk/blob/main/product-sdk/skills/product-sdk-cloud-storage/SKILL.md
- https://docs.polkadot.com/chain-interactions/store-data/bulletin-chain/

### Bulletin reference demos

Parity's demo performs upload -> CID -> fetch-by-CID. It does not model a queryable business database.

Reference:

- https://github.com/paritytech/polkadot-apps/tree/main/examples/bulletin-demo

---

## Polkadot Desktop pattern

Repository:

- https://github.com/paritytech/polkadot-desktop-community

Desktop demonstrates the strongest decentralized-host pattern:

- `.dot` application bundles resolve through DotNS;
- app code is fetched from Bulletin/IPFS;
- each app runs sandboxed;
- signing remains on the paired phone;
- permissions mediate storage/signing/network/etc.;
- encrypted chat can use Statement Store;
- contacts/chats can sync over encrypted peer-to-peer channels;
- chain access uses PAPI over RPC or smoldot light clients.

Important lesson for ChopDot:

**decentralized hosting does not require decentralized storage to be abused as a relational database.** The host itself cleanly separates application bundle distribution, local scoped storage, user signing authority, chain access, and messaging.

Desktop is also a reference implementation and currently experimental. ChopDot should treat its capabilities as adapters with explicit version compatibility, which is already our architecture rule.

Reference:

- https://github.com/paritytech/polkadot-desktop-community

---

## Polkadot App Backend — strongest data architecture precedent

Repository:

- https://github.com/paritytech/identity-backend-community

This is the current backend-for-frontend for the Polkadot mobile app.

It handles:

- username registration/indexing against the People Chain;
- device attestation and JWT sessions;
- push subscriptions and filtering;
- registration queues;
- ticket processing;
- block/finality monitoring;
- on-chain statement subscription -> push delivery.

It explicitly says:

- it **does not hold user keys**;
- signing stays on the device;
- encrypted chat is not routed through this service;
- the service runs multi-instance;
- **PostgreSQL is the only coordination point** between service instances;
- domain decisions live in pure functions;
- DB queries, chain RPC, and push gateways are thin I/O executors around those decisions.

Its database layer uses PostgreSQL via Drizzle with relational tables, indexes, unique constraints, statuses, retry timestamps/counters, and on-chain metadata references.

This is highly relevant to ChopDot because it demonstrates a Parity-native hybrid architecture:

```text
user keys/signing      -> device / Polkadot App
public chain truth     -> Polkadot chains
messaging event input  -> Statement Store
queryable service data -> PostgreSQL
push delivery          -> backend workers
```

This is much closer to ChopDot's needs than forcing expense data into chain storage.

References:

- https://github.com/paritytech/identity-backend-community
- https://github.com/paritytech/identity-backend-community/blob/main/apps/identity-backend/README.md
- https://github.com/paritytech/identity-backend-community/blob/main/packages/lib/db/src/schema.ts

---

## Polkadot Hub App — conventional product precedent

Repository:

- https://github.com/paritytech/polkadot-hub-app

Parity's own self-hosted office/event/people application is explicitly built with:

```text
React + Node.js + Postgres
```

It uses a modular product/backend architecture and external integrations. Although this app predates/does not represent the new `.dot` product platform, it confirms that Parity does not treat chain storage as a universal substitute for a normal product database.

Reference:

- https://github.com/paritytech/polkadot-hub-app

---

## Transactions / settlement pattern

Product SDK transaction tooling gives ChopDot useful first-party primitives:

- multi-provider `SignerManager`;
- host product-account signers;
- typed transaction submission;
- lifecycle statuses (`signing`, `broadcasting`, `in-block`, `finalized`, error);
- typed signing/dispatch/timeout errors;
- retry helpers;
- atomic `batch_all` for multiple chain calls.

Potential ChopDot uses:

- DOT/PAS transfer;
- USDC/asset transfer;
- one signing boundary per settlement;
- possibly atomic optimized multi-transfer settlement where multiple obligations genuinely benefit from batching.

Important product rule remains: do not make every group member sign merely because atomic batching exists. Settlement follows actual obligations.

Reference:

- https://github.com/paritytech/product-sdk/blob/main/product-sdk/skills/product-sdk-transactions/SKILL.md

---

## Smart-contract pattern

Product SDK supports typed Solidity/PolkaVM contract reads and writes on Asset Hub.

Contracts are appropriate when ChopDot needs **publicly verifiable programmable state** that cannot safely rely on the application service alone, for example future:

- escrow;
- shared pots with enforceable rules;
- conditional payout logic;
- on-chain settlement registry/proof anchors.

Contracts are **not** the recommended v1 home for normal private expense records because that would create unnecessary public data, transaction friction/cost, difficult migrations, and awkward relational querying.

Reference:

- https://github.com/paritytech/product-sdk/blob/main/product-sdk/skills/product-sdk-contracts/SKILL.md

---

## What the reviewed Parity material does NOT provide

No reviewed first-party Product SDK component gives ChopDot all of the following in one service:

- relational joins;
- indexed arbitrary filters;
- server-authoritative group membership;
- transactional multi-row financial commands;
- paginated activity/history queries;
- durable idempotency records;
- retry queues;
- private application data access policies;
- conflict/version checks over a large multi-user financial graph.

Those are exactly the capabilities ChopDot will need as it moves from a local proof into a multi-user product.

Therefore the conclusion is not "Polkadot cannot store data." It can, through several purpose-built mechanisms. The conclusion is:

> use each Polkadot primitive for its intended trust/storage/messaging role, and use a queryable operational datastore for application state that is relational, private, mutable, and heavily queried.

---

## Recommended Parity-aligned ChopDot pattern

```text
POLKADOT APP / HOST
identity + product account + user approval + signing
                |
                v
CHOPDOT CLIENT (.dot / web)
UI + drafts + local cache + offline projection
                |
       authorized commands
                v
CHOPDOT SERVICE
pure domain decisions + auth + idempotency + transactions
                |
                v
POSTGRES
canonical operational application state + audit events
                |
      +---------+----------+
      |                    |
      v                    v
POLKADOT CHAIN       STATEMENT STORE
DOT/USDC tx           tiny wakeup/status
finality/proof        pub/sub where available
      |
      v
BULLETIN / CLOUD STORAGE
optional encrypted receipts, snapshots, evidence blobs
```

This mirrors Parity's own separation of concerns more closely than an all-chain database design.

---

## Engineering patterns worth copying from Parity

From the Polkadot App Backend:

1. **Pure domain decisions, thin I/O executors.** Financial rules should not be embedded in HTTP/React/chain adapters.
2. **Postgres as durable coordination, not process memory.** Any server instance should be able to serve a request.
3. **Indexes/unique constraints as correctness tools.** Idempotency, membership, payment evidence, and retries should be backed by database constraints where practical.
4. **No user private keys server-side.** ChopDot service verifies identity/evidence; user signing remains in Polkadot App/wallet.
5. **Chain data is indexed/referenced rather than blindly duplicated as truth.** Store transaction references/status plus independently verify chain state.
6. **Retry state is explicit.** External/chain operations need typed statuses, retry timestamps/counters, and observable failures.
7. **E2E + local chain fixtures.** Use simulated host tests plus local/forked chain testing and real-host proof for release claims.

Do **not** copy complexity merely because Parity uses it. ChopDot does not currently need all of Effect-TS, six background daemons, or the Polkadot App's full infrastructure. Copy the architectural discipline, not the organizational scale.

---

## Decisions enabled by this research

RESEARCH-001 supports proceeding to `DATA-001` with these conclusions:

- A queryable PostgreSQL application datastore is justified and consistent with Parity's own application/backend patterns.
- Postgres should hold ChopDot's canonical operational multi-user state once shared mode is introduced.
- Client-local Product SDK storage remains a cache/draft/offline mechanism, not multi-user authority.
- Statement Store remains an optional tiny signal/notification transport, not the ledger.
- Bulletin/Cloud Storage remains optional content/evidence storage by CID, with encryption/privacy policy required.
- Polkadot App/Product SDK remains the preferred signing/identity capability boundary.
- Polkadot chain state is canonical for actual on-chain payment finality/evidence.
- Smart contracts are optional future enforcement mechanisms, not the v1 expense database.

---

## Research caveats

All of the new Product SDK, Desktop, and Polkadot App backend repositories reviewed prominently label themselves experimental/reference implementations. APIs and network support are actively moving.

Therefore every Polkadot-sensitive implementation slice must:

- pin versions;
- record the host/Desktop/App versions used;
- verify against current first-party docs/source;
- distinguish simulator success from live-host success;
- fail closed when a capability is unavailable;
- update this research if Parity introduces a materially different canonical data primitive.
