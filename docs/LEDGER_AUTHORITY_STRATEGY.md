# Settlement Rulebook Authority & Finality Strategy (Draft)

**Purpose**
Define the minimum Settlement Rulebook contract (formerly “LedgerCore”) that removes human authority over balances and settlement while staying JAM-aligned.

---

## Core Principle
**Authority lives in deterministic rules, not in humans or servers.**
The ledger accepts only signed events, computes state deterministically, and declares finality explicitly.

---

## Irreducible Settlement Rulebook Responsibilities

1) **Accept only signed events**
- Every state change originates from a participant identity.
- No server-generated or admin-injected events.
- If the event is not signed, it does not exist.

2) **Append-only event log**
- Past events are never mutated or deleted.
- Corrections happen as new events with explicit causality.

3) **Deterministic balances**
- Given the same ordered event list + same rules version, the ledger produces identical balances.
- No timestamps as logic inputs.
- Avoid floating ambiguity (use fixed-precision minor units or explicit rounding rules).

4) **Explicit finality**
- Finality is a state transition, not a UI label.
- Example event: `GroupFinalized(group_id, state_hash)`.
- After finality, balances cannot change without a new state/epoch.

5) **Canonical state hash**
- The Settlement Rulebook emits a canonical serialization + deterministic hash after finality.
- This hash is the verification target and the future JAM anchor.

---

## Non-Goals (Settlement Rulebook v1)
- UI concerns
- Sync/CRDT merge logic
- Storage optimization
- Notifications
- Analytics
- Retries or heuristic fixes

The Settlement Rulebook should feel strict and unforgiving. That is the point.

---

## Authority Boundary (Hard Rule)
**No feature may bypass the Settlement Rulebook to alter balances, ever.**

---

## Integration Model (Current Stack)
- **CRDT/local-first** handles draft state and offline capture.
- **Settlement Rulebook** defines final balances and finality.
- **IPFS** stores immutable artifacts (receipts, snapshots, exports) and can store state hashes.
- **Supabase** can serve as transport/persistence, but never as authority.

---

## Minimal Implementation Path
1) Define the event schema and signing requirements.
2) Implement deterministic state builder from ordered events.
3) Add finality event + canonical state hashing.
4) Ensure all balance-affecting writes go through the Settlement Rulebook.
5) Store hashes for later JAM anchoring (no on-chain anchoring yet).

---

## Open Questions
- What is the canonical event ordering rule (time, sequence, signature, or monotonic counter)?
- Which event types are required in v1 (AddExpense, SettleGroup, AddMember, etc.)?
- How do we version deterministic rules across upgrades?

---

**Status:** Draft
