# ChopDot Data Layer API Reference

**Version:** 1.0.0  
**Last Updated:** 2025-01-14

## Overview

The ChopDot Data Layer provides a clean abstraction over data persistence, supporting both localStorage (current) and future API backends. All services follow a consistent pattern with typed DTOs, validation, and error handling.

### Architecture

```
UI Components
    ↓
Services (PotService, ExpenseService, MemberService, SettlementService)
    ↓
Repositories (PotRepository, ExpenseRepository, MemberRepository, SettlementRepository)
    ↓
Data Sources (LocalStorageSource, HttpSource)
```

### Usage

```typescript
import { useData } from './services/data/DataContext';

function MyComponent() {
  const { pots, expenses, members, settlements } = useData();
  
  // Use services
  const allPots = await pots.listPots();
  const pot = await pots.getPot('pot-123');
}
```

---

## Services

### PotService

Business logic layer for pot operations. Handles validation, checkpoint hints, and export/import.

#### `createPot(input: CreatePotDTO): Promise<Pot>`

Create a new pot.

**Parameters:**
- `input` (CreatePotDTO): Pot creation data
  - `name` (string, required): Pot name
  - `type` ('expense' | 'savings', required): Pot type
  - `baseCurrency` ('DOT' | 'USD', optional): Default 'USD'
  - `budget` (number | null, optional): Budget amount
  - `budgetEnabled` (boolean, optional): Default false
  - `checkpointEnabled` (boolean, optional): Enable checkpoint feature
  - `goalAmount` (number, optional): Savings goal amount
  - `goalDescription` (string, optional): Savings goal description
  - `members` (Member[], optional): Initial members (defaults to owner only)

**Returns:** `Promise<Pot>` - Created pot with generated ID

**Throws:**
- `ValidationError` (400): If name is empty or type is invalid

**Example:**
```typescript
const pot = await potService.createPot({
  name: 'Weekend Trip',
  type: 'expense',
  baseCurrency: 'USD',
  budget: 500,
  budgetEnabled: true,
});
```

---

#### `getPot(id: string): Promise<Pot>`

Get a pot by ID.

**Parameters:**
- `id` (string): Pot ID

**Returns:** `Promise<Pot>` - Pot object

**Throws:**
- `NotFoundError` (404): If pot not found

**Example:**
```typescript
const pot = await potService.getPot('pot-123');
```

---

#### `listPots(): Promise<Pot[]>`

List all pots.

**Returns:** `Promise<Pot[]>` - Array of all pots

**Example:**
```typescript
const pots = await potService.listPots();
```

---

#### `updatePot(id: string, updates: UpdatePotDTO): Promise<Pot>`

Update a pot.

**Parameters:**
- `id` (string): Pot ID
- `updates` (UpdatePotDTO): Partial pot data to update
  - `name` (string, optional)
  - `baseCurrency` ('DOT' | 'USD', optional)
  - `budget` (number | null, optional)
  - `budgetEnabled` (boolean, optional)
  - `checkpointEnabled` (boolean, optional)
  - `archived` (boolean, optional)
  - `goalAmount` (number, optional)
  - `goalDescription` (string, optional)
  - `lastBackupCid` (string, optional): IPFS CID for backup

**Returns:** `Promise<Pot>` - Updated pot

**Throws:**
- `NotFoundError` (404): If pot not found

**Example:**
```typescript
const updated = await potService.updatePot('pot-123', {
  name: 'Updated Name',
  budget: 600,
});
```

---

#### `deletePot(id: string): Promise<void>`

Delete a pot.

**Parameters:**
- `id` (string): Pot ID

**Returns:** `Promise<void>`

**Throws:**
- `NotFoundError` (404): If pot not found

**Example:**
```typescript
await potService.deletePot('pot-123');
```

---

#### `exportPot(id: string): Promise<Pot>`

Export a pot (returns pot object).

**Parameters:**
- `id` (string): Pot ID

**Returns:** `Promise<Pot>` - Pot object for export

**Throws:**
- `NotFoundError` (404): If pot not found

**Example:**
```typescript
const pot = await potService.exportPot('pot-123');
// Serialize and download
```

---

#### `importPot(pot: Pot): Promise<Pot>`

Import a pot (handles de-duplication).

**Parameters:**
- `pot` (Pot): Pot object to import

