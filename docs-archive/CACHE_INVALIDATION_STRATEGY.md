# Cache Invalidation Strategy

Status: Draft  
Last updated: 2026-01-14

## Scope
Document how client caches are invalidated today and the minimum plan to keep data fresh across tabs and devices.

## Current Caches
- **PotRepository** (`src/services/data/repositories/PotRepository.ts`): in-memory cache with TTL (60s). Invalidated on create/update/delete.
- **ExpenseRepository** (`src/services/data/repositories/ExpenseRepository.ts`): in-memory cache with TTL (5s). Invalidated on create/update/delete.
- **SettlementRepository** (`src/services/data/repositories/SettlementRepository.ts`): placeholder TTL (5m); invalidate hook exists but not used yet.
- **usePot/usePots refresh events** (`src/hooks/usePot.ts`, `src/hooks/usePots.ts`): local `window` events (`pot-refresh`, `pots-refresh`) trigger reloads.
- **Price caches** (`src/services/prices/*.ts`): in-memory cache with TTL and stale fallback.
- **IPFS auth signature** (`src/services/storage/ipfsAuth.ts`): per-wallet cached signature in localStorage.
- **User index CID** (`src/services/storage/userIndex.ts`): cached CID in localStorage for quick restore.

## Local Invalidation Triggers (Today)
- **Pot writes** (create/update/delete) invalidate PotRepository caches.
- **Expense writes** invalidate ExpenseRepository caches and emit `pot-refresh` events.
- **UI actions** call `refreshPot()` / `refreshPots()` to force reload.
- **Logout** clears some local caches (auth/session); IPFS signature cleared explicitly when requested.

## Known Gaps
- **Cross-client invalidation**: no realtime push; two devices can drift until TTL expires or a manual refresh occurs.
- **Per-tab isolation**: caches are per-tab; no shared worker or BroadcastChannel sync.
- **ETag/version checks**: no lightweight versioning to skip stale overwrites.

## Proposed Strategy (Near-Term)
1) **Server-driven invalidation**
   - Use Supabase realtime on pot/expense tables.
   - On change, call `refreshPot(potId)` / `refreshPots()` in the client.
2) **Version-aware merges**
   - Use `lastEditAt` or `updatedAt` to detect newer data and avoid overwriting fresh state.
3) **Explicit cache boundaries**
   - Keep TTLs but always invalidate on local writes.
   - Clear caches on logout or when `VITE_DATA_SOURCE` changes.

## Decision Record
- TTL caches are acceptable for local UX but **not** authoritative.
- Realtime invalidation is required before multi-device correctness is relied upon.

## Implementation Checklist
- [ ] Wire Supabase realtime events to `refreshPot`/`refreshPots`.
- [ ] Add `lastEditAt` comparisons to avoid stale overwrites.
- [ ] Document cache clear on logout + account switch in DataContext.
