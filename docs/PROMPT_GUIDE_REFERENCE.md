# Prompt Guide Reference Sheet

Note: This reference is now consolidated in `docs/PROMPT_PLAYBOOK.md`. Use the playbook as the canonical reference.
## Building ChopDot with AI Assistance

**Purpose:** Reference guide for crafting effective prompts when building ChopDot, synthesizing best practices from OpenAI's role-based guides.

---

## Core Prompting Principles

### 1. **Be Specific & Contextual**
❌ **Bad:** "Fix the expense bug"  
✅ **Good:** "Fix expense creation failing when `paidBy` is missing. Error occurs in `App.tsx` line 1708 when calling `expenseService.addExpense()`. Expected: validation error toast. Actual: silent failure."

### 2. **Provide Architectural Context**
Always reference your constraints and patterns:
- Financial precision (Decimal.js, minor units)
- Service boundaries (DataContext → Service → Repository → Source)
- Dual-write pattern (optimistic UI + async persistence)
- No wallet/Polkadot/settlement logic changes
- No new dependencies without justification

### 3. **Define Output Format**
Specify structure, scope, and constraints:
- "Create a TypeScript interface only, no implementation"
- "List files to modify, files to add, files NOT to touch"
- "Provide rollback strategy"

### 4. **Use Role-Based Prompting**
Assign specific roles to guide AI perspective:
- "Act as a senior staff engineer doing an architectural audit"
- "Act as a product manager prioritizing user-blocking issues"
- "Act as a QA engineer writing acceptance criteria"

---

## Role-Specific Prompt Templates

### 🏗️ **Engineering / Architecture**

#### Template: Architectural Analysis
```
Role & Scope:
You are acting as a [senior staff engineer / architect] doing [architectural audit / refactor plan / code review].

Your task is to [specific task] without changing behavior.

Constraints (Non-negotiable):
- Do NOT [specific constraint]
- Do NOT [specific constraint]
- All changes must be [reversible / scoped / tested]

Step 1 – [Analysis Phase]
[Specific analysis task]

Step 2 – [Design Phase]
[Specific design task]

Output Format:
- Sectioned markdown
- No code blocks except [interface definitions / examples]
- No implementation code
```

**Example:**
```
Role & Scope:
You are acting as a senior staff engineer doing an architectural audit.
Your task is to understand the current ChopDot codebase and propose minimal service boundaries without changing behavior.

Constraints:
- Do NOT add new features
- Do NOT change UI behavior
- Do NOT introduce new dependencies
- Do NOT touch wallet, Polkadot, or settlement logic

Step 1 – System Mapping
Identify the current source of truth for: groups, members, expenses, balances
List all files that read or mutate this data

Step 2 – Boundary Definition
Propose TypeScript interfaces for GroupService and ExpenseService
Interfaces must describe what the system does, not how
```

#### Template: Code Refactoring
```
Context:
- Current implementation: [file path] uses [pattern/approach]
- Problem: [specific issue]
- Goal: [desired outcome]

Constraints:
- Must maintain [existing behavior / API / performance]
- Cannot change [specific files / dependencies]
- Must be [reversible / testable / documented]

Task:
[Specific refactoring task]

Acceptance Criteria:
- [ ] [Specific test case]
- [ ] [Performance metric]
- [ ] [Edge case handling]
```

---

### 📦 **Product Management**

#### Template: Feature Prioritization
```
Context:
We're building ChopDot, an expense splitting app with [key features].

Current Issues:
1. [Issue 1] - [Impact]
2. [Issue 2] - [Impact]
3. [Issue 3] - [Impact]

User Feedback:
- [Specific user complaint / request]
- [Usage pattern observation]

Task:
Prioritize these issues based on:
1. User-blocking vs nice-to-have
2. Real problems vs theoretical improvements
3. Effort vs impact

Output:
- Prioritized list with rationale
- "Must fix" vs "Can defer"
- Estimated effort for each
```