**Returns:** `Promise<Pot>` - Imported pot (may be updated if duplicate ID)

**Example:**
```typescript
const imported = await potService.importPot(potData);
```

---

#### `checkpointHint(id: string): Promise<{ hash: string; lastCheckpointHash?: string }>`

Compute checkpoint hint (hash + last checkpoint hash).

**Parameters:**
- `id` (string): Pot ID

**Returns:** `Promise<{ hash: string; lastCheckpointHash?: string }>` - Checkpoint hint

**Throws:**
- `NotFoundError` (404): If pot not found

**Example:**
```typescript
const hint = await potService.checkpointHint('pot-123');
// Use hash for on-chain checkpoint
```

---

### ExpenseService

Business logic layer for expense operations. Handles validation and checkpoint invalidation.

#### `addExpense(potId: string, dto: CreateExpenseDTO): Promise<Expense>`

Add an expense to a pot.

**Invalidates checkpoint if user has confirmed (new expense added after confirmation).**

**Parameters:**
- `potId` (string): Pot ID
- `dto` (CreateExpenseDTO): Expense creation data
  - `potId` (string, required): Pot ID (must match potId parameter)
  - `amount` (number, required): Expense amount (> 0)
  - `currency` (string, required): Currency code
  - `paidBy` (string, required): Member ID who paid
  - `memo` (string, required): Expense description
  - `date` (string, required): ISO date string
  - `split` (Split[], optional): Custom split (defaults to equal split)
  - `hasReceipt` (boolean, optional): Whether expense has receipt

**Returns:** `Promise<Expense>` - Created expense with generated ID

**Throws:**
- `ValidationError` (400): If amount <= 0, paidBy empty, or memo empty
- `NotFoundError` (404): If pot not found

**Example:**
```typescript
const expense = await expenseService.addExpense('pot-123', {
  potId: 'pot-123',
  amount: 50.00,
  currency: 'USD',
  paidBy: 'owner',
  memo: 'Dinner',
  date: '2025-01-14',
  split: [
    { memberId: 'owner', amount: 25.00 },
    { memberId: 'member-1', amount: 25.00 },
  ],
});
```

---

#### `updateExpense(potId: string, expenseId: string, dto: UpdateExpenseDTO): Promise<Expense>`

Update an expense.

**Invalidates checkpoint if user has confirmed (expense modified after confirmation).**

**Parameters:**
- `potId` (string): Pot ID
- `expenseId` (string): Expense ID
- `dto` (UpdateExpenseDTO): Partial expense data to update
  - `amount` (number, optional): Must be > 0 if provided
  - `currency` (string, optional)
  - `paidBy` (string, optional): Must not be empty if provided
  - `memo` (string, optional): Must not be empty if provided
  - `date` (string, optional): ISO date string
  - `split` (Split[], optional)
  - `hasReceipt` (boolean, optional)

**Returns:** `Promise<Expense>` - Updated expense

**Throws:**
- `ValidationError` (400): If amount <= 0, paidBy empty, or memo empty
- `NotFoundError` (404): If pot or expense not found

**Example:**
```typescript
const updated = await expenseService.updateExpense('pot-123', 'expense-456', {
  amount: 60.00,
  memo: 'Updated dinner',
});
```

---

#### `listExpenses(potId: string): Promise<Expense[]>`

List all expenses for a pot.

**Parameters:**
- `potId` (string): Pot ID

**Returns:** `Promise<Expense[]>` - Array of expenses

**Throws:**
- `NotFoundError` (404): If pot not found

**Example:**
```typescript
const expenses = await expenseService.listExpenses('pot-123');
```

---

#### `removeExpense(potId: string, expenseId: string): Promise<void>`

Remove an expense.

**Parameters:**
- `potId` (string): Pot ID
- `expenseId` (string): Expense ID

**Returns:** `Promise<void>`

**Throws:**
- `NotFoundError` (404): If pot or expense not found

**Example:**
```typescript
await expenseService.removeExpense('pot-123', 'expense-456');
```

---

### MemberService

Business logic layer for pot member operations. Handles validation and duplicate checking.

#### `addMember(potId: string, dto: CreateMemberDTO): Promise<Member>`

Add a member to a pot.

