# Statement Store / Bulletin split

Status: **SUPERSEDED — measurements valid, architecture rejected**
Applies to: portable shell (`codex/portable-shell-trial`)
Date: 2026-07-27

## Read this first

The **measured SDK limits below are correct and worth keeping**. The
architecture built on them is not, and should not be implemented.

This document proposes Bulletin as ChopDot's durable event log with the
statement store carrying transitions. That contradicts decisions already
recorded elsewhere in the repo:

- `docs/adr/0005-portable-product-native-host-boundary.md` (`source_of_truth: true`)
- `docs/wiki/05-polkadot-native/bulletin.md` — "Bulletin is a candidate storage
  layer for **redacted closeout receipts**"; "Storage is not payment truth"
- `.local-private/chopdot-tech-adapter-atlas/reports/PARITY_PRODUCT_STACK_CHOPDOT_MAPPING_2026_06_09.md`
  — statement store: "Defer; current ChopDot truth should stay typed app event
  history"; storage: "Authorization/quota and retrieval UX need testing"

The settled position is: **ChopDot's truth stays its own typed event history.
Bulletin holds a redacted receipt artifact per closeout. The statement store is
transport, not truth.** Under that architecture most of the design below is
unnecessary — there is no anchor problem, and authorization applies to roughly
one write per closeout rather than one per event.

Kept for the measurements and for the record of what was ruled out and why.

The open question that remains, per `bulletin.md`: receipt packet **submit and
retrieval are unproven** against a live host.

---

How ChopDot's shared state lives without a backend. This must be settled before
the settlement path is ported from the main app.

## SDK limits (measured, not assumed)

From `@parity/product-sdk-statement-store` (`types-M8eIKlMz.d.ts`):

```
MAX_STATEMENT_SIZE  = 512    // bytes, per statement payload
MAX_USER_TOTAL      = 1024   // bytes, TOTAL per user
DEFAULT_TTL_SECONDS = 30
```

And on `PublishOptions.channel`: *"For a given channel, only the most recent
statement is kept."* The SDK's own examples are `presence/peer-abc123` and
`handshake/alice-bob`.

**`MAX_USER_TOTAL = 1024` is the constraint that determines the architecture.**
A user may hold ~1 KB in the statement store at any moment. At the compact
sizes measured earlier, that is:

| Action | Compact size | Concurrent per user |
|---|---|---|
| `MARK_PAID` | 268 B | 3 |
| `CONFIRM_RECEIVED` | 268 B | 3 |
| `RECORD_MATCHED_PAYMENT` | 444 B | 2 |

The statement store **cannot be an event log**. A 6-person group settling ten
legs would breach the per-user quota immediately, and entries expire in 30 s by
default regardless.

This corrects the earlier draft of this document, which assumed transitions
could stream through the statement store and be folded into checkpoints later.
They cannot.

## Bulletin writes are authorized, not open

Measured 2026-07-27. This is the third constraint and it decides who may write.

The July deploy log shows our own account never wrote to Bulletin:

```
Storage signer: pool fallback (no session)
Using pool account 4: 5C4xnD5VgfPLnfXGcj4w8T9S1gmext48jcyRbxzktrGuMY5V
```

`pad` fell back to a shared pre-authorized pool account. Confirmed by the API —
`authorizeAccount(api, who, transactions, bytes, signer)` grants a finite,
expiring on-chain quota, and `checkAuthorization` returns
`{authorized, remainingTransactions, remainingBytes, expiration}`. Platform docs
state plainly: anyone can read, only accounts holding a live authorization can
store, and for consumer apps the publisher is expected to handle storage on
behalf of users.

**ChopDot users cannot write to Bulletin from their own accounts.** Bulletin is
a publisher-oriented store, not a user data store.

The docs also confirm the anchor pattern: model updatable state by storing a new
version and keeping the CID, held "in contracts, `.dot` records, or other Cloud
Storage objects."

## Layer model

| Layer | Role | Who writes | Lifetime |
|---|---|---|---|
| **Bulletin** | the log and the record — user-signed events, content-addressed | app-authorized account | persistent |
| **Statement store** | signalling — presence and "newest CID I know" | any member | ~30 s, 1 KB/user |
| **Anchor** | durable mutable pointer: group → newest CID | contract | persistent |

Bulletin holds the content. The statement store announces *that* something
changed and where to find it — one stable channel per member, last-write-wins,
so quota stays flat regardless of group activity.

### Integrity vs availability

Because ChopDot must hold the Bulletin authorization, it is a required *writer*.
That is an availability dependency, not an integrity one:

- Events are signed by the acting member. ChopDot **cannot forge or alter** a
  record without detection.
- ChopDot **can withhold** — refuse to write, or fail to serve.

The trust property that matters — *a group's record of who owes what cannot be
silently edited by us* — survives this. The property that does not survive is
*the record remains reachable if we disappear*. Whether that is acceptable is a
product decision, and it is the honest cost of shipping on Bulletin today.

A contract-native log (events written directly to an Asset Hub contract, users
signing and paying their own gas) removes both dependencies. It is the fully
trustless option, costs gas per action, and needs a chain-call layer the shell
does not yet have.

## Event handling

All nine shared actions (`isSharedAction`, `hostSessionSync.ts`) are written to
Bulletin as part of an append-only event log. None stream through the statement
store individually.

| Action | Written to | Announced |
|---|---|---|
| `ADD_USER`, `SET_WALLET_ADDRESS` | Bulletin log | via CID announce |
| `CREATE_GROUP` | Bulletin log | via CID announce |
| `ADD_EXPENSE` | Bulletin log | via CID announce |
| `SEND_REQUEST`, `MARK_PAID`, `CONFIRM_RECEIVED` | Bulletin log | via CID announce |
| `RECORD_MATCHED_PAYMENT` | Bulletin log | via CID announce |
| `SAVE_RECORD` | Bulletin log | via CID announce |

