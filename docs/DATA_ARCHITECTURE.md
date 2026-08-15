# DATA-001 — ChopDot Canonical Data Architecture

Status: ACCEPTED DESIGN / NOT YET IMPLEMENTED
Date: 2026-08-15
Owner: product + engineering + security
Depends on: `docs/research/RESEARCH-001_PARITY_REFERENCE_ARCHITECTURE.md`

## Purpose

Define where ChopDot's financial and product data lives as the application moves from a single-device `.dot` proof into a reliable multi-user product.

The goal is not to maximize the amount of data placed on Polkadot. The goal is to use each component for the job it is strongest at while preserving a Polkadot-native trust and settlement model.

## Decision Summary

ChopDot will use a **hybrid, local-first client + queryable shared service + Polkadot authority/settlement architecture**.

The intended mature shape is:

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
pure domain decisions + auth + idempotency + DB transactions
                |
                v
POSTGRES
canonical operational multi-user state + append-only audit events
                |
       +--------+---------+
       |                  |
       v                  v
POLKADOT CHAIN       STATEMENT STORE
DOT/USDC transfer     small wakeup/status signals
finality/evidence     optional, capability-gated
       |
       v
BULLETIN / CLOUD STORAGE
optional encrypted receipts, exports, snapshots, evidence blobs
```

### Core rule

**Postgres is the canonical operational source for shared ChopDot application state. Polkadot is the canonical source for facts that actually occur on-chain.**

Examples:

- `Jeanine owes Dev CHF 42` is a ChopDot domain fact persisted in the application datastore.
- `Jeanine transferred 42 USDC to Dev in transaction 0x...` is a Polkadot chain fact; ChopDot stores a verified reference/projection of it.
- `Jeanine has a local unsaved receipt draft` is device-local state.
- `group X changed, refresh version 17` may later be a Statement Store signal.
- an encrypted receipt blob or finalized group export may optionally live in Bulletin/Cloud Storage by CID.

---

## Why this architecture

Research in `RESEARCH-001` found the same separation in Parity's own current stack:

- the Polkadot App backend uses PostgreSQL for server-side coordination and explicitly keeps user keys/signing on-device;
- Product SDK local storage is app-scoped KV storage;
- Statement Store is small ephemeral pub/sub with strict size limits;
- Bulletin/Cloud Storage is content-addressed CID storage;
- Asset Hub/Polkadot chain state handles transactions and programmable public state;
- product accounts and signing flow through Host/App capability boundaries.

ChopDot has relational, private, frequently changing, heavily queried application state. Treating a blockchain/content store/pub-sub system as a SQL database would make the product harder to query, migrate, protect, and operate without creating additional user trust.

---

## 1. Sources of truth

ChopDot must distinguish several types of truth instead of using one storage system for everything.

### 1.1 Shared application truth — Postgres

Canonical for:

- users as known by ChopDot;
- groups and membership;
- expenses;
- expense splits;
- obligations;
- payment intents;
- settlement workflow state;
- manual/cash confirmations;
- payment preferences/references;
- append-only activity/audit events;
- idempotency records;
- optimistic versions;
- retry/reconciliation state.

The server command layer is responsible for deciding whether a state transition is legal before committing it transactionally.

### 1.2 Chain truth — Polkadot

Canonical for facts that happened on-chain:

- submitted/finalized transaction;
- sender;
- receiver;
- asset;
- amount/base units;
- network/genesis context;
- block/finality;
- smart-contract state where ChopDot intentionally uses a contract.

Postgres may index/cache verified chain facts for product queries, but it does not redefine whether a transaction occurred.

### 1.3 Local client truth — device / Product SDK local storage

Canonical only for device-local concerns:

- unsaved drafts;
- UI preferences;
- optimistic/read cache;
- offline command queue before submission;
- local recovery metadata;
- non-sensitive host capability cache.

Local storage must never independently confirm shared money state.

### 1.4 Notification/invalidation signals — Statement Store

Potential future use:

```text
group_changed { groupId, version }
request_changed { intentId, version }
settlement_changed { settlementId, version }
```

A Statement Store message tells a client **that canonical data may have changed**. The client then retrieves/validates canonical state.

It is not the full ledger, not the replication log, and not authoritative merely because a signed statement arrived.

This capability remains blocked for real ChopDot cross-device use until the Desktop allowance issue is resolved and verified.

### 1.5 Content-addressed artifacts — Bulletin / Cloud Storage

Optional home for encrypted or intentionally public immutable-ish artifacts such as:

- encrypted receipt files;
- closed-group export packages;
- settlement evidence bundles;
- audit snapshots;
- application/static release assets.

A CID is a content reference, not a relational primary-query mechanism.

Personal/financial content must not be uploaded in plaintext by default.

---

## 2. Domain model

The durable model should distinguish what happened from what is owed and how it was settled.

```text
Expense
   |
   v
