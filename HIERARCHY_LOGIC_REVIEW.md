# ChopDot Hierarchy & Logic Review

**Date:** January 14, 2025  
**Purpose:** Comprehensive review of app hierarchy and math/logic consistency  
**Status:** In Progress

---

## 1. App Hierarchy Review

### 1.1 Navigation Hierarchy

```
App (App.tsx)
├── Navigation System (nav.ts)
│   ├── Stack-based navigation (push/pop/replace/reset)
│   └── Type-safe screen definitions
│
├── Main Tabs (BottomTabBar)
│   ├── Pots Home (pots-home)
│   ├── People Home (people-home)
│   ├── Activity Home (activity-home)
│   └── You Tab (you-tab)
│
└── Detail/Modal Screens
    ├── Pot Detail (pot-home)
    │   ├── Expenses Tab
    │   ├── Members Tab
    │   ├── Settings Tab
    │   └── Savings Tab (for savings pots)
    │
    ├── Expense Flow
    │   ├── Add Expense (add-expense)
    │   ├── Edit Expense (edit-expense)
    │   └── Expense Detail (expense-detail)
    │
    ├── Settlement Flow
    │   ├── Settle Selection (settle-selection)
    │   ├── Settle Home (settle-home)
    │   ├── Settlement Confirmation (settlement-confirmation)
    │   └── Settlement History (settlement-history)
    │
    └── Other Screens
        ├── Create Pot (create-pot)
        ├── Member Detail (member-detail)
        ├── Payment Methods (payment-methods)
        └── Settings (settings)
```

**✅ Navigation Flow Analysis:**
- Stack-based navigation is clear and type-safe
- Main tabs provide clear entry points
- Detail screens properly nested under main tabs
- Modal flows (add-expense, settle-home) properly stack

**⚠️ Potential Issues:**
- Need to verify all navigation paths have proper back navigation
- Need to verify data requirements for each screen are met

---

### 1.2 Data Hierarchy

```
Data Model (schema/pot.ts)
├── Pot
│   ├── Members (Member[])
│   ├── Expenses (Expense[])
│   ├── History (PotHistory[])
│   └── Settings (budget, checkpoint, etc.)
│
├── Member
│   ├── id, name, role, status
│   └── address (optional SS58)
│
├── Expense
│   ├── id, amount, currency, memo
│   ├── paidBy (memberId)
│   ├── split (memberId → amount)
│   └── attestations (memberId[])
│
└── PotHistory
    ├── onchain_settlement
    └── remark_checkpoint
```

**✅ Data Model Analysis:**
- Clear hierarchy: Pot → Members/Expenses
- Proper relationships: Expense.paidBy → Member.id
- Split structure properly links Expense → Members
- History tracks on-chain events

**⚠️ Potential Issues:**
- Need to verify all data relationships are properly validated
- Need to verify currency consistency across pots

---

### 1.3 Component Hierarchy

```
App.tsx (Root)
├── AuthProvider
├── FeatureFlagsProvider
├── AppContent
│   ├── Navigation State (useNav)
│   ├── Data State (pots, people, balances)
│   ├── UI State (toasts, modals)
│   │
│   └── Screen Rendering
│       ├── PotsHome
│       │   └── Pot Cards → PotHome
│       │
│       ├── PeopleHome
│       │   └── Person Cards → MemberDetail
│       │
│       ├── ActivityHome
│       │   └── Activity Items
│       │
│       └── PotHome
│           ├── ExpensesTab
│           │   ├── Expense List → ExpenseDetail
│           │   └── Settlement Suggestions
│           │
│           ├── MembersTab
│           │   └── Member List → MemberDetail
│           │
│           └── SettingsTab
```

**✅ Component Hierarchy Analysis:**
- Clear parent-child relationships
- Proper data flow via props
- State management centralized in App.tsx

**⚠️ Potential Issues:**
- Need to verify all components receive required data
- Need to verify callback chains are complete

---

## 2. Data Flow Review

### 2.1 Expense Creation Flow

```
User Action: Add Expense
├── AddExpense Component
│   ├── Input: amount, memo, paidBy, split
│   └── Validation: amount > 0, memo required, split valid
│
├── onSave Callback
│   └── App.tsx handles expense creation
│       ├── Add expense to pot.expenses[]
│       ├── Recalculate balances
│       └── Persist to localStorage
│
└── UI Update
    ├── ExpensesTab refreshes
    ├── Balances recalculated
    └── Settlement suggestions updated
```

**✅ Flow Analysis:**
- Clear path from UI → Data → Persistence
- Proper validation before save
- Balance recalculation triggered

**⚠️ Potential Issues:**
- Need to verify split validation matches calculation logic
- Need to verify currency consistency

---

### 2.2 Settlement Calculation Flow