**Example:**
```
Context:
We're building ChopDot, an expense splitting app with financial precision, multi-currency support, and on-chain settlements.

Current Issues:
1. Safari keyboard issue - blocks mobile expense entry
2. Missing loading states - buttons appear dead during async operations
3. Cross-user pots incomplete - sharing/invites local-only

User Feedback:
- "App feels slow when adding expenses"
- "Can't tell if my button click worked"

Task:
Prioritize these based on user-blocking vs nice-to-have. Focus on real problems that block users, not theoretical improvements.

Output:
- Prioritized list with rationale
- "Must fix" vs "Can defer"
```

#### Template: User Story Definition
```
As a [user type],
I want to [action],
So that [benefit].

Acceptance Criteria:
- [ ] [Specific behavior]
- [ ] [Edge case]
- [ ] [Error handling]

Technical Constraints:
- Must use [existing service / pattern]
- Cannot introduce [new dependency / breaking change]
- Must maintain [performance / precision / compatibility]
```

---

### 🧪 **QA / Testing**

#### Template: Test Case Generation
```
Context:
Feature: [feature name]
File: [file path]
Key Functions: [function names]

Test Scenarios:
1. [Happy path]
2. [Edge case]
3. [Error case]
4. [Performance case]

Constraints:
- Use [testing framework]
- Mock [external dependencies]
- Verify [specific behavior]

Output:
- Test cases with setup/teardown
- Expected vs actual assertions
- Edge case coverage
```

**Example:**
```
Context:
Feature: Expense creation with financial precision
File: src/services/data/services/ExpenseService.ts
Key Functions: addExpense()

Test Scenarios:
1. Create expense with 6-decimal precision (DOT/USDC)
2. Create expense with 2-decimal precision (USD)
3. Create expense with custom split
4. Create expense with invalid data (should validate)

Constraints:
- Use Vitest
- Mock PotRepository and ExpenseRepository
- Verify Decimal.js precision maintained

Output:
- Test cases with setup/teardown
- Expected vs actual assertions
```

#### Template: Acceptance Criteria
```
Feature: [Feature name]

Behavior Verification:
1. [User flow step-by-step]
   - Before: [current behavior]
   - After: [expected behavior]
   - Verification: [ ] [Specific check]

2. [Another user flow]
   - [Same structure]

Edge Cases:
- [ ] [Edge case 1]
- [ ] [Edge case 2]

Performance:
- [ ] [Metric 1] unchanged
- [ ] [Metric 2] unchanged
```

---

### 🔍 **Code Review / Debugging**

#### Template: Bug Investigation
```
Problem:
[Specific symptom - what user sees / experiences]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Behavior:
[What should happen]

Actual Behavior:
[What actually happens]

Context:
- File: [file path]
- Function: [function name]
- Related files: [list]
- Recent changes: [if known]

Task:
1. Identify root cause
2. Propose minimal fix
3. List files to modify
4. Provide rollback strategy
```

**Example:**
```
Problem:
Expense creation fails silently when `paidBy` is missing

Steps to Reproduce:
1. Open AddExpense screen
2. Fill amount, memo, date
3. Leave "Paid by" empty
4. Click Save

Expected Behavior:
Validation error toast: "Paid by is required"

Actual Behavior:
Silent failure, no toast, expense not created

Context:
- File: src/App.tsx, addExpenseToPot()
- Function: expenseService.addExpense()
- Related: ExpenseService.ts, ExpenseRepository.ts
- Recent changes: Added optimistic UI update

Task:
1. Identify where validation should occur
2. Propose minimal fix (add validation)
3. List files to modify
```

#### Template: Performance Analysis
```
Context:
Feature: [feature name]
Current Performance: [metric] takes [time]
User Impact: [specific complaint]

Investigation Scope:
- [File 1] - [suspected issue]
- [File 2] - [suspected issue]

Constraints:
- Cannot change [API / data structure]
- Must maintain [precision / correctness]

Task:
1. Identify bottlenecks
2. Propose optimizations
3. Verify no behavior change
4. Measure improvement
```

---

### 📚 **Documentation**