ExpenseSplit
   |
   v
Obligation
   |
   v
PaymentIntent
   |
   v
SettlementAttempt
   |
   v
SettlementEvidence
   |
   v
Settlement confirmation / closed obligation

Every meaningful transition
   -> ActivityEvent (append-only)
```

### Expense

Represents spending that happened.

Example:

```text
Apartment
CHF 600
paid by Dev
shared by Dev + Jeanine
```

### ExpenseSplit

Represents allocation of an expense.

Example:

```text
Dev: CHF 300
Jeanine: CHF 300
```

### Obligation

Represents a net amount one person currently owes another after applying expense/split rules.

Example:

```text
Jeanine -> Dev CHF 300
```

The obligation is the object settlement acts on. This prevents payment-rail logic from becoming embedded in expense records.

### PaymentIntent

Captures a specific request to settle one or more exact obligation/split versions.

The existing `PAYMENT_INTENT_CONTRACT.md` remains the authority contract for this layer.

### SettlementAttempt

Represents an attempt to satisfy an intent through a rail:

```text
cash
bank/external
payment_link
DOT
USDC
```

One intent may need multiple attempts due to cancellation/retry/failure. Attempts have stable IDs and idempotency boundaries.

### SettlementEvidence

Rail-specific evidence, for example:

- payer marked cash paid;
- receiver confirmed cash received;
- external reference;
- Polkadot tx hash + block + verified transfer fields.

Evidence never changes money truth unless it satisfies the policy for the live scoped intent.

### ActivityEvent

Append-only human/audit history such as:

```text
expense_created
expense_updated
expense_deleted
obligation_recalculated
payment_requested
request_replaced
settlement_submitted
settlement_failed
payment_marked_paid
payment_confirmed
adjustment_created
group_closed
```

Current mutable state answers `what is true now?`; events answer `how did we get here?`.

---

## 3. Proposed relational schema

This is a logical schema, not yet a migration file. Exact SQL/Drizzle types should be designed in an implementation slice after reconciling v0.5.6.

### `users`

```text
id UUID PK
display_name
created_at
updated_at
version
```

A ChopDot user ID must not be a wallet address. People can change/add accounts.

### `user_identities`

```text
id UUID PK
user_id FK -> users
kind                # polkadot_product_account | wallet | local-migrated | ...
network
public_key/address
product_id
verified_at
created_at
```

Constraints:

- normalized identity tuple unique where appropriate;
- server stores public identity/account references only, never private keys/seed phrases.

### `groups`

```text
id UUID PK
name
created_by_user_id
status               # active | closed | archived
currency_policy
version
created_at
updated_at
closed_at
```

### `group_members`

```text
group_id FK
user_id FK
role                 # member | organizer (only if needed)
joined_at
left_at
version
PRIMARY KEY(group_id, user_id)
```

Historical membership should not be deleted merely because someone leaves.

### `expenses`

```text
id UUID PK
group_id FK
paid_by_user_id FK
description
amount_minor BIGINT
currency_code
occurred_at
status               # active | superseded/deleted according to policy
version
created_by_user_id
created_at
updated_at
```

Important:

- canonical fiat amounts use integer minor units;
- edits use optimistic versions;
- settled historical truth is corrected through explicit adjustments rather than destructive rewriting.

### `expense_splits`

```text
id UUID PK
expense_id FK
user_id FK
amount_minor BIGINT
version
created_at
updated_at
UNIQUE(expense_id, user_id)   # if one split row/person is the chosen model
```

Invariant:

```text
SUM(split.amount_minor) == expense.amount_minor
```

validated in domain logic and transactionally enforced as far as practical.

### `obligations`

```text
id UUID PK
group_id FK
payer_user_id FK
receiver_user_id FK
currency_or_asset_key
amount_minor_or_base_units
status               # open | requested | partially_settled | settled | adjusted
source_version
version
created_at
updated_at
settled_at
```

Implementation note:

Whether obligations are stored rows, regenerated projections, or both should be decided after performance/query testing. The domain algorithm remains canonical. If materialized, obligations are derived/projection state and must be transactionally consistent with the source expense/split changes.

### `payment_intents`

Fields should conform to `PAYMENT_INTENT_CONTRACT.md`, including:

```text
id
public_id
group_id
payer_user_id
receiver_user_id
expected amount
currency/asset
rail
covered split/obligation scope
scope/version digest
status
version
created_by
expires_at
idempotency/last command metadata
created_at / sent_at / marked_paid_at / confirmed_at / cancelled_at
```

### `settlement_attempts`

```text
id UUID PK
payment_intent_id FK
rail
status               # created | signing | submitted | confirmed/verified | failed | cancelled
idempotency_key UNIQUE
payer_identity_id
receiver_identity_id
asset_key
network
amount_base_units
attempt_number
failure_code
created_at
submitted_at
resolved_at
```

Do not overload `confirmed` across rail semantics. The domain's final intent confirmation remains governed by the payment policy; chain finality and receiver confirmation must be represented distinctly if both exist.

### `settlement_evidence`

```text
id UUID PK
settlement_attempt_id FK
kind
source_event_id
chain_tx_hash
chain_block_number
chain_block_hash
from_address
to_address
asset_key
amount_base_units
network
observed_at
verified_at
verification_status
metadata_json
created_at
```

Constraints:

- unique source event/tx evidence where appropriate;
- one evidence record cannot satisfy multiple intents unless the policy explicitly models a batched transaction with itemized allocations;
- raw metadata is supplementary, not a substitute for normalized match fields.

### `activity_events`

```text
id UUID PK
group_id FK
actor_user_id nullable
type
entity_type
entity_id
amount_minor nullable
currency_or_asset_key nullable
payload_json          # bounded human/audit details, not secrets
created_at
```

Indexes support group timeline and entity history.

### `idempotency_commands`

Could be explicit or integrated into command/event tables. Logical needs:

```text
command_id UNIQUE
actor/session scope
command_type
payload_hash
result_reference
created_at
expires/retention policy
```

Duplicate command ID + same payload returns the original result; same ID + different payload is rejected.

### `payment_methods`

Only store non-secret receiver preferences/instructions required by product policy.

```text
id UUID PK
user_id FK
kind
label
reference/encrypted_details
is_preferred
version
created_at
updated_at
```

Sensitive bank/payment-link details require encryption/access policy; do not make them public merely because a group exists.

---

## 4. Required indexes and constraints

Correctness and queryability should be designed together.

Minimum likely indexes:

```text
group_members(user_id, left_at)
expenses(group_id, occurred_at DESC)
expenses(group_id, updated_at DESC)
expense_splits(expense_id)
expense_splits(user_id)
obligations(group_id, status)
obligations(payer_user_id, status)
obligations(receiver_user_id, status)
payment_intents(payer_user_id, status)
payment_intents(receiver_user_id, status)
payment_intents(group_id, status)
settlement_attempts(payment_intent_id, created_at DESC)
settlement_evidence(chain_tx_hash) UNIQUE where applicable
activity_events(group_id, created_at DESC)
activity_events(entity_type, entity_id, created_at DESC)
```

Important database constraints:

- stable primary keys;
- membership foreign keys;
- unique idempotency keys;
- non-negative/positive monetary checks where applicable;
- explicit status enums/check constraints;
- version columns for optimistic concurrency;
- uniqueness around evidence/replay boundaries.

Business invariants that span multiple rows still belong in the domain transaction, not solely SQL constraints.

---

## 5. Command and query boundary

The client should not write financial tables directly.

### Commands

Examples:

```text
CreateGroup
AddExpense
EditExpense
DeleteUnsettledExpense
RequestPayment
MarkManualPaymentPaid
ConfirmPaymentReceived
StartChainSettlement
RecordVerifiedChainEvidence
CorrectSettledExpense
CloseGroup
```

A command handler:

1. authenticates actor/session;
2. loads canonical current state needed for the decision;
3. checks actor authority;
4. checks expected versions/idempotency;
5. runs pure domain decision logic;
6. applies all affected relational changes in one DB transaction;
7. appends audit/activity events in the same transaction;
8. returns the canonical projection.

External chain submission may require a saga-style boundary rather than holding a DB transaction open across wallet/network interaction. In that case state records the attempt before/after the external action with idempotent reconciliation.

### Queries

The service exposes product-shaped reads rather than the entire DB:

```text
GET my active groups
GET group summary
GET paginated group expenses
GET one expense + splits
GET my open obligations
GET settlement/request detail
GET paginated activity history
GET payment methods I am authorized to see
```

Queries should be paginated and indexed from the beginning where lists can grow.

Example product query:

```text
Open Berlin Trip
-> group metadata
-> members
-> current balance/obligation summary
-> most recent 30 expenses
-> outstanding settlement actions for current user
-> recent activity cursor
```

Do not send the entire user's lifetime state JSON on every launch.

---

## 6. Authentication and Polkadot identity boundary

### Non-negotiable

The ChopDot backend never receives or stores the user's seed phrase/private signing key.

### Intended flow

Exact Product SDK API must be verified during implementation, but the logical model is:

```text
client obtains host/product-account identity
-> service issues a scoped challenge/nonce
-> user authorizes/signs using Polkadot App / product-account signer
-> service verifies proof against expected identity/product context
-> service establishes a normal short-lived authenticated session
-> subsequent ChopDot commands use that session + command authorization
```

Do not sign every ordinary UI mutation as an on-chain transaction. Cryptographic identity establishes actor authority; ChopDot's application commands remain normal service commands unless an action genuinely needs on-chain execution.

The exact auth mechanism is **provisional until checked against the live Product SDK/Host API flow**. Do not invent signature formats or reuse wallet-sign-in assumptions without first-party verification.

---

## 7. Settlement architecture

### Cash/manual rail

```text
obligation open
-> payment intent/request
-> payer marks paid
-> receiver confirms received
-> intent/obligation closes
-> activity event appended
```

All state lives in Postgres; no chain transaction is implied.

### DOT / USDC rail

```text
obligation open
-> payment intent fixes payer/receiver/asset/network/amount/scope
-> settlement attempt created
-> client requests Polkadot App signing
-> Product SDK submits/watches tx
-> tx hash returned
-> service independently verifies/matches chain evidence
-> evidence stored
-> intent transitions according to canonical confirmation policy
-> activity event appended
```

The chain is canonical for transaction finality. The application is canonical for how that verified transfer affects the scoped ChopDot obligation.

Current security policy remains conservative: chain evidence does not silently bypass the canonical payment-intent confirmation rule until `DEBT-SECURITY-001` is deliberately resolved.

### Atomic/batched settlement

Product SDK supports atomic transaction batching. ChopDot may use it later when multiple actual obligations for the same signing actor benefit from one approval.

Do not force uninvolved group members to participate.

---

## 8. Statement Store role

Future optional pattern:

```text
Database transaction commits group version 18
-> service/client emits small signed signal
   { kind: "group_changed", groupId, version: 18 }