```
Trigger: User views settlement screen
├── Data Source: pots[] (all pots with expenses)
│
├── Calculation Functions:
│   ├── calculateSettlements() (global, across all pots)
│   │   └── Used by: PeopleHome, SettleSelection
│   │
│   └── calculatePotSettlements() (pot-scoped)
│       └── Used by: ExpensesTab, PotHome
│
├── Balance Calculation Logic:
│   ├── For each expense:
│   │   ├── If person paid: + (amount - theirShare)
│   │   └── If person didn't pay: - theirShare
│   │
│   └── Net balance = sum of all pot balances
│
└── UI Display:
    ├── youOwe[] (negative balances)
    └── owedToYou[] (positive balances)
```

**✅ Flow Analysis:**
- Clear separation: global vs pot-scoped
- Consistent calculation logic
- Proper aggregation across pots

**⚠️ Potential Issues:**
- Need to verify calculation consistency between functions
- Need to verify on-chain settlement offsets are applied correctly

---

## 3. Math & Logic Consistency Review

### 3.1 Balance Calculation Consistency

**Location 1: `src/utils/settlements.ts` (calculateSettlements)**
```typescript
// Global settlement calculation
if (personId === expense.paidBy) {
  // They paid, so they're owed the difference
  const othersOweThem = expense.amount - amountOwed;
  potBalances.set(pot.id, (potBalances.get(pot.id) || 0) + othersOweThem);
} else {
  // They owe their share to the payer
  potBalances.set(pot.id, (potBalances.get(pot.id) || 0) - amountOwed);
}

// Net balance calculation (from current user's perspective)
const currentUserBalance = personPotBalances.get(currentUserId)?.get(potId) || 0;
let netBalance = currentUserBalance - balance;
```

**Location 2: `src/utils/settlements.ts` (calculatePotSettlements)**
```typescript
// Pot-scoped settlement calculation
const theirShareOfMyExpenses = pot.expenses
  .filter(e => e.paidBy === currentUserId)
  .reduce((sum, e) => {
    const share = e.split.find(s => s.memberId === member.id);
    return sum + (share?.amount || 0);
  }, 0);

const myShareOfTheirExpenses = pot.expenses
  .filter(e => e.paidBy === member.id)
  .reduce((sum, e) => {
    const share = e.split.find(s => s.memberId === currentUserId);
    return sum + (share?.amount || 0);
  }, 0);

let balance = theirShareOfMyExpenses - myShareOfTheirExpenses;
```

**Location 3: `src/services/settlement/calc.ts` (computeBalances)**
```typescript
// Used by ExpensesTab
// Need to review this file to verify consistency
```

**Location 4: `src/components/screens/MembersTab.tsx` (getMemberBalance)**
```typescript
// Member balance calculation
let memberPaid = 0;
let memberOwes = 0;
let youPaid = 0;
let youOwe = 0;

expenses.forEach(expense => {
  if (expense.paidBy === memberId) {
    memberPaid += expense.amount;
  }
  const memberSplit = expense.split.find(s => s.memberId === memberId);
  if (memberSplit) {
    memberOwes += memberSplit.amount;
  }
  
  if (expense.paidBy === currentUserId) {
    youPaid += expense.amount;
  }
  const yourSplit = expense.split.find(s => s.memberId === currentUserId);
  if (yourSplit) {
    youOwe += yourSplit.amount;
  }
});

const memberNet = memberPaid - memberOwes;
const yourNet = youPaid - youOwe;
return yourNet - memberNet;
```

**🔍 Consistency Check:**

**Formula Comparison:**
1. **calculateSettlements**: `netBalance = currentUserBalance - balance`
   - Where `balance` is the other person's balance
   - Positive = they owe you, Negative = you owe them

2. **calculatePotSettlements**: `balance = theirShareOfMyExpenses - myShareOfTheirExpenses`
   - Positive = they owe you, Negative = you owe them
   - ✅ Matches formula 1 conceptually

3. **MembersTab.getMemberBalance**: `yourNet - memberNet`
   - Where `yourNet = youPaid - youOwe`
   - And `memberNet = memberPaid - memberOwes`
   - This equals: `(youPaid - youOwe) - (memberPaid - memberOwes)`
   - Which equals: `(youPaid - memberPaid) - (youOwe - memberOwes)`
   - ⚠️ **POTENTIAL INCONSISTENCY**: This is different from formulas 1 & 2

**Mathematical Verification:**

For two people (You and Member):
- You paid $100, split equally: You owe $50, Member owes $50
- Member paid $60, split equally: You owe $30, Member owes $30

**Formula 1 & 2 (calculateSettlements/calculatePotSettlements):**
- Your share of Member's expenses: $30
- Member's share of your expenses: $50
- Balance = $30 - $50 = -$20 (you owe them $20) ✅

**Formula 3 (MembersTab.getMemberBalance):**
- You paid: $100, You owe: $50 + $30 = $80, Your net = $100 - $80 = $20
- Member paid: $60, Member owes: $50 + $30 = $80, Member net = $60 - $80 = -$20
- Balance = $20 - (-$20) = $40 ❌ **WRONG!**

