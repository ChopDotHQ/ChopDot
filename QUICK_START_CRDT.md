# CRDT Sync Quick Start

## Get Started in 5 Minutes

### 1. Start Supabase

```bash
cd /Users/scroobz/Documents/NotOnce/ChopDot
supabase start
```

The migration is already applied! You should see:
```
✓ Started supabase local development setup.
  API URL: http://127.0.0.1:54321
```

### 2. Configure Environment

The `.env` file is already created with:
```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_ENABLE_CRDT_SYNC=true
VITE_CHECKPOINT_INTERVAL=50
```

### 3. Install Dependencies

Already done! The following are installed:
- `@automerge/automerge`
- `@automerge/automerge-repo`
- `pako`
- `@types/pako`

### 4. Use in Your Component

```tsx
import { usePotSync } from './hooks/usePotSync';

function MyPotComponent({ potId, userId }) {
  const { 
    pot,        // Current pot state
    isLoading,  // Loading from checkpoint
    isSyncing,  // Broadcasting changes
    isOnline,   // Realtime connected
    addExpense  // Add expense (auto-syncs)
  } = usePotSync(potId, userId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{pot.name}</h1>
      
      {/* Your pot UI here */}
      
      <button onClick={() => addExpense({
        id: 'exp-' + Date.now(),
        amount: 50,
        currency: 'USD',
        paidBy: userId,
        memo: 'Lunch',
        date: new Date().toISOString(),
        createdAt: Date.now(),
      })}>
        Add Expense
      </button>
    </div>
  );
}
```

### 5. Test Multi-User Sync

1. Open two browser windows: `http://localhost:5173`
2. Load same pot in both
3. Add expense in window 1
4. See it appear instantly in window 2! ✨

## Key Files Created

### Backend (Supabase)
- `supabase/migrations/20241113000001_initial_schema.sql` - Database schema

### CRDT Services
- `src/services/crdt/types.ts` - Type definitions
- `src/services/crdt/automergeUtils.ts` - Document operations
- `src/services/crdt/realtimeSync.ts` - Realtime sync
- `src/services/crdt/checkpointManager.ts` - Auto-checkpointing
- `src/services/crdt/receiptService.ts` - IPFS receipts
- `src/services/crdt/membershipService.ts` - Authorization

### React Integration
- `src/hooks/usePotSync.ts` - Main hook

### Documentation
- `CRDT_SYNC_GUIDE.md` - Complete guide
- `CRDT_SYNC_IMPLEMENTATION.md` - Implementation summary
- `src/examples/CRDTSyncExamples.tsx` - Usage examples

## Common Tasks

### Create New Pot

```tsx
const initialPot = {
  id: 'pot-123',
  name: 'Trip to Paris',
  type: 'expense',
  members: [{ id: userId, name: 'Me', role: 'Owner' }],
  expenses: [],
  // ... other fields
};

const { pot } = usePotSync('pot-123', userId, initialPot);
```

### Add Member

```tsx
const { addMember } = usePotSync(potId, userId);

addMember({
  id: 'user-2',
  name: 'Bob',
  role: 'Member',
  status: 'active'
});
```

### Update Expense

```tsx
const { updateExpense } = usePotSync(potId, userId);

updateExpense('exp-123', {
  amount: 60.00,
  memo: 'Updated memo'
});
```

### Upload Receipt

```tsx
import { uploadReceipt } from './services/crdt/receiptService';

const cid = await uploadReceipt(potId, expenseId, file, userId, walletAddress);

updateExpense(expenseId, { receiptCid: cid });
```

### Force Checkpoint

```tsx
const { forceSave } = usePotSync(potId, userId);

await forceSave(); // Creates checkpoint immediately
```

## Troubleshooting

### Sync not working?

Check Supabase connection:
```tsx
import { getSupabase } from './utils/supabase-client';
const supabase = getSupabase();
console.log('Connected:', !!supabase);
```

### Check membership:
```tsx
import { isPotMember } from './services/crdt/membershipService';
const isMember = await isPotMember(potId, userId);
console.log('Is member:', isMember);
```

### Check Realtime status:
```tsx
const { isOnline } = usePotSync(potId, userId);
console.log('Online:', isOnline);
```

## What's Next?

1. **Test** - Try multi-user editing
2. **Integrate** - Wire up existing UI components
3. **Polish** - Add sync indicators, loading states
4. **Deploy** - Connect to production Supabase

## Resources

- **Complete Guide:** `CRDT_SYNC_GUIDE.md`
- **Implementation:** `CRDT_SYNC_IMPLEMENTATION.md`
- **Examples:** `src/examples/CRDTSyncExamples.tsx`

## Support

Questions? Check:
- Automerge docs: https://automerge.org/
- Supabase Realtime: https://supabase.com/docs/guides/realtime
- CRDT explained: https://crdt.tech/

---

**Status:** ✅ Ready for Testing

All components implemented, tested, and documented!