**Parameters:**
- `potId` (string): Pot ID
- `dto` (CreateMemberDTO): Member creation data
  - `potId` (string, required): Pot ID (must match potId parameter)
  - `name` (string, required): Member name
  - `role` ('Owner' | 'Member', optional): Default 'Member'
  - `status` ('active' | 'pending', optional): Default 'active'
  - `address` (string | null, optional): Polkadot address (SS58 format)
  - `verified` (boolean, optional): Address verification status

**Returns:** `Promise<Member>` - Created member with generated ID

**Throws:**
- `ValidationError` (400): If name is empty
- `NotFoundError` (404): If pot not found

**Example:**
```typescript
const member = await memberService.addMember('pot-123', {
  potId: 'pot-123',
  name: 'Alice',
  role: 'Member',
  status: 'active',
  address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
});
```

---

#### `updateMember(potId: string, memberId: string, updates: UpdateMemberDTO): Promise<Member>`

Update a member.

**Parameters:**
- `potId` (string): Pot ID
- `memberId` (string): Member ID
- `updates` (UpdateMemberDTO): Partial member data to update
  - `name` (string, optional)
  - `address` (string | null, optional): SS58 address
  - `verified` (boolean, optional)
  - `status` ('active' | 'pending', optional)

**Returns:** `Promise<Member>` - Updated member

**Throws:**
- `NotFoundError` (404): If pot or member not found

**Example:**
```typescript
const updated = await memberService.updateMember('pot-123', 'member-456', {
  name: 'Alice Updated',
  address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  verified: true,
});
```

---

#### `removeMember(potId: string, memberId: string): Promise<void>`

Remove a member from a pot.

**Parameters:**
- `potId` (string): Pot ID
- `memberId` (string): Member ID

**Returns:** `Promise<void>`

**Throws:**
- `NotFoundError` (404): If pot or member not found

**Example:**
```typescript
await memberService.removeMember('pot-123', 'member-456');
```

---

### SettlementService

Business logic layer for settlement operations. Wraps settlement calculation and history recording.

#### `suggest(potId: string): Promise<SettlementSuggestion[]>`

Get settlement suggestions for a pot.

**Parameters:**
- `potId` (string): Pot ID

**Returns:** `Promise<SettlementSuggestion[]>` - Array of settlement suggestions
  - `from` (string): Member ID who owes
  - `to` (string): Member ID who is owed
  - `amount` (number): Settlement amount

**Throws:**
- `NotFoundError` (404): If pot not found

**Example:**
```typescript
const suggestions = await settlementService.suggest('pot-123');
// suggestions = [
//   { from: 'member-1', to: 'owner', amount: 25.50 },
//   { from: 'owner', to: 'member-2', amount: 10.00 },
// ]
```

---

#### `recordOnchainSettlement(potId: string, entry: OnchainSettlementHistory): Promise<void>`

Record an on-chain settlement in pot history.

**This persists the settlement entry to the pot's history array. The actual on-chain transaction is handled by the chain service.**

**Parameters:**
- `potId` (string): Pot ID
- `entry` (OnchainSettlementHistory): Settlement history entry
  - `id` (string): Unique entry ID
  - `when` (number): Timestamp (milliseconds)
  - `type` ('onchain_settlement'): Entry type
  - `fromMemberId` (string): Member ID who paid
  - `toMemberId` (string): Member ID who received
  - `fromAddress` (string): From address (SS58)
  - `toAddress` (string): To address (SS58)
  - `amountDot` (string): Amount in DOT (string for precision)
  - `txHash` (string): Transaction hash
  - `status` ('submitted' | 'in_block' | 'finalized' | 'failed'): Transaction status
  - `subscan` (string, optional): Subscan explorer URL
  - `note` (string, optional): Optional note

**Returns:** `Promise<void>`

**Throws:**
- `NotFoundError` (404): If pot not found

**Example:**
```typescript
await settlementService.recordOnchainSettlement('pot-123', {
  id: 'settlement-789',
  when: Date.now(),
  type: 'onchain_settlement',
  fromMemberId: 'member-1',
  toMemberId: 'owner',
  fromAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  toAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  amountDot: '10.5',
  txHash: '0x1234...',
  status: 'finalized',
  subscan: 'https://polkadot.subscan.io/extrinsic/...',
});
```

---

## Error Types

All errors extend `AppError` with a consistent structure:

```typescript
class AppError extends Error {
  code: ErrorCode;
  message: string;
  details?: unknown;
  status?: number;
}
```

### Error Codes

- `not_found` (404): Resource not found
- `validation` (400): Input validation failed
- `auth` (401): Authentication required
- `network` (503): Network/connection error
- `conflict` (409): Resource conflict (duplicate, concurrent modification)
- `quota_exceeded` (413): Storage quota exceeded
- `unknown`: Unexpected error

### Error Classes

#### `NotFoundError`

Thrown when a resource (pot, expense, member) is not found.

```typescript
throw new NotFoundError('Pot', 'pot-123');
// Error: Pot with id "pot-123" not found
```

#### `ValidationError`

Thrown when input validation fails.

```typescript
throw new ValidationError('Pot name is required');
// Error: Pot name is required
```

#### `AuthError`

Thrown when authentication is required (future API use).

```typescript
throw new AuthError('Authentication required');
// Error: Authentication required
```

#### `NetworkError`

Thrown when network operations fail (future API use).

```typescript
throw new NetworkError('Failed to connect to server', null, 5000);
// Error: Failed to connect to server
// retryAfter: 5000ms
```

#### `ConflictError`

Thrown when resource conflicts occur (e.g., duplicate import).

```typescript
throw new ConflictError('Pot with this ID already exists');
// Error: Pot with this ID already exists
```

#### `QuotaExceededError`

Thrown when localStorage quota is exceeded.

```typescript
throw new QuotaExceededError('Pots data too large (1200000 bytes, max 1000000)');
// Error: Pots data too large (1200000 bytes, max 1000000)
```

---

## Data Transfer Objects (DTOs)

### CreatePotDTO

```typescript
{
  name: string;                    // Required
  type: 'expense' | 'savings';   // Required
  baseCurrency?: 'DOT' | 'USD';   // Optional, default 'USD'
  budget?: number | null;         // Optional
  budgetEnabled?: boolean;         // Optional, default false
  checkpointEnabled?: boolean;    // Optional
  goalAmount?: number;            // Optional (savings pots)
  goalDescription?: string;       // Optional (savings pots)
  members?: Member[];             // Optional (defaults to owner only)
}
```

### UpdatePotDTO

Partial update (all fields optional):

```typescript
{
  name?: string;
  baseCurrency?: 'DOT' | 'USD';
  budget?: number | null;
  budgetEnabled?: boolean;
  checkpointEnabled?: boolean;
  archived?: boolean;
  goalAmount?: number;
  goalDescription?: string;
  lastBackupCid?: string;         // IPFS CID for backup
}
```

### CreateExpenseDTO

```typescript
{
  potId: string;                  // Required
  amount: number;                 // Required, > 0
  currency: string;               // Required
  paidBy: string;                 // Required, member ID
  memo: string;                   // Required
  date: string;                   // Required, ISO date string
  split?: Split[];                // Optional (defaults to equal split)
  hasReceipt?: boolean;           // Optional
}
```

### UpdateExpenseDTO

Partial update (all fields optional):

```typescript
{
  amount?: number;                // Must be > 0 if provided
  currency?: string;
  paidBy?: string;                // Must not be empty if provided
  memo?: string;                  // Must not be empty if provided
  date?: string;
  split?: Split[];
  hasReceipt?: boolean;
}
```

### CreateMemberDTO

```typescript
{
  potId: string;                  // Required
  name: string;                   // Required
  role?: 'Owner' | 'Member';      // Optional, default 'Member'
  status?: 'active' | 'pending';  // Optional, default 'active'
  address?: string | null;        // Optional, SS58 address
  verified?: boolean;             // Optional
}
```

### UpdateMemberDTO

Partial update (all fields optional):

```typescript
{
  name?: string;
  address?: string | null;
  verified?: boolean;
  status?: 'active' | 'pending';
}
```

### SettlementSuggestion

```typescript
{
  from: string;    // Member ID who owes
  to: string;      // Member ID who is owed
  amount: number;  // Settlement amount
}
```

### OnchainSettlementHistory