#### Template: Technical Documentation
```
Context:
Feature: [feature name]
Files: [list of files]
Pattern: [architectural pattern used]

Audience:
- [Developer level]
- [Purpose - onboarding / reference / decision record]

Sections Needed:
1. [Overview / Problem]
2. [Solution / Architecture]
3. [Usage Examples]
4. [Edge Cases / Gotchas]

Format:
- Markdown with code examples
- Include file paths and line references
- Link to related docs
```

**Example:**
```
Context:
Feature: Financial precision with Decimal.js
Files: src/utils/money.ts, src/services/settlement/calc.ts
Pattern: Minor unit conversion for all currency operations

Audience:
- Senior developers
- Purpose: Reference for maintaining precision

Sections Needed:
1. Problem: Floating-point errors in financial calculations
2. Solution: Decimal.js + minor units (cents/micro-units)
3. Usage: toMinorUnits(), fromMinorUnits(), computeBalances()
4. Gotchas: Always use Decimal for calculations, convert at boundaries

Format:
- Markdown with code examples
- Include file paths
- Link to ARCHITECTURAL_AUDIT.md
```

---

## ChopDot-Specific Prompt Patterns

### Pattern: Service Layer Changes
```
Context:
Current: [Service name] in [file path] handles [responsibility]
Problem: [specific issue]

Constraints:
- Must maintain service boundary (Service → Repository → Source)
- Cannot change DataSource interface
- Must preserve [caching / validation / error handling]

Task:
[Specific change]

Files:
- To modify: [list]
- To add: [list]
- NOT to touch: [list]

Rollback:
[How to revert if issues occur]
```

### Pattern: Financial Precision Changes
```
Context:
Current: [Component/function] uses [approach]
Issue: [precision issue]

Constraints:
- Must use Decimal.js for all calculations
- Must use minor units (cents/micro-units) internally
- Must convert at UI boundaries only
- Must maintain 6-decimal precision for DOT/USDC, 2-decimal for others

Task:
[Specific precision fix]

Verification:
- [ ] Calculations use Decimal.js
- [ ] Minor unit conversion at boundaries
- [ ] No floating-point math
- [ ] Tests updated for precision
```

### Pattern: UI State Management
```
Context:
Component: [Component name]
Current: Uses [state management approach]
Issue: [specific UI issue]

Constraints:
- Must maintain optimistic UI updates
- Must handle async persistence errors gracefully
- Cannot change [parent component / service API]

Task:
[Specific UI fix]

Acceptance:
- [ ] Optimistic update works
- [ ] Error handling shows toast
- [ ] State syncs with persisted data
- [ ] No UI flicker
```

---

## Common Prompt Anti-Patterns (What NOT to Do)

### ❌ **Too Vague**
```
"Fix the bug"
"Make it better"
"Refactor this"
```

### ❌ **Missing Context**
```
"Add validation" (without saying where/what/how)
"Optimize this" (without performance target)
```

### ❌ **Ignoring Constraints**
```
"Add a new library" (without checking dependency policy)
"Change the API" (without considering breaking changes)
```

### ❌ **No Acceptance Criteria**
```
"Implement feature X" (without defining success)
"Fix bug Y" (without test cases)
```

### ❌ **Scope Creep**
```
"Fix this and also add that feature"
"Refactor this and optimize that"
```

---

## Best Practices Checklist

Before sending a prompt, verify:

- [ ] **Specific:** Clear task definition with file paths and function names
- [ ] **Contextual:** References existing patterns, constraints, and architecture
- [ ] **Scoped:** Defines what to change and what NOT to change
- [ ] **Constrained:** Lists non-negotiable constraints (no new deps, no behavior change, etc.)
- [ ] **Measurable:** Includes acceptance criteria or success metrics
- [ ] **Reversible:** Provides rollback strategy for risky changes
- [ ] **Formatted:** Specifies output format (markdown, code, table, etc.)
- [ ] **Role-Based:** Assigns appropriate role (engineer, PM, QA, etc.)

---

## Quick Reference: Prompt Templates by Task Type

