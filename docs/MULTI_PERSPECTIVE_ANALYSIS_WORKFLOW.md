# Multi-Perspective Analysis Workflow

Note: This workflow is now consolidated in `docs/PROMPT_PLAYBOOK.md`. Use the playbook as the canonical reference.
## Automated Prompt Orchestration for ChopDot Development

**Purpose:** When you request a feature, improvement, or change, I automatically analyze it from multiple perspectives and generate structured prompts to ensure clarity before implementation.

---

## Workflow Overview

```
Your Request
    ↓
[AI Analysis: Determine Perspectives Needed]
    ↓
[Generate Multi-Perspective Prompts]
    ↓
[Execute Analysis from Each Perspective]
    ↓
[Synthesize Findings]
    ↓
[Propose Implementation Plan]
```

---

## Step 1: Request Classification

When you make a request, I'll classify it:

| Request Type | Required Perspectives | Why |
|--------------|----------------------|-----|
| **New Feature** | Product Manager, Engineer, QA | Define scope, design architecture, plan tests |
| **Bug Fix** | QA Engineer, Engineer | Reproduce, identify root cause, minimal fix |
| **Performance Issue** | Engineer, QA | Identify bottlenecks, measure impact, verify |
| **Refactor** | Architect, Engineer, QA | Understand current state, design boundaries, verify unchanged |
| **UI/UX Change** | Product Manager, Engineer, QA | Define behavior, implement, verify |
| **Architecture Change** | Architect, Engineer | Map system, define boundaries, plan migration |
| **Financial Precision** | Engineer, QA | Verify Decimal.js usage, test edge cases |
| **Integration** | Engineer, QA | Understand API, design adapter, test |

---

## Step 2: Perspective Selection Matrix

### Always Include (Core Perspectives)

1. **Engineer** - Technical feasibility, implementation approach
2. **QA** - Testability, edge cases, acceptance criteria

### Conditionally Include

3. **Product Manager** - If user-facing or feature request
4. **Architect** - If structural changes or new boundaries
5. **Performance Engineer** - If performance-related
6. **Security Engineer** - If authentication/data handling

---

## Step 3: Automated Prompt Generation

For each perspective, I'll generate prompts following this structure:

### Template Structure

```
[PERSPECTIVE]: [Role Name]
─────────────────────────────────────────

Context:
- Request: [Your original request]
- Related Files: [Initial file scan results]
- Current Pattern: [Existing pattern if applicable]

Analysis Questions:
1. [Question from this perspective]
2. [Question from this perspective]
3. [Question from this perspective]

Deliverables:
- [ ] [Specific output from this perspective]
- [ ] [Specific output from this perspective]

Constraints:
- [Relevant constraints from PROMPT_GUIDE_REFERENCE.md]
```

---

## Step 4: Execution Pattern

I'll execute analysis in this order:

1. **System Mapping** (if needed)
   - Scan codebase for related files
   - Identify current patterns
   - Map dependencies

2. **Perspective Analysis** (parallel where possible)
   - Execute each perspective's prompts
   - Gather findings
   - Identify conflicts/gaps

3. **Synthesis**
   - Combine findings
   - Resolve conflicts
   - Identify risks

4. **Implementation Plan**
   - Files to modify
   - Files to add
   - Files NOT to touch
   - Rollback strategy
   - Acceptance criteria

---

## Example: Complete Workflow

### Your Request
```
"Add loading states to expense creation buttons"
```

### My Automated Analysis

#### [PERSPECTIVE 1]: Product Manager
─────────────────────────────────────────

**Context:**
- Request: Add loading states to expense creation buttons
- User Problem: Buttons appear dead during async operations
- Related Files: `src/components/screens/AddExpense.tsx`, `src/App.tsx`

**Analysis Questions:**
1. What user feedback indicates this is needed?
2. What's the expected user experience during loading?
3. Should loading state show progress or just "working"?
4. What happens if operation fails during loading?

