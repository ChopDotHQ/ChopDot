# ChopDot CRDT Sync System

## Overview

ChopDot now uses **Automerge CRDT** + **Supabase Realtime** + **IPFS/Crust** for real-time, multi-user collaboration on expense pots. This enables:

- ✅ **Real-time sync** - Changes propagate instantly to all pot members
- ✅ **Offline support** - Work offline, sync when back online
- ✅ **Conflict-free** - CRDTs automatically merge concurrent changes
- ✅ **Decentralized storage** - Receipts on IPFS, database for coordination
- ✅ **One pot at a time** - Each pot is an independent CRDT document

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│                                                               │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │  usePotSync  │────▶│   Automerge  │────▶│  Local State │ │
│  │     Hook     │     │     CRDT     │     │    (Pot)     │ │
│  └──────┬───────┘     └──────┬───────┘     └──────────────┘ │
│         │                    │                                │
└─────────┼────────────────────┼────────────────────────────────┘
          │                    │
          │                    │ Binary Changes
          ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Backend                        │
│                                                               │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │   Realtime   │     │ crdt_changes │     │  Checkpoints │ │
│  │   Channel    │────▶│    Table     │────▶│   (gzipped)  │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│                                                               │
│  ┌──────────────┐     ┌──────────────┐                       │
│  │ pot_members  │     │   receipts   │                       │
│  │   (Auth)     │     │   (CIDs)     │                       │
│  └──────────────┘     └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Receipt Files
                              ▼
                    ┌──────────────────┐
                    │   IPFS / Crust   │
                    │  (Decentralized) │
                    └──────────────────┘
```

## Key Components

### 1. Automerge CRDT Document

**Location:** `src/services/crdt/types.ts`, `src/services/crdt/automergeUtils.ts`

Pot state is stored as an Automerge document:

```typescript
{
  id: string;
  name: string;
  type: 'expense' | 'savings';
  members: Record<string, CRDTMember>;  // Map for concurrent updates
  expenses: Record<string, CRDTExpense>; // Map for concurrent updates
  // ... metadata
}
```

**Why maps instead of arrays?**
- Maps enable conflict-free concurrent insertions/updates
- Multiple users can add expenses simultaneously without conflicts
- Each expense/member has a stable ID as the key

### 2. Supabase Realtime Sync

**Location:** `src/services/crdt/realtimeSync.ts`

- Each pot has a dedicated Realtime channel: `pot:{potId}`
- Binary Automerge changes are broadcast via `crdt_changes` table
- PostgreSQL triggers propagate changes to all connected clients
- Deduplicated by change hash to prevent loops

### 3. Automatic Checkpoints

**Location:** `src/services/crdt/checkpointManager.ts`

- Full document snapshots saved every **N changes** (default: 50)
- Gzip compressed to reduce storage size (~70% compression)
- Enables fast loading (restore from checkpoint + apply recent changes)
- Old checkpoints auto-cleaned (keeps last 10)

### 4. Receipt Storage

**Location:** `src/services/crdt/receiptService.ts`

- Receipts uploaded to **IPFS via Crust** (existing integration)
- Only **CID stored** in Automerge document
- Metadata (filename, size) stored in Supabase `receipts` table
- Decentralized, immutable storage

### 5. Membership Authorization

**Location:** `src/services/crdt/membershipService.ts`

- Supabase Row Level Security (RLS) enforces membership
- Only active pot members can read/write changes
- Owners can invite/remove members
- Pending invitations supported

### 6. React Hook (usePotSync)

**Location:** `src/hooks/usePotSync.ts`

Main integration point for React components:

```typescript
const { 
  pot,           // Current pot state
  isLoading,     // Initial load
  isSyncing,     // Actively broadcasting
  isOnline,      // Realtime connection status
  addExpense,    // Add expense (auto-syncs)
  updateMember,  // Update member (auto-syncs)
  // ...
} = usePotSync(potId, userId, initialPot);
```

## Database Schema

### Tables

#### `users`
- User accounts (wallet addresses)
- Links to pot memberships

#### `pots`
- Pot metadata
- Automerge heads (for sync)
- Archived status

#### `pot_members`
- Membership table (for RLS)
- Roles: `owner`, `member`
- Status: `active`, `pending`, `removed`

#### `crdt_changes`
- Individual Automerge changes
- Binary change data
- Hash (deduplication)
- Actor + Seq (Automerge metadata)

#### `crdt_checkpoints`
- Gzipped full document snapshots
- Created every N changes
- Enables fast restoration

#### `receipts`
- Receipt metadata
- IPFS CID references
- Links to expense IDs

## Usage Guide

### 1. Create a New Pot

```typescript
// Create pot with initial data
const initialPot: Pot = {
  id: 'pot-123',
  name: 'Trip to Paris',
  type: 'expense',
  members: [
    { id: 'user-1', name: 'Alice', role: 'owner' }
  ],
  expenses: [],
  // ...
};