```typescript
{
  id: string;                                    // Required, unique entry ID
  when: number;                                  // Required, timestamp (ms)
  type: 'onchain_settlement';                    // Required
  fromMemberId: string;                          // Required
  toMemberId: string;                            // Required
  fromAddress: string;                           // Required, SS58 address
  toAddress: string;                             // Required, SS58 address
  amountDot: string;                             // Required, amount as string
  txHash: string;                                // Required, transaction hash
  status: 'submitted' | 'in_block' | 'finalized' | 'failed'; // Required
  subscan?: string;                              // Optional, explorer URL
  note?: string;                                 // Optional
}
```

---

## Examples

### Complete Workflow: Create Pot, Add Expenses, Calculate Settlements

```typescript
import { useData } from './services/data/DataContext';

async function exampleWorkflow() {
  const { pots, expenses, members, settlements } = useData();
  
  // 1. Create a pot
  const pot = await pots.createPot({
    name: 'Weekend Trip',
    type: 'expense',
    baseCurrency: 'USD',
    budget: 500,
    budgetEnabled: true,
  });
  
  // 2. Add members
  const member1 = await members.addMember(pot.id, {
    potId: pot.id,
    name: 'Alice',
    role: 'Member',
    status: 'active',
  });
  
  const member2 = await members.addMember(pot.id, {
    potId: pot.id,
    name: 'Bob',
    role: 'Member',
    status: 'active',
  });
  
  // 3. Add expenses
  const expense1 = await expenses.addExpense(pot.id, {
    potId: pot.id,
    amount: 100.00,
    currency: 'USD',
    paidBy: 'owner',
    memo: 'Hotel',
    date: '2025-01-14',
    split: [
      { memberId: 'owner', amount: 33.33 },
      { memberId: member1.id, amount: 33.33 },
      { memberId: member2.id, amount: 33.34 },
    ],
  });
  
  const expense2 = await expenses.addExpense(pot.id, {
    potId: pot.id,
    amount: 60.00,
    currency: 'USD',
    paidBy: member1.id,
    memo: 'Dinner',
    date: '2025-01-15',
    // Equal split (default)
  });
  
  // 4. Get settlement suggestions
  const suggestions = await settlements.suggest(pot.id);
  // suggestions = [
  //   { from: 'owner', to: member1.id, amount: 6.67 },
  //   { from: member2.id, to: member1.id, amount: 20.00 },
  // ]
  
  // 5. Record on-chain settlement (after transaction)
  await settlements.recordOnchainSettlement(pot.id, {
    id: 'settlement-1',
    when: Date.now(),
    type: 'onchain_settlement',
    fromMemberId: 'owner',
    toMemberId: member1.id,
    fromAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    toAddress: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    amountDot: '6.67',
    txHash: '0x1234...',
    status: 'finalized',
  });
}
```

### Error Handling

```typescript
import { NotFoundError, ValidationError } from './services/data/errors';

try {
  const pot = await potService.getPot('invalid-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.error('Pot not found:', error.message);
    // Handle not found
  } else if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
    // Handle validation error
  } else {
    console.error('Unexpected error:', error);
    // Handle unknown error
  }
}
```

---

## Environment Variables

### `VITE_DATA_SOURCE`

Controls which data source is used:
- `local` (default): Uses `LocalStorageSource` (current implementation)
- `api`: Uses `HttpSource` (future API backend)

### `VITE_DL_READS`

Controls whether Data Layer reads are preferred:
- `off` (default): UI state is source of truth, DL reads as fallback
- `on`: Data Layer reads are preferred, UI state as fallback

---

## Notes

- All service methods are async and return Promises
- All IDs are strings (UUIDs or custom IDs)
- Amounts are numbers (use string for DOT precision in settlements)
- Dates are ISO 8601 strings (YYYY-MM-DD)
- Addresses are SS58 format for Polkadot
- Checkpoint invalidation: Adding/editing expenses after checkpoint confirmation invalidates the confirmation
- Caching: Repositories use TTL-based caching (60s for pots, 5s for expenses)
- Migration: Automatic migration runs on first read via `LocalStorageSource`
- Backup: All pot saves are mirrored to `chopdot_pots_backup` key

---

## Future Enhancements

- [ ] HTTP API backend integration (`HttpSource`)
- [ ] Real-time updates via WebSocket
- [ ] Optimistic updates with rollback
- [ ] Batch operations
- [ ] Pagination for large lists
- [ ] Filtering and sorting at repository level
- [ ] Offline queue for write operations

