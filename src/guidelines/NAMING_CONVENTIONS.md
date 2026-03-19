# ChopDot Naming Conventions

**Last Updated:** January 14, 2025  
**Purpose:** Clear, consistent naming conventions to reduce confusion

---

## 📋 Table of Contents

0. [Component Catalog](#component-catalog) – **When to use which component**
1. [File Naming](#file-naming)
2. [Component Naming](#component-naming)
3. [Variable & Function Naming](#variable--function-naming)
4. [Type & Interface Naming](#type--interface-naming)
5. [CSS Class Naming](#css-class-naming)
5. [Common Patterns](#common-patterns)
6. [Decision Tree](#decision-tree)

---

## Component Catalog

**Before creating or modifying a component**, check the [Component Catalog](../docs/COMPONENT_CATALOG.md). It documents:

- What each component does and when it's used
- Entry points (how the user gets there)
- Related components (don't confuse with)
- The critical distinction between **QuickKeypadSheet** (add expense) and **AddExpense** (edit expense)

---

## File Naming

### React Components

| Type | Pattern | Example | Location |
|------|---------|---------|----------|
| **Screen Component** | `PascalCase.tsx` (no suffix) | `PotHome.tsx`, `SettleHome.tsx` | `/components/screens/` |
| **Tab Component** | `PascalCaseTab.tsx` | `ExpensesTab.tsx`, `MembersTab.tsx` | `/components/screens/` |
| **Reusable Component** | `PascalCase.tsx` | `Toast.tsx`, `TopBar.tsx` | `/components/` |
| **ShadCN Component** | `kebab-case.tsx` | `button.tsx`, `dialog.tsx` | `/components/ui/` |

**Rules:**
- ✅ Use PascalCase for all React components
- ✅ Screens: No suffix needed (e.g., `PotHome.tsx`, not `PotHomeScreen.tsx`)
- ✅ Tabs: Use `Tab` suffix (e.g., `ExpensesTab.tsx`)
- ✅ Descriptive names (e.g., `AddExpense.tsx`, not `Form.tsx`)
- ❌ Don't use "Screen" suffix for screens (inconsistent)
- ❌ Don't use generic names (e.g., `Form.tsx`, `Modal.tsx`)

### Utility Files

| Type | Pattern | Example | Location |
|------|---------|---------|----------|
| **Utility Function** | `camelCase.ts` | `settlements.ts`, `haptics.ts` | `/utils/` |
| **Custom Hook** | `usePascalCase.ts` | `useTheme.ts`, `usePullToRefresh.ts` | `/utils/` or `/hooks/` |
| **Service** | `camelCase.ts` | `walletAuth.ts`, `web3auth.ts` | `/utils/` or `/services/` |

**Rules:**
- ✅ Use camelCase for utility files
- ✅ Use `use` prefix for custom hooks (e.g., `useTheme.ts`)
- ✅ Descriptive names (e.g., `settlements.ts`, not `calc.ts`)
- ❌ Don't use PascalCase for utilities (reserved for components)

### Context Files

| Pattern | Example | Location |
|---------|---------|----------|
| `PascalCaseContext.tsx` | `AuthContext.tsx`, `FeatureFlagsContext.tsx` | `/contexts/` |

**Rules:**
- ✅ Always end with `Context.tsx`
- ✅ Use PascalCase

### Documentation Files

| Type | Pattern | Example | Location |
|------|---------|---------|----------|
| **Main Docs** | `UPPERCASE.md` | `README.md`, `CHANGELOG.md` | Root or `/src/` |
| **Feature Docs** | `kebab-case.md` | `attestation-detail.md` | `/docs/implementation/` |
| **Guidelines** | `PascalCase.md` | `Guidelines.md`, `Typography.md` | `/guidelines/` |

---

## Component Naming

### Component Function Names

```tsx
// ✅ CORRECT: Match file name
// File: PotHome.tsx
export function PotHome() { ... }

// ✅ CORRECT: Named export
// File: Toast.tsx
export function Toast() { ... }

// ❌ INCORRECT: Mismatched name
// File: PotHome.tsx
export function PotScreen() { ... }  // Wrong!
```

**Rules:**
- ✅ Component name must match file name exactly
- ✅ Use PascalCase
- ✅ Use named exports (not default exports)

### Component Props Interfaces

```tsx
// ✅ CORRECT: ComponentName + Props suffix
interface PotHomeProps {
  potId: string;
  onBack: () => void;
}

export function PotHome({ potId, onBack }: PotHomeProps) { ... }

// ❌ INCORRECT: Generic names
interface Props { ... }  // Too generic
interface PotHomeInterface { ... }  // Wrong suffix
```

**Rules:**
- ✅ Use `ComponentNameProps` pattern
- ✅ Place interface above component definition
- ❌ Don't use generic `Props` name

---

## Variable & Function Naming

### Variables

```tsx
// ✅ CORRECT: camelCase
const currentPotId = 'pot-123';
const isAuthenticated = true;
const expenseList = [];

// ✅ CORRECT: Boolean prefix
const hasReceipt = true;
const isPending = false;
const canEdit = true;

// ❌ INCORRECT: PascalCase (reserved for components)
const CurrentPotId = 'pot-123';  // Wrong!

// ❌ INCORRECT: snake_case
const current_pot_id = 'pot-123';  // Wrong!
```

**Rules:**
- ✅ Use camelCase for variables
- ✅ Use descriptive names
- ✅ Use boolean prefixes (`is`, `has`, `can`, `should`)
- ❌ Don't use PascalCase (reserved for components/types)
- ❌ Don't use snake_case

### Functions

```tsx
// ✅ CORRECT: camelCase, verb-based
function calculateSettlements() { ... }
function handleExpenseAdd() { ... }
function getCurrentPot() { ... }
function isExpenseValid() { ... }

// ✅ CORRECT: Event handlers use "handle" prefix
function handleSave() { ... }
function handleCancel() { ... }
function handleExpenseClick() { ... }

// ✅ CORRECT: Getters use "get" prefix
function getCurrentPot() { ... }
function getExpenseById(id: string) { ... }

// ✅ CORRECT: Validators use "is" or "has" prefix
function isValidExpense() { ... }
function hasRequiredFields() { ... }

// ❌ INCORRECT: Noun-based
function expenseCalculation() { ... }  // Should be calculateExpenses

// ❌ INCORRECT: PascalCase
function CalculateSettlements() { ... }  // Wrong!
```

**Rules:**
- ✅ Use camelCase
- ✅ Use verb-based names (e.g., `calculate`, `handle`, `get`)
- ✅ Event handlers: `handle` prefix
- ✅ Getters: `get` prefix
- ✅ Validators: `is`/`has` prefix
- ❌ Don't use PascalCase (reserved for components)
- ❌ Don't use noun-based names for functions

### Constants

```tsx
// ✅ CORRECT: UPPER_SNAKE_CASE for true constants
const MAX_EXPENSES = 100;
const DEFAULT_CURRENCY = 'USD';
const API_BASE_URL = 'https://api.example.com';

// ✅ CORRECT: camelCase for config objects
const appConfig = {
  maxExpenses: 100,
  defaultCurrency: 'USD',
};

// ❌ INCORRECT: Mixed case
const MaxExpenses = 100;  // Wrong!
```

**Rules:**
- ✅ Use `UPPER_SNAKE_CASE` for true constants (never change)
- ✅ Use camelCase for config objects
- ❌ Don't use PascalCase for constants

---

## Type & Interface Naming

### Interfaces

```tsx
// ✅ CORRECT: PascalCase, descriptive
interface Expense {
  id: string;
  amount: number;
}

interface PotMember {
  id: string;
  name: string;
}

// ✅ CORRECT: Props interfaces use Props suffix
interface AddExpenseProps {
  potId: string;
  onSave: () => void;
}

// ❌ INCORRECT: Prefix with "I"
interface IExpense { ... }  // Don't use "I" prefix

// ❌ INCORRECT: Generic names
interface Data { ... }  // Too generic
```

**Rules:**
- ✅ Use PascalCase
- ✅ Use descriptive names
- ✅ Props interfaces: `ComponentNameProps`
- ❌ Don't use "I" prefix (TypeScript convention, not needed)
- ❌ Don't use generic names

### Type Aliases

```tsx
// ✅ CORRECT: PascalCase
type ExpenseId = string;
type SettlementMethod = 'cash' | 'bank' | 'dot';

// ✅ CORRECT: Union types
type Screen = 
  | { type: 'pot-home'; potId: string }
  | { type: 'add-expense' };

// ❌ INCORRECT: camelCase
type expenseId = string;  // Wrong!
```

**Rules:**
- ✅ Use PascalCase for type aliases
- ✅ Use descriptive names
- ❌ Don't use camelCase (types are like interfaces)

### Enums

```tsx
// ✅ CORRECT: PascalCase enum name, PascalCase values
enum SettlementMethod {
  Cash = 'cash',
  Bank = 'bank',
  Dot = 'dot',
}

// ❌ INCORRECT: camelCase enum
enum settlementMethod { ... }  // Wrong!
```

**Rules:**
- ✅ Use PascalCase for enum name
- ✅ Use PascalCase for enum values
- ❌ Don't use camelCase

---

## CSS Class Naming

### Utility Classes

```tsx
// ✅ CORRECT: Semantic utility classes
className="text-screen-title"
className="text-body"
className="card"
className="list-row"

// ✅ CORRECT: Tailwind utilities
className="p-4 space-y-2 flex items-center"

// ❌ INCORRECT: Custom arbitrary classes
className="my-custom-class"  // Use Tailwind or semantic classes
```

**Rules:**
- ✅ Use semantic utility classes (`.card`, `.text-body`, etc.)
- ✅ Use Tailwind utilities
- ❌ Don't create custom arbitrary classes

### CSS Variables (Design Tokens)

```css
/* ✅ CORRECT: kebab-case with -- prefix */
--bg: #F2F2F7;
--text-secondary: #606066;
--shadow-card: var(--sh-l1);

/* ❌ INCORRECT: camelCase */
--textSecondary: #606066;  // Wrong!
```

**Rules:**
- ✅ Use kebab-case for CSS variables
- ✅ Use `--` prefix
- ✅ Use semantic names (`--text-secondary`, not `--text-gray`)
- ❌ Don't use camelCase

---

## Common Patterns

### Screen Components

```tsx
// File: PotHome.tsx
interface PotHomeProps {
  potId: string;
  onBack: () => void;
}

export function PotHome({ potId, onBack }: PotHomeProps) {
  // Component implementation
}
```

### Tab Components

```tsx
// File: ExpensesTab.tsx
interface ExpensesTabProps {
  pot: Pot;
  onExpenseClick: (id: string) => void;
}

export function ExpensesTab({ pot, onExpenseClick }: ExpensesTabProps) {
  // Tab implementation
}
```

### Utility Functions

```tsx
// File: settlements.ts
export function calculateSettlements(
  pots: Pot[],
  people: Person[],
  currentUserId: string = 'owner'
): CalculatedSettlements {
  // Implementation
}
```

### Custom Hooks

```tsx
// File: useTheme.ts
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  // Hook implementation
  return { theme, setTheme };
}
```

### Event Handlers

```tsx
// ✅ CORRECT: handle prefix
function handleExpenseSave() { ... }
function handleMemberAdd() { ... }
function handleSettlementConfirm() { ... }

// ✅ CORRECT: Inline handlers
<button onClick={() => handleSave()}>Save</button>

// ❌ INCORRECT: on prefix for internal handlers
function onExpenseSave() { ... }  // "on" is for props only
```

**Rules:**
- ✅ Use `handle` prefix for internal event handlers
- ✅ Use `on` prefix only for props (e.g., `onSave` prop)
- ❌ Don't use `on` prefix for internal functions

---

## Decision Tree

### "What should I name this file?"

```
Is it a React component?
├─ Yes → Is it a full screen?
│   ├─ Yes → Is it a tab within a screen?
│   │   ├─ Yes → Use PascalCaseTab.tsx (e.g., ExpensesTab.tsx)
│   │   └─ No → Use PascalCase.tsx (e.g., PotHome.tsx)
│   └─ No → Is it reusable?
│       ├─ Yes → Use PascalCase.tsx in /components/ (e.g., Toast.tsx)
│       └─ No → Use PascalCase.tsx in /components/screens/
└─ No → Is it a utility function?
    ├─ Yes → Is it a custom hook?
    │   ├─ Yes → Use usePascalCase.ts (e.g., useTheme.ts)
    │   └─ No → Use camelCase.ts (e.g., settlements.ts)
    └─ No → Is it a context?
        ├─ Yes → Use PascalCaseContext.tsx (e.g., AuthContext.tsx)
        └─ No → Follow file type conventions
```

### "What should I name this variable?"

```
Is it a constant (never changes)?
├─ Yes → Use UPPER_SNAKE_CASE (e.g., MAX_EXPENSES)
└─ No → Is it a boolean?
    ├─ Yes → Use is/has/can/should prefix (e.g., isPending)
    └─ No → Use camelCase (e.g., currentPotId)
```

### "What should I name this function?"

```
What type of function?
├─ Event handler → Use handle prefix (e.g., handleSave)
├─ Getter → Use get prefix (e.g., getCurrentPot)
├─ Validator → Use is/has prefix (e.g., isValidExpense)
└─ Other → Use verb-based camelCase (e.g., calculateSettlements)
```

---

## Quick Reference

| Item | Convention | Example |
|------|------------|---------|
| **Screen Component** | PascalCase.tsx | `PotHome.tsx` |
| **Tab Component** | PascalCaseTab.tsx | `ExpensesTab.tsx` |
| **Reusable Component** | PascalCase.tsx | `Toast.tsx` |
| **Utility File** | camelCase.ts | `settlements.ts` |
| **Custom Hook** | usePascalCase.ts | `useTheme.ts` |
| **Context** | PascalCaseContext.tsx | `AuthContext.tsx` |
| **Variable** | camelCase | `currentPotId` |
| **Boolean Variable** | is/has/can prefix | `isPending` |
| **Function** | camelCase, verb-based | `calculateSettlements` |
| **Event Handler** | handle prefix | `handleSave` |
| **Getter** | get prefix | `getCurrentPot` |
| **Constant** | UPPER_SNAKE_CASE | `MAX_EXPENSES` |
| **Interface** | PascalCase | `Expense` |
| **Props Interface** | ComponentNameProps | `PotHomeProps` |
| **Type Alias** | PascalCase | `ExpenseId` |
| **CSS Variable** | --kebab-case | `--text-secondary` |
| **CSS Class** | semantic or Tailwind | `.card`, `.p-4` |

---

## Common Mistakes to Avoid

### ❌ Don't Do This

```tsx
// Wrong file naming
PotHomeScreen.tsx        // Don't use "Screen" suffix
expenseUtils.ts          // Don't use camelCase for files with "Utils"
Form.tsx                 // Too generic

// Wrong component naming
export function PotScreen() { ... }  // Doesn't match file name

// Wrong variable naming
const CurrentPotId = '123';          // Don't use PascalCase
const current_pot_id = '123';        // Don't use snake_case
const potId = '123';                 // OK, but be more descriptive

// Wrong function naming
function expenseCalculation() { ... } // Use verb: calculateExpenses
function CalculateSettlements() { ... } // Don't use PascalCase
function onSave() { ... }            // "on" is for props only

// Wrong interface naming
interface IExpense { ... }            // Don't use "I" prefix
interface Props { ... }               // Too generic
```

### ✅ Do This Instead

```tsx
// Correct file naming
PotHome.tsx              // Screen, no suffix
ExpensesTab.tsx          // Tab component
AddExpense.tsx           // Descriptive name

// Correct component naming
export function PotHome() { ... }  // Matches file name

// Correct variable naming
const currentPotId = '123';        // camelCase, descriptive
const isExpensePending = true;     // Boolean prefix

// Correct function naming
function calculateExpenses() { ... } // Verb-based
function handleSave() { ... }        // Event handler prefix
function getCurrentPot() { ... }     // Getter prefix

// Correct interface naming
interface Expense { ... }            // PascalCase, no prefix
interface PotHomeProps { ... }      // ComponentNameProps pattern
```

---

## Examples from Codebase

### ✅ Good Examples

```tsx
// Screen component
// File: PotHome.tsx
interface PotHomeProps {
  potId: string;
}
export function PotHome({ potId }: PotHomeProps) { ... }

// Tab component
// File: ExpensesTab.tsx
interface ExpensesTabProps {
  pot: Pot;
}
export function ExpensesTab({ pot }: ExpensesTabProps) { ... }

// Utility function
// File: settlements.ts
export function calculateSettlements(...): CalculatedSettlements { ... }

// Custom hook
// File: useTheme.ts
export function useTheme() { ... }

// Event handler
function handleExpenseAdd() { ... }
function handleSettlementConfirm() { ... }
```

---

**Last Updated:** January 14, 2025  
**Maintained By:** Development Team