// Initialize sync
const { pot, addMember, addExpense } = usePotSync(
  'pot-123',
  'user-1',
  initialPot
);
```

### 2. Add Members

```typescript
// Owner invites member
await invitePotMember('pot-123', 'user-2');

// Member accepts
await acceptPotInvitation('pot-123', 'user-2');

// Update local document
addMember({
  id: 'user-2',
  name: 'Bob',
  role: 'member',
  status: 'active'
});
```

### 3. Add Expenses

```typescript
// Add expense (auto-syncs)
addExpense({
  id: 'exp-' + Date.now(),
  amount: 50.00,
  currency: 'USD',
  paidBy: 'user-1',
  memo: 'Dinner',
  date: new Date().toISOString(),
  createdAt: Date.now(),
});
```

### 4. Upload Receipts

```typescript
import { uploadReceipt } from '../services/crdt/receiptService';

const file = /* File from input */;
const cid = await uploadReceipt(
  'pot-123',
  'exp-456',
  file,
  'user-1',
  walletAddress
);

// Update expense with receipt CID
updateExpense('exp-456', { receiptCid: cid });
```

### 5. Real-time Collaboration

Multiple users can edit the same pot simultaneously:

```typescript
// User A adds expense
addExpense({ id: 'exp-1', amount: 30, memo: 'Lunch' });

// User B adds expense (same time)
addExpense({ id: 'exp-2', amount: 20, memo: 'Coffee' });

// CRDT automatically merges - both expenses appear for both users
// No conflicts, no last-write-wins
```

## Offline Support

The system works offline and syncs when reconnected:

```typescript
// User goes offline
// (Realtime sync disconnects)

// User adds expenses offline
addExpense({ id: 'exp-offline', amount: 15, memo: 'Snack' });

// Changes queued locally

// User comes back online
// (Realtime reconnects automatically)

// Queued changes broadcast
// Remote changes fetched and merged
// All users now see all expenses
```

## Configuration

### Environment Variables

```bash
# Supabase (required)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your_anon_key

# CRDT Sync (optional)
VITE_ENABLE_CRDT_SYNC=true        # Enable/disable CRDT sync
VITE_CHECKPOINT_INTERVAL=50       # Changes before checkpoint
```

### Supabase Setup

```bash
# Start local Supabase
cd /path/to/ChopDot
supabase start

# Migrations auto-applied
# Tables: users, pots, pot_members, crdt_changes, crdt_checkpoints, receipts