-> peer receives it
-> peer fetches group changes/canonical projection
```

Properties:

- payload remains tiny;
- duplicate/out-of-order signals are harmless;
- missing a signal does not lose canonical data;
- signal never independently settles money;
- clients can poll/reconnect and recover from canonical datastore state.

This turns Statement Store into a decentralized/host-native **wakeup transport**, not a fragile replicated database.

Activation remains blocked pending real-host allowance support.

---

## 9. Bulletin / Cloud Storage role

Potential artifact object stored in Postgres:

```text
artifact_id
owner/group scope
kind
cid
encryption_scheme
key_reference        # never plaintext key in public metadata
content_hash
size
created_at
retention/renewal state
```

Example:

```text
receipt uploaded locally
-> encrypt on trusted client/service boundary according to policy
-> bytes stored in Bulletin/Cloud Storage
-> CID stored in Postgres with authorization metadata
-> authorized client retrieves CID and decrypts
```

Do not implement this until privacy/key-sharing semantics are designed. For v1, a conventional private object store may be simpler for receipts; Bulletin can be introduced where decentralization/proof provides clear user value.

---

## 10. Smart-contract role

No contract is required for normal expense CRUD or balance calculation.

Potential future contract-worthy features:

- shared pot holding actual assets;
- escrow;
- enforceable spending rules;
- conditional payout;
- public settlement-proof registry where required;
- community treasury logic.

Rule:

> putting data in a contract is justified by trust/enforcement/composability needs, not by a desire to maximize on-chain usage.

Sensitive expense descriptions/membership data must not be placed permanently in public contract storage by default.

---

## 11. Privacy model

ChopDot financial/social data is sensitive.

### Default private application data

Treat as private to authorized participants unless the user deliberately publishes it:

- group membership;
- expense descriptions;
- amounts;
- splits;
- payment preferences;
- receipt content;
- personal notes;
- external payment references.

### Public chain data

DOT/USDC transfers are public chain facts. ChopDot must not imply those transactions are private.

Avoid placing unnecessary semantic metadata on-chain that links a public transaction to sensitive group context.

### Server logging

Do not log:

- complete sensitive request URLs;
- private keys/seeds;
- raw secret capabilities/nonces;
- unnecessary payment details;
- full receipt content.

Use trace IDs, entity IDs, typed error codes, and redaction.

---

## 12. Offline/local-first behavior

The `.dot` app should continue to feel fast and useful when the shared service is unavailable.

### Safe offline behavior

Allowed:

- browse last synced groups/history projection;
- prepare an expense draft;
- edit an unsent local draft;
- change UI preferences.

Potentially queueable later:

- commands carrying expected version + stable command ID.

Must not fake:

- successful shared expense mutation;
- sent payment request;
- completed cash confirmation;
- finalized DOT/USDC payment;
- synchronized group status.

Queued commands must reconcile against server versions and may need human conflict resolution rather than last-write-wins.

---

## 13. Scaling and query model

The app never loads a single global `AppState` from the service.

Typical reads are scoped and paginated.

At scale:

```text
launch
-> current user's active groups + summary