**✅ Issue Identified:**
- `MembersTab.getMemberBalance` has incorrect formula
- Should be: `memberNet - yourNet` (not `yourNet - memberNet`)
- Or: `myShareOfTheirExpenses - theirShareOfMyExpenses`

---

### 3.2 Expense Split Validation

**Location: `src/components/screens/AddExpense.tsx`**
```typescript
const calculateSplit = () => {
  const numAmount = parseFloat(amount);
  
  if (splitType === "equal") {
    const perPerson = numAmount / includedMembers.size;
    return Array.from(includedMembers).map(memberId => ({
      memberId,
      amount: Number(perPerson.toFixed(decimals)),
    }));
  }
  // ... custom and shares logic
};

const isSplitValid = splitType !== "custom" || Math.abs(totalPercent - 100) < 0.01;
```

**✅ Validation Check:**
- Equal split: ✅ Divides amount by member count
- Custom percent: ✅ Validates total = 100%
- Shares: ✅ Calculates proportionally
- ⚠️ Need to verify rounding doesn't cause sum != total amount

---

### 3.3 On-Chain Settlement Offsets

**Location: `src/utils/settlements.ts`**
```typescript
// Apply on-chain DOT settlements for this pot to move balances toward zero
if (pot.history && pot.history.length > 0) {
  const relevant = pot.history.filter(
    (h): h is Extract<PotHistory, { type: 'onchain_settlement' }> =>
      h.type === 'onchain_settlement' && h.status !== 'failed'
  );
  for (const h of relevant) {
    const amt = Number(h.amountDot || '0');
    if (h.fromMemberId === currentUserId && h.toMemberId === personId) {
      // You paid them → you owe less → net increases toward zero
      netBalance += amt;
    } else if (h.fromMemberId === personId && h.toMemberId === currentUserId) {
      // They paid you → they owe less → net decreases toward zero
      netBalance -= amt;
    }
  }
}
```

**✅ Logic Check:**
- Properly filters failed settlements
- Correctly applies offsets based on payment direction
- Moves balance toward zero ✅

---

## 4. Gaps & Inconsistencies

### 4.1 Critical Issues

**🔴 Issue 1: Balance Calculation Inconsistency**
- **Location:** `src/components/screens/MembersTab.tsx` (getMemberBalance)
- **Problem:** Formula is inverted compared to other balance calculations
- **Impact:** MembersTab shows incorrect balances
- **Fix:** Change `return yourNet - memberNet;` to `return memberNet - yourNet;`

**🔴 Issue 2: Currency Consistency**
- **Location:** Multiple files
- **Problem:** Need to verify currency consistency across pots
- **Impact:** Potential mixing of DOT and USD in calculations
- **Status:** Need to verify currency validation

### 4.2 Medium Priority Issues

**🟡 Issue 3: Split Rounding**
- **Location:** `src/components/screens/AddExpense.tsx`
- **Problem:** Rounding in `calculateSplit()` may cause sum != total amount
- **Impact:** Small discrepancies in expense totals
- **Status:** Need to verify rounding logic

**🟡 Issue 4: Settlement History Integration**
- **Location:** Settlement calculation functions
- **Problem:** Need to verify settlement history properly offsets balances
- **Impact:** Balances may not reflect completed settlements
- **Status:** Logic looks correct, but need to verify in practice

### 4.3 Low Priority Issues

**🟢 Issue 5: Performance**
- **Location:** `src/App.tsx` (balance calculations)
- **Problem:** Calculations run on every render
- **Impact:** Potential performance issues with many pots/expenses
- **Status:** Already using `useMemo`, but worth monitoring

---

## 5. Recommendations

### 5.1 Immediate Fixes

1. **Fix MembersTab balance calculation**
   - Change formula to match other calculations
   - Test with known scenarios

2. **Add currency validation**
   - Ensure no mixing of currencies in calculations
   - Add validation in expense creation

### 5.2 Verification Steps

1. **Test balance calculations**
   - Create test scenarios with known balances
   - Verify all calculation functions produce same results
   - Test with on-chain settlements

2. **Test navigation flow**
   - Verify all screens have required data
   - Test back navigation
   - Test deep linking scenarios

3. **Test data persistence**
   - Verify localStorage saves/loads correctly
   - Test migration logic
   - Test with corrupted data

### 5.3 Documentation Updates

1. **Document balance calculation formula**
   - Add clear formula documentation
   - Document sign conventions (positive/negative meanings)
   - Document currency handling

2. **Document data flow**
   - Create data flow diagrams
   - Document callback chains
   - Document state management

---

## 6. Next Steps

1. ✅ Review complete - issues identified
2. ⏳ Fix critical issues (MembersTab balance calculation)
3. ⏳ Verify currency consistency
4. ⏳ Test balance calculations with known scenarios
5. ⏳ Update documentation

---

**Last Updated:** January 14, 2025  
**Status:** Review Complete - Issues Identified