**Deliverables:**
- [ ] User story with acceptance criteria
- [ ] UX flow diagram (before/after)
- [ ] Error state handling plan

**Constraints:**
- Must maintain optimistic UI pattern
- Cannot change expense creation logic

─────────────────────────────────────────

#### [PERSPECTIVE 2]: Engineer
─────────────────────────────────────────

**Context:**
- Request: Add loading states to expense creation buttons
- Current: `addExpenseToPot()` in `App.tsx` does optimistic update + async persistence
- Related Files: `src/App.tsx` (line 1636), `src/components/screens/AddExpense.tsx`

**Analysis Questions:**
1. Where is the button that needs loading state?
2. What async operations occur during expense creation?
3. How to track loading state (React state, service state, or both)?
4. Should loading state be per-button or global?
5. How to handle multiple simultaneous expense creations?

**Deliverables:**
- [ ] Component state management plan
- [ ] Integration points with existing async flow
- [ ] Files to modify list
- [ ] No behavior change verification plan

**Constraints:**
- Must maintain service boundary (Service → Repository → Source)
- Cannot change ExpenseService API
- Must preserve error handling

─────────────────────────────────────────

#### [PERSPECTIVE 3]: QA Engineer
─────────────────────────────────────────

**Context:**
- Request: Add loading states to expense creation buttons
- Current Behavior: Button click → immediate UI update → background save
- Expected Behavior: Button click → loading state → success/error

**Analysis Questions:**
1. What are all the expense creation entry points?
2. What edge cases exist (network failure, validation error, etc.)?
3. How to verify loading state appears/disappears correctly?
4. What happens if user navigates away during loading?

**Deliverables:**
- [ ] Test scenarios (happy path, error cases, edge cases)
- [ ] Acceptance criteria checklist
- [ ] Manual test steps
- [ ] Regression test plan

**Constraints:**
- Must verify no behavior change (expense still created correctly)
- Must verify error handling unchanged

─────────────────────────────────────────

### Synthesis & Implementation Plan

**Findings:**
- Button is in `AddExpense.tsx`, calls `onSave()` → `addExpenseToPot()` in `App.tsx`
- Current: Optimistic update (immediate) + async persistence
- Need: Loading state during async persistence phase
- Risk: Low (UI-only change, no logic change)

**Implementation Plan:**
- Files to modify:
  - `src/components/screens/AddExpense.tsx` - Add loading state prop
  - `src/App.tsx` - Track loading state in `addExpenseToPot()`
- Files to add: None
- Files NOT to touch:
  - `ExpenseService.ts` - No API changes
  - `ExpenseRepository.ts` - No changes
  - `calc.ts` - No calculation changes

**Rollback:** Revert two files, remove loading state prop

**Acceptance Criteria:**
- [ ] Button shows loading state during async save
- [ ] Loading state disappears on success
- [ ] Loading state disappears on error (with error toast)
- [ ] Expense creation behavior unchanged
- [ ] Optimistic update still works
- [ ] No UI flicker or race conditions

---

## Automated Workflow Rules

### Rule 1: Always Start with System Mapping
```
IF request involves existing code:
  - Scan codebase for related files
  - Identify current patterns
  - Map dependencies
  - Document current behavior
```

### Rule 2: Perspective Selection
```
IF new feature:
  → Include: Product Manager, Engineer, QA
  
IF bug fix:
  → Include: QA Engineer, Engineer
  
IF refactor:
  → Include: Architect, Engineer, QA
  
IF performance:
  → Include: Engineer, Performance Engineer, QA
```

### Rule 3: Constraint Application
```
FOR EACH perspective:
  - Apply relevant constraints from PROMPT_GUIDE_REFERENCE.md
  - Reference architectural patterns (service boundaries, financial precision)
  - Include rollback strategy
```