open group
-> metadata + members + obligation summary + recent expenses

scroll history
-> next cursor page

open expense
-> expense + splits + related activity/settlement references

open Pay
-> current user's open payable/receivable obligations
```

Derived balance summaries may eventually be cached/materialized for performance, but canonical value must remain reproducible from authoritative domain records and settlement state.

---

## 14. Backend implementation recommendation

### V1 recommendation

Use:

```text
PostgreSQL
+ TypeScript service
+ Drizzle ORM (strong candidate)
+ thin HTTP/API layer
+ pure domain module
```

Parity's Polkadot App Backend uses Postgres + Drizzle and provides a useful first-party reference, but ChopDot does **not** need to copy its entire Effect-TS/Hono architecture immediately.

A small service should prioritize:

- transactional correctness;
- explicit schemas/migrations;
- typed commands;
- auth/authorization;
- idempotency;
- query indexes;
- testability;
- observability;
- easy local/dev deployment.

Hono is a reasonable candidate because Parity uses it and it is lightweight, but framework selection is not a financial architecture decision. Verify against existing ChopDot tooling before adding it.

### Supabase

Supabase/Postgres remains a valid deployment option if it accelerates operations, but ChopDot should avoid coupling domain authority directly to browser-side table writes/RLS alone.

If Supabase is used:

- Postgres remains the datastore;
- financial commands should still pass through a trusted command boundary/server function/API with domain validation and transaction semantics;
- RLS is defense-in-depth/access control, not a replacement for domain rules.

---

## 15. Migration from current portable shell

Do not replace the local reducer in one step.

### Phase A — current shell

```text
local reducer
local persisted AppState
```

Continue product work while the architecture is stabilized.

### Phase B — extract pure domain operations

Move calculations/transitions into framework-independent functions that can run:

- in current local reducer tests;
- later in server command handlers.

This avoids rewriting financial logic during backend introduction.

### Phase C — add datastore schema + service behind a feature flag

Implement core shared entities first:

```text
users
identities
groups
group_members
expenses
expense_splits
activity_events
```

Then obligations/payment intents/settlements.

### Phase D — dual-environment adapters

Client repository interface:

```text
local prototype repository
remote shared repository
```

Normal UI does not know whether data came from local or remote source.

### Phase E — migrate/import local groups deliberately

A local user's existing groups are not automatically trusted as shared authoritative records.

Possible migration flow:

```text
user signs in
-> app detects local groups
-> user chooses which to import
-> service validates/imports as a new canonical group
-> migration event recorded
-> client switches that group to remote canonical mode
```

### Phase F — enable realtime hints

Only after canonical shared data is reliable:

- Statement Store wakeups where supported;
- fallback polling/standard reconnect sync;
- no dependence on Statement Store for correctness.

---

## 16. Implementation prerequisites

Before writing DB migrations:

1. reconcile the true v0.5.6 source;
2. resolve or explicitly scope `DEBT-MONEY-001` integer money migration;
3. specify the exact obligation projection algorithm;
4. define server authentication against the current Product SDK identity/signing flow;
5. define authorization matrix for group/expense commands;
6. decide data retention/deletion/privacy policy;
7. choose backend deployment target;
8. write schema/invariant tests before connecting UI.

---

## 17. Acceptance criteria for DATA-001

This design is considered accepted when:

- [x] every important ChopDot data type has a clear owner/source of truth;
- [x] Polkadot primitives have narrowly defined roles;
- [x] query/scale requirements do not depend on downloading global state;
- [x] keys remain off the backend;
- [x] private expense data is not placed on public chain/storage by default;
- [x] Statement Store failure cannot lose canonical state;
- [x] chain payment finality remains independently verifiable;
- [x] append-only history is separated from mutable current state;
- [x] migration from the local shell can happen incrementally;
- [x] the architecture aligns with first-party Parity reference patterns rather than inventing a pseudo-database from chain primitives.

Implementation evidence is intentionally not claimed here. This is a G0 architecture decision.

---

## References

ChopDot:

- `docs/research/RESEARCH-001_PARITY_REFERENCE_ARCHITECTURE.md`
- `docs/SECURITY_TRUST_MODEL.md`
- `docs/ARCHITECTURE_DECISIONS.md`
- `docs/ENGINEERING_STANDARDS.md`
- `docs/QUALITY_GATE.md`
- `PAYMENT_INTENT_CONTRACT.md`
- `PAYMENT_INTENT_SERVICE_FOUNDATION.md`
- `SECURITY_FOUNDATION.md`

Parity first-party:

- https://github.com/paritytech/product-sdk
- https://github.com/paritytech/dotli-starter
- https://github.com/paritytech/polkadot-apps
- https://github.com/paritytech/polkadot-desktop-community
- https://github.com/paritytech/identity-backend-community
- https://github.com/paritytech/polkadot-hub-app