| Task Type | Template | Key Elements |
|-----------|----------|--------------|
| **Architecture** | Engineering → Architectural Analysis | Constraints, System mapping, Interfaces only |
| **Bug Fix** | Code Review → Bug Investigation | Steps to reproduce, Root cause, Minimal fix |
| **Feature** | Product → User Story | User story, Acceptance criteria, Technical constraints |
| **Refactor** | Engineering → Code Refactoring | Current pattern, Problem, Goal, Rollback |
| **Performance** | Code Review → Performance Analysis | Current metric, Bottlenecks, No behavior change |
| **Documentation** | Documentation → Technical Docs | Audience, Sections, Format, Links |
| **Testing** | QA → Test Case Generation | Scenarios, Constraints, Framework |

---

## Example: Complete Prompt Flow

### Initial Prompt (Architecture)
```
Role & Scope:
You are acting as a senior staff engineer doing an architectural audit.
Your task is to understand the current ChopDot codebase and propose minimal service boundaries without changing behavior.

Constraints:
- Do NOT add new features
- Do NOT change UI behavior
- Do NOT introduce new dependencies
- Do NOT touch wallet, Polkadot, or settlement logic

Step 1 – System Mapping
Identify the current source of truth for: groups, members, expenses, balances
List all files that read or mutate this data

Step 2 – Boundary Definition
Propose TypeScript interfaces for GroupService and ExpenseService
Interfaces must describe what the system does, not how
```

### Follow-Up Prompt (Implementation)
```
Context:
Based on ARCHITECTURAL_AUDIT.md, we want to route expense creation through the ExpenseService interface.

Current: App.tsx calls expenseService.addExpense() after optimistic UI update
Problem: No explicit interface contract, hard to test

Constraints:
- Must maintain optimistic UI pattern
- Cannot change ExpenseService implementation
- Must preserve error handling (toast on failure)

Task:
Add ExpenseService interface and make existing ExpenseService class implement it.
Route ONE mutation path (expense creation) through interface.

Files:
- To add: src/services/data/interfaces/ExpenseService.ts
- To modify: src/services/data/services/ExpenseService.ts, src/App.tsx
- NOT to touch: Repositories, Sources, Components

Acceptance:
- [ ] TypeScript compiles
- [ ] Expense creation works identically
- [ ] No runtime changes
- [ ] Interface can be used for testing
```

### Verification Prompt (Testing)
```
Context:
We've introduced ExpenseService interface. Need to verify behavior unchanged.

Feature: Expense creation
Files: src/App.tsx (addExpenseToPot), src/services/data/services/ExpenseService.ts

Test Scenarios:
1. Create expense with valid data → Should appear immediately, persist successfully
2. Create expense with invalid data → Should show validation error
3. Create expense with service failure → Should show "Saved locally" toast
4. Create expense with custom split → Should calculate balances correctly

Constraints:
- Use existing test patterns
- Mock ExpenseRepository
- Verify optimistic update + async persistence

Output:
- Test cases with assertions
- Expected vs actual behavior
```

---

## Tips for Effective Prompting

1. **Start Broad, Then Narrow**
   - First: "Analyze the architecture"
   - Then: "Propose interfaces"
   - Finally: "Implement one path"

2. **Reference Previous Work**
   - "Based on ARCHITECTURAL_AUDIT.md..."
   - "Following the pattern in ExpenseService..."
   - "Similar to how we handle..."

3. **Use Constraints as Guardrails**
   - Explicitly state what NOT to do
   - Reference architectural decisions
   - Link to existing docs

4. **Define Success Clearly**
   - "Behavior unchanged" vs "Performance improved"
   - "Type-safe" vs "Runtime tested"
   - "Documented" vs "Self-explanatory"

5. **Iterate on Prompts**
   - If output is too broad → Add constraints
   - If output is too narrow → Add context
   - If output is wrong → Clarify constraints

---

## Resources

- **Architectural Patterns:** `/docs/ARCHITECTURAL_AUDIT.md`
- **Financial Precision:** `/docs/FINANCIAL_PRECISION_SUMMARY.md`
- **Stability Roadmap:** `/docs/STABILITY_ROADMAP.md`
- **User Rules:** `.cursorrules` or user preferences

---

**Last Updated:** 2025-01-XX  
**Maintained By:** Development Team  
**Purpose:** Improve prompt quality and AI assistance effectiveness