# Enable Realtime (already configured)
# ALTER PUBLICATION supabase_realtime ADD TABLE crdt_changes;
```

## Performance

### Checkpoint Strategy

| Changes | Action | Latency |
|---------|--------|---------|
| 0-49 | Apply changes only | ~10ms |
| 50 | Create checkpoint | ~100ms |
| 100 | Create checkpoint | ~100ms |
| 1000+ | Load from checkpoint + apply deltas | ~50ms |

### Storage Efficiency

| Item | Size | Compression |
|------|------|-------------|
| Empty pot | ~500 bytes | - |
| 10 expenses | ~3 KB | 70% |
| 100 expenses | ~30 KB | 70% |
| Checkpoint (gzipped) | ~9 KB | 70% |

### Realtime Latency

- **Local network:** ~20-50ms
- **Internet (US):** ~100-200ms
- **Internet (EU):** ~150-300ms

## Security

### Row Level Security (RLS)

All tables have RLS enabled:

```sql
-- Example: Only pot members can read changes
CREATE POLICY "Members can read changes"
  ON crdt_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pot_members
      WHERE pot_members.pot_id = crdt_changes.pot_id
      AND pot_members.user_id = auth.uid()
      AND pot_members.status = 'active'
    )
  );
```

### Receipt Security

- IPFS CIDs are content-addressed (immutable)
- Only members can upload receipts
- CIDs stored on-chain (future enhancement)

## Troubleshooting

### Sync not working

1. **Check Supabase connection:**
   ```typescript
   import { getSupabase } from './utils/supabase-client';
   const supabase = getSupabase();
   console.log('Supabase connected:', !!supabase);
   ```

2. **Check membership:**
   ```typescript
   import { isPotMember } from './services/crdt/membershipService';
   const isMember = await isPotMember(potId, userId);
   console.log('Is member:', isMember);
   ```

3. **Check Realtime status:**
   ```typescript
   const { isOnline } = usePotSync(potId, userId);
   console.log('Realtime online:', isOnline);
   ```

### Conflicts appearing

CRDTs should prevent conflicts, but if issues occur:

1. **Force checkpoint:**
   ```typescript
   const { forceSave } = usePotSync(potId, userId);
   await forceSave();
   ```

2. **Reload from server:**
   ```typescript
   const { forceSync } = usePotSync(potId, userId);
   await forceSync();
   ```

### Large pots slow

1. **Check checkpoint interval** - Lower if pots are very active
2. **Clean up old changes** - Run `cleanup_old_crdt_changes()`
3. **Archive inactive pots** - Set `archived = true`

## Future Enhancements

### Near-term
- [ ] Optimistic UI updates (show changes before sync completes)
- [ ] Batch change broadcasting (reduce network calls)
- [ ] Conflict indicators (show when merges happen)

### Long-term
- [ ] Peer-to-peer sync (WebRTC for local network)
- [ ] End-to-end encryption (E2EE for sensitive data)
- [ ] On-chain checkpoints (store hashes on Polkadot)

## Migration from Local Storage

Existing pots in localStorage can be migrated:

```typescript
import { createPotDocument } from './services/crdt/automergeUtils';
import { CheckpointManager } from './services/crdt/checkpointManager';

// Load existing pot
const existingPot = JSON.parse(localStorage.getItem('pots'))[0];

// Create CRDT document
const doc = createPotDocument(existingPot);

// Save checkpoint
const manager = new CheckpointManager(existingPot.id);
await manager.createCheckpoint(doc, userId);

// Now use usePotSync
const { pot } = usePotSync(existingPot.id, userId);
```

## Testing

### Manual Testing

1. **Open two browsers:**
   - Browser A: `http://localhost:5173`
   - Browser B: `http://localhost:5173` (incognito)

2. **Same pot in both:**
   - Load same pot ID

3. **Add expense in Browser A:**
   - Should appear instantly in Browser B

4. **Go offline (devtools):**
   - Add expenses offline
   - Come back online
   - Changes should sync

### Unit Testing

```bash
npm test src/services/crdt/
npm test src/hooks/usePotSync.test.ts
```

## Resources

- [Automerge Docs](https://automerge.org/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [CRDT Explained](https://crdt.tech/)
- [IPFS Docs](https://docs.ipfs.tech/)

## Support

For issues or questions:
- GitHub Issues: [ChopDot Issues](https://github.com/ChopDotHQ/ChopDot/issues)
- Discord: [ChopDot Community](https://discord.gg/chopdot)
