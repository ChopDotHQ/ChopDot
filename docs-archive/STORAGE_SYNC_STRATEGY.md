# Storage & Sync Strategy (Non-Authoritative) (Draft)

**Purpose**
Describe how storage and sync improve UX without becoming the authority layer. This keeps decentralization invisible to users while preserving JAM alignment.

---

## User-Facing Story (No Crypto Jargon)
- "Your data is backed up."
- "Share a link."
- "Restore if something goes wrong."
Users do not need to know about IPFS, CIDs, or CRDTs.

---

## Roles by Layer

### 1) Local-First State (UX speed + offline)
- Fast reads and writes.
- Works without network.
- Acts as the draft workspace.

### 2) Sync Layer (CRDT / merge)
- Resolves concurrent edits.
- Improves resilience across devices.
- **Not authoritative** for balances/finality.

### 3) IPFS Storage (immutable artifacts)
- Receipts and attachments.
- Periodic pot snapshots (backup/restore).
- Shareable exports (read-only copies).
- Content-addressed CIDs for verification.

### 4) Settlement Rulebook (authority)
- Final balances and settlement.
- Deterministic, signed, append-only.
- Emits canonical state hash.

---

## Data Flow (High-Level)

### Write Path
1) User action creates a signed event.
2) Settlement Rulebook computes state (balances + finality).
3) UI updates local cache for instant feedback.
4) Background snapshot uploads to IPFS (debounced, meaningful changes only).

### Share Path
1) Create snapshot (immutable).
2) Return share link (CID).
3) Import creates a copy (read-only history).

### Restore Path
1) If local data is missing/corrupt, fetch latest backup index.
2) Restore most recent snapshot(s).
3) Rehydrate local state.

---

## Default Decisions (Recommended)
- **Backups:** default on.
- **Encryption:** always client-side before IPFS upload.
- **Signing:** one-time wallet signature for authentication only.
- **Anchoring:** only finalized states; not before the Settlement Rulebook is deterministic.

---

## Risks & Mitigations
- **Key loss = data loss**: communicate once, allow optional recovery export.
- **Signature confusion**: clear language, show message being signed, never repeat.
- **Backup spam**: debounce and only snapshot meaningful changes.

---

## Non-Goals
- Live state authority in IPFS.
- Teaching users how IPFS works.
- Using CRDTs for dispute resolution.

---

## Next Steps (Implementation)
1) Wire automatic backups after pot writes (debounced).
2) Encrypt snapshots client-side before upload.
3) Keep share/restore as read-only copies.
4) Add a simple "Backup/Restore" UX label (no IPFS wording).

---

**Status:** Draft