Device-local actions (`SET_THEME`, `SET_CURRENCY`, `UPDATE_USER_NAME`,
`ADD_PAYMENT_METHOD`, `SET_PREFERRED_PAYMENT_METHOD`, `SET_CURRENT_USER`,
`RESET_TO_CLEAN`, `LOAD_DEMO`) stay in `localStorage` and are out of scope.

### The announce message

One per member, on a stable channel so it overwrites rather than accumulates:

- channel: `chopdot/<groupId>/<userId>` — fixed per member per group
- payload: `{v, g, c, n, t}` — version, group id, newest CID, event count, epoch seconds
- size: ~150 B, well inside both 512 B and the 1 KB user total
- republished on every write, and on a heartbeat shorter than the TTL

Because the channel is stable, a member's announce never occupies more than one
slot no matter how active the group is.

## Write path

1. Append the event to the local log.
2. Store the updated log (or a delta segment) to Bulletin → new CID.
3. Publish the announce on the member's stable channel.

Segmenting rather than rewriting the whole log matters once a group is long
lived: each segment references `previousCid`, forming a chain. Concurrent
writers produce different CIDs; convergence is by merging event sets, not by
CID equality. **This is the part the earlier draft got wrong** — deterministic
checkpoints only converge if writers see identical event sets, which concurrent
writers by definition do not.

## Cold start

1. Resolve the anchor → newest known CID.
2. Fetch that segment; walk `previousCid` back to genesis.
3. Reduce the event log into state.
4. Subscribe to the group topic; on any announce with a CID we do not hold,
   fetch and merge.

## Compact codec (v1)

Still worth doing — it reduces Bulletin storage and keeps announces small — but
it is no longer load-bearing for a 512 B cap, since events go to Bulletin.
Measured, encrypted + base64:

| | current | compact |
|---|---|---|
| `MARK_PAID` | 540 | 268 |
| `CONFIRM_RECEIVED` | 559 | 268 |
| `SEND_REQUEST` | 600 | 288 |
| `RECORD_MATCHED_PAYMENT` | 1047 | 444 |

Rules: ids as 22-char base64url of 16 raw bytes; integer action codes
(append-only, never reused); amounts as integer minor units; epoch seconds;
single-letter keys; 8-byte actor key prefix.

Integer minor units also removes a latent float-rounding bug in split
arithmetic — `184.5` split three ways does not reconcile cleanly in floats.

## The anchor — experiment result

The earlier draft recommended verifying a "Bulletin stable entry at a derived
key" first. **That option does not exist.** The cloud-storage API is purely
content-addressed — `store(data)`, `queryBytes(cid)`, `queryJson(cid)`,
`hashToCid`, `cidToPreimageKey`. `StoreBuilder` exposes only codec, hash
algorithm, wait-for and progress. There is no naming, no mutable pointer.

The `stable` / `volatile` distinction seen in the July deploy manifest belongs
to `polkadot-app-deploy`'s file classification, not to Bulletin storage.

Remaining candidates:

1. **Contract on Asset Hub** (PolkaVM via `cdm`) storing `groupId → CID`.
   The only durable, member-independent anchor. Costs gas per update. No
   chain-call layer exists in the shell today — `contracts/paymentIntent.ts` is
   a domain model, not chain interaction.
2. **Peer announces only.** No anchor at all: a cold device learns the newest
   CID from any online member. Zero infrastructure, zero gas. Fails when no
   member is online — the group's record is unreachable until someone opens the
   app.
3. **Invite link carries genesis CID.** Helps a new joiner reach the start of
   the chain, but the chain cannot be walked *forward* from genesis, so it does
   not locate the newest state.

Recommendation: **(2) for the devnet milestone, (1) before anyone relies on
it.** Peer announces are enough to demonstrate a working trustless group on the
Products Devnet, and they need no contract work. But "your record is reachable
only while a member is online" is not a property ChopDot can ship as a trust
guarantee — the contract anchor is the real answer and should be scheduled, not
skipped.

## Risks

- **1 KB per-user total** is a hard ceiling on all statement-store use. Any
  future use of the statement store (presence, typing, invites) competes for
  the same 1 KB. Budget it explicitly.
- **30 s default TTL** means announces need a heartbeat, and a member offline
  briefly may miss announcements entirely. Reconciliation must be pull-based on
  reconnect, not purely event-driven.
- **Transaction quota, not just bytes.** Authorizations grant a finite number of
  *transactions* as well as bytes, and they expire. One Bulletin write per event
  is therefore the wrong granularity: a 4-person dinner is ~10 events
  (1 expense + 3 requests + 3 marks + 3 confirms), so per-event writes burn 10
  transactions where one segment write would burn one. **Segment batching is a
  quota requirement, not an optimisation.** Target one write per chapter-close
  plus one per N events.
- **Authorization refresh.** Grants expire by block number. Whatever account
  ChopDot uses needs monitoring and renewal, or writes fail silently mid-group.
  `checkAuthorization` should be a pre-flight on every write path.
- **Concurrent writers fork the chain.** Merging event sets is specified above
  but not designed. Append-only events with a hash chain make this tractable;
  it is still real work.
- **No conflict resolution** for genuine concurrent edits to the same split.

## Implementation order

1. Measure Bulletin write authorization limits (the unmeasured risk above).
2. Codec: spec, `encode`/`decode`, round-trip tests.
3. Bulletin log segments: writer, reader, `previousCid` chaining.
4. Announce channel + heartbeat + pull-based reconcile.
5. Cold-start hydration.
6. Port the settlement transitions onto this substrate.
7. Contract anchor, before any external reliance.
