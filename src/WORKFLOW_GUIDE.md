# ChopDot Workflow Guide

**Last Updated:** October 15, 2025  
**Purpose:** Explain all major user workflows and their implementation

---

## 📋 Table of Contents

1. [Expense Attestation Workflow](#expense-attestation-workflow)
2. [Checkpoint System Workflow](#checkpoint-system-workflow)
3. [Settlement Workflow (Pot-Scoped vs Global)](#settlement-workflow)
4. [Activity Feed Generation](#activity-feed-generation)
5. [Navigation Context Tracking](#navigation-context-tracking)
6. [Person vs Member Distinction](#person-vs-member-distinction)

---

## 1. Expense Attestation Workflow

### Purpose
Confirm that an expense is accurate and legitimate. Builds trust and prevents fraud.

### User Flow
```
1. Alice adds "Groceries $50" to "SF Roommates" pot
2. Bob sees notification: "Alice added Groceries $50"
3. Bob opens expense detail → Clicks "Confirm"
4. attestExpense() called → expense.attestations.push("bob")
5. Alice sees "✓ Bob confirmed expense"
```

### Code Implementation
```typescript
// Location: App.tsx, line ~1015
const attestExpense = (expenseId: string) => {
  // Rules:
  // 1. You CANNOT attest your own expenses
  // 2. You can only attest once per expense
  // 3. Stored in expense.attestations[] array
}
```

### Key Rules
- ❌ Cannot attest your own expenses (prevents fraud)
- ❌ Cannot attest twice
- ✅ Builds trust score (more attestations = more reliable)

### Batch Attestation
```
Single Pot: batchAttestExpenses(expenseIds)
  - Used by: PotHome "Confirm All" button
  - Scope: Single pot only

All Pots: handleBatchConfirmAll()
  - Used by: Activity tab FAB → BatchConfirmSheet
  - Scope: All pending expenses across all pots
  - Groups by pot before attesting
```

---

## 2. Checkpoint System Workflow

### Purpose
Before settling, members confirm that ALL expenses have been entered (no missing expenses).

### Problem It Solves
**Scenario without checkpoints:**
```
1. Alice & Bob split rent ($1000)
2. Bob settles immediately
3. Alice remembers "Oh wait, I also paid utilities ($100)"
4. Now Bob owes Alice $50 more, but already "settled"
5. Messy re-settlement needed
```

**With checkpoints:**
```
1. Alice clicks "Settle" → Checkpoint created
2. All members review expenses → Click "Confirm"
3. When ALL confirm → Proceed to settlement
4. If someone adds expense after confirming → Their confirmation resets
```

### State Transitions
```
"pending" → Waiting for confirmations
"confirmed" → All confirmed, auto-clear and proceed
"bypassed" → User skipped, proceed anyway
```

### User Flow
```
1. User in PotHome clicks "Settle"
   → createCheckpoint(potId) creates checkpoint

2. Navigate to CheckpointStatusScreen
   → Shows who confirmed, who hasn't

3. Each member reviews expenses
   → Clicks "Confirm" → confirmCheckpoint()

4. When ALL confirm
   → Auto-proceed to SettleSelection after 800ms

5. OR user clicks "Settle Anyway"
   → bypassCheckpoint() → Skip to SettleSelection
```

### Invalidation Rules
```typescript
// When adding expense:
if (p.currentCheckpoint?.status === "pending" && userHasConfirmed) {
  // Reset user's confirmation
  updatedConfirmations.set("owner", { confirmed: false });
}
```

**Why?** Forces re-review if data changed after you confirmed.

### Code Locations
- `createCheckpoint()` - Line ~1144
- `confirmCheckpoint()` - Line ~1177
- `bypassCheckpoint()` - Line ~1210
- `clearCheckpoint()` - Line ~1232

### Future Enhancement
- Auto-confirm after 48 hours (NOT YET IMPLEMENTED)
- Would need background job or check on next visit

---

## 3. Settlement Workflow

### Two Types of Settlements

ChopDot supports both **pot-scoped** and **global** settlements.

#### 1. Pot-Scoped Settlement
```
Triggered from: PotHome → "Settle" button
Scope: Only this pot's debts
currentPotId: SET
```

**Flow:**
```
1. User in PotHome → Clicks "Settle"
2. Creates checkpoint (if enabled)
3. After checkpoint confirmed → Navigate to SettleSelection
4. SettleSelection shows balances for THIS POT ONLY
5. User selects person → Navigate to SettleHome
6. SettleHome shows pot name badge
7. After settlement → Back to PotHome
```

#### 2. Global Settlement
```
Triggered from: PeopleHome → "Settle" on person
Scope: All pots
currentPotId: NULL
```

**Flow:**
```
1. User in PeopleHome → Clicks "Settle" on person
2. Navigate to SettleHome (no checkpoint for global)
3. SettleHome shows "All pots" badge
4. After settlement → Reset to PeopleHome
```

### How Scope is Determined
```typescript
// Location: settle-selection case, line ~1970
const settleScope = currentPotId ? "pot" : "global";

// Pot-scoped calculation
const scopedSettlements = currentPotId && getCurrentPot()
  ? calculatePotSettlements(getCurrentPot()!, "owner")
  : balances; // Global calculation
```

### Code Implementation
- Settle Selection: Line ~1988
- Settle Home: Line ~2026
- Scope logic: Checks `currentPotId` to determine pot vs global

---

## 4. Activity Feed Generation

### Purpose
Unified timeline showing all activity: expenses, attestations, settlements.

### Challenge: Synthetic IDs
Attestations don't have their own DB records (they're just strings in `expense.attestations[]`).

**Solution:** Generate synthetic IDs
```typescript
// Format: `${expense.id}-attestation-${attesterId}`
// Example: "e1-attestation-alice"

// Reverse lookup (when user clicks attestation):
const expenseId = activity.id.split('-attestation-')[0];
```

### Challenge: No Attestation Timestamps
We don't store WHEN someone attested (only WHO).

**Workaround:** Estimate timestamps
```typescript
// Estimate as expense.date + (index * 2 hours)
const attestationTime = new Date(
  new Date(expense.date).getTime() + (index + 1) * 2 * 60 * 60 * 1000
).toISOString();
```

**TODO for Production:**
Change `Expense.attestations` from `string[]` to:
```typescript
attestations: {
  userId: string;
  confirmedAt: string;
}[]
```

### Performance
- Runs on every render (memoized by `[pots]`)
- Warns if calculation takes > 10ms
- Current: ~5ms for 50 items

### Code Location
- Activity Feed Generation: Line ~1425

---

## 5. Navigation Context Tracking

### Problem
How do screens know which pot/expense/person to display?

### Solution: Context IDs
```typescript
const [currentPotId, setCurrentPotId] = useState<string | null>(null);
const [currentExpenseId, setCurrentExpenseId] = useState<string | null>(null);
const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string | null>(null);
```

### When Each is Set

#### currentPotId
```
SET when:
- Navigating to pot-home
- Navigating to add-expense
- Navigating to settle-selection (pot-scoped)

CLEARED when:
- Returning to root tabs (pots-home, people-home, etc.)

Used by:
- PotHome (which pot to display)
- AddExpense (which pot to add to)
- SettleSelection (pot-scoped vs global)
```

#### currentExpenseId
```
SET when:
- Navigating to expense-detail
- Navigating to edit-expense

CLEARED when:
- Deleting expense
- Navigating away from expense screens

Used by:
- ExpenseDetail (which expense to display)
- EditExpense (which expense to update)
```

#### selectedCounterpartyId
```
SET when:
- Clicking "Settle" on person from people list
- Clicking person in SettleSelection

CLEARED when:
- Completing settlement

Used by:
- SettleHome (which person we're settling with)
```

### Alternative Approaches
❌ Passing IDs through props - verbose, cluttered
✅ Context IDs - clean, implicit context

---

## 6. Person vs Member Distinction

### Two Similar Concepts

#### Member (Type: `Member`)
```typescript
interface Member {
  id: string;
  name: string;
  role?: "Owner" | "Member";
  status?: "active" | "pending";
}
```
- **Belongs to:** A specific pot
- **Properties:** Pot-specific (role, status)
- **Stored in:** `pot.members[]`
- **Use case:** Pot membership, permissions

#### Person (Type: `Person`)
```typescript
interface Person {
  id: string;
  name: string;
  balance: number;
  trustScore: number;
  paymentPreference: string;
  potCount: number;
}
```
- **Belongs to:** Global (across all pots)
- **Properties:** Settlement-specific (balance, trust, payment)
- **Derived from:** De-duplicating members from all pots
- **Use case:** Settlements, people view, trust scores

### Conversion: Members → People
```typescript
// Location: Line ~489
const people: Person[] = useMemo(() => {
  const peopleMap = new Map<string, Person>();
  
  // Iterate all pots
  pots.forEach(pot => {
    pot.members.forEach(member => {
      // De-duplicate by ID
      if (member.id !== "owner" && !peopleMap.has(member.id)) {
        // Convert to Person format
        peopleMap.set(member.id, {
          id: member.id,
          name: member.name,
          balance: 0,
          trustScore: 95,
          paymentPreference: "Bank",
          potCount: 0,
        });
      }
    });
  });

  return Array.from(peopleMap.values());
}, [pots]);
```

### When to Use Each

Use **Member**:
- Adding someone to a pot
- Displaying pot members
- Checking pot permissions

Use **Person**:
- Calculating settlements
- Displaying people view
- Trust score calculations
- Payment preferences

---

## 7. Modal State Management

### Pattern
Simple boolean flags for each modal/sheet.

```typescript
const [showNotifications, setShowNotifications] = useState(false);
const [showWalletSheet, setShowWalletSheet] = useState(false);
const [showYouSheet, setShowYouSheet] = useState(false);
// ... 7 more modal flags
```

### Why Not Consolidated?
**Pros of current approach:**
- Simple, straightforward
- No abstraction overhead
- Easy to trace which modal is open
- Direct control

**Cons:**
- Many state variables (10+ modals)
- Could be verbose

**When to refactor:**
- If modals grow beyond 15+
- If modal logic becomes complex (stacking, transitions)
- If you need modal history/back behavior

**Recommended refactor:**
```typescript
// useReducer approach (if needed)
const [modalState, dispatch] = useReducer(modalReducer, {
  notifications: false,
  wallet: false,
  youSheet: false,
  // ... etc
});

dispatch({ type: 'OPEN_MODAL', modal: 'notifications' });
```

---

## 🎯 Quick Reference

### Terminology Clarification

| Term | Meaning | Use Case |
|------|---------|----------|
| **Attestation** | Confirming an expense is correct | Per-expense validation |
| **Checkpoint** | Confirming all expenses are entered | Pre-settlement verification |
| **Confirmation** | Can mean either (context-dependent) | Be specific! |
| **Member** | Person in a pot | Pot membership |
| **Person** | Global contact | Settlements, trust |
| **Pot-scoped** | Single pot only | Settlement from PotHome |
| **Global** | All pots | Settlement from PeopleHome |

### Common Questions

**Q: Why separate attestation and checkpoint?**
A: Different purposes:
- Attestation = "This expense is correct" (fraud prevention)
- Checkpoint = "All expenses entered" (nothing missing)

**Q: Can I attest my own expense?**
A: No. Prevents fraud.

**Q: What happens if someone adds expense after checkpoint?**
A: Their confirmation resets → Must re-confirm.

**Q: How do I settle just one pot vs all pots?**
A: 
- One pot: Click "Settle" from PotHome
- All pots: Click "Settle" from PeopleHome

**Q: Why synthetic IDs for attestations?**
A: Attestations aren't DB records (yet). Temporary workaround.

---

## 🔧 Future Improvements

### Short-term
- [ ] Store attestation timestamps (change `string[]` to `object[]`)
- [ ] Implement 48-hour checkpoint expiry
- [ ] Add checkpoint notification reminders

### Long-term
- [ ] Consolidate modal state with useReducer
- [ ] Extract complex workflows to custom hooks
- [ ] Add workflow state machines (XState?)

---

**Questions?** See [App.tsx](./App.tsx) for implementation details.