### Rule 4: Synthesis Before Implementation
```
BEFORE proposing code:
  - Combine all perspective findings
  - Resolve conflicts
  - Identify risks
  - Create implementation plan
  - Define acceptance criteria
```

---

## Quick Reference: Request → Perspectives

| Your Request Contains... | Perspectives to Include |
|-------------------------|------------------------|
| "Add feature..." | Product Manager, Engineer, QA |
| "Fix bug..." | QA Engineer, Engineer |
| "Improve performance..." | Engineer, Performance Engineer, QA |
| "Refactor..." | Architect, Engineer, QA |
| "Change UI..." | Product Manager, Engineer, QA |
| "Add validation..." | Engineer, QA |
| "Optimize..." | Engineer, Performance Engineer |
| "Integrate..." | Engineer, QA |
| "Financial precision..." | Engineer, QA (with Decimal.js focus) |
| "Service boundary..." | Architect, Engineer |

---

## How to Use This Workflow

### For You (The User)

**Just ask naturally:**
```
"Add loading states to expense creation buttons"
"I want to improve the expense search"
"Fix the bug where balances don't update"
```

**I'll automatically:**
1. Classify your request
2. Select appropriate perspectives
3. Generate analysis prompts
4. Execute analysis
5. Synthesize findings
6. Propose implementation plan

### For Me (The AI)

**When you make a request, I'll:**

1. **Parse Request**
   - Extract intent (feature/bug/refactor/etc.)
   - Identify affected areas (UI/logic/data/etc.)

2. **Select Perspectives**
   - Use matrix above
   - Include always-required (Engineer, QA)
   - Add conditional based on request type

3. **Generate Prompts**
   - One prompt per perspective
   - Follow template structure
   - Include constraints

4. **Execute Analysis**
   - System mapping (if needed)
   - Perspective analysis (parallel where possible)
   - Gather findings

5. **Synthesize**
   - Combine findings
   - Resolve conflicts
   - Identify risks

6. **Propose Plan**
   - Files to modify/add/not touch
   - Implementation approach
   - Rollback strategy
   - Acceptance criteria

---

## Example: Real Request Flow

### Your Request
```
"I want to add debounced search to the expense list"
```

### My Response Structure

```
🔍 ANALYZING REQUEST: Debounced search for expense list
─────────────────────────────────────────────────────

📋 REQUEST CLASSIFICATION:
- Type: Feature Enhancement
- Area: UI/Performance
- Complexity: Medium
- Perspectives Needed: Product Manager, Engineer, QA

─────────────────────────────────────────────────────

[PERSPECTIVE 1]: Product Manager
─────────────────────────────────────────
[Analysis questions and deliverables]

[PERSPECTIVE 2]: Engineer  
─────────────────────────────────────────
[Analysis questions and deliverables]

[PERSPECTIVE 3]: QA Engineer
─────────────────────────────────────────
[Analysis questions and deliverables]

─────────────────────────────────────────────────────

📊 SYNTHESIS:
[Combined findings]

📝 IMPLEMENTATION PLAN:
[Files, approach, acceptance criteria]

✅ READY TO IMPLEMENT?
[Ask for approval before coding]
```

---

## Integration with Existing Docs

This workflow integrates with:

- **PROMPT_GUIDE_REFERENCE.md** - Provides prompt templates
- **ARCHITECTURAL_AUDIT.md** - Provides system understanding
- **STABILITY_ROADMAP.md** - Provides priority context
- **User Rules** - Provides coding standards

---

## Benefits

1. **Clarity First** - Understand before implementing
2. **Multi-Perspective** - Catch issues from all angles
3. **Risk Reduction** - Identify problems early
4. **Consistency** - Same analysis pattern every time
5. **Documentation** - Analysis becomes documentation
6. **Reversibility** - Always have rollback plan

---

**Status:** Active Workflow  
**Usage:** Automatic - Just make your request naturally  
**Output:** Multi-perspective analysis → Implementation plan
