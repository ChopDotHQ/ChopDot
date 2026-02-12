# Multi-Agent Coordination Strategy

**Date:** December 2024  
**Context:** USDC Implementation + PSA UX Work

---

## Conflict Risk Assessment

### 🔴 HIGH RISK - Files Both Agents May Touch

| File | USDC Changes | PSA Changes | Conflict Risk |
|------|--------------|-------------|---------------|
| `src/components/screens/SettleHome.tsx` | Add USDC settlement logic | ✅ Already PSA-styled | **MEDIUM** - Different sections |
| `src/components/screens/ExpensesTab.tsx` | Add USDC settlement modal | ✅ Already PSA-styled | **MEDIUM** - Different sections |

### 🟢 LOW RISK - Separate Concerns

| File | USDC Changes | PSA Changes | Conflict Risk |
|------|--------------|-------------|---------------|
| `src/services/chain/polkadot.ts` | Add USDC functions | None | **LOW** - Backend logic |
| `src/services/chain/adapter.ts` | Add USDC types | None | **LOW** - Type definitions |
| `src/services/chain/sim.ts` | Add USDC mocks | None | **LOW** - Test mocks |
| `src/schema/pot.ts` | Extend PotHistory schema | None | **LOW** - Schema only |
| `src/styles/globals.css` | None | CSS tokens (different section) | **LOW** - Different sections |

---

## Coordination Strategy

### Option 1: Sequential Work (Recommended)

**Phase 1: USDC Implementation First**
- Complete USDC chain service (low conflict risk)
- Complete USDC settlement logic in `SettleHome.tsx` and `ExpensesTab.tsx`
- **Then:** PSA agent can verify PSA styles still work

**Phase 2: PSA Verification**
- PSA agent tests USDC flows with PSA styles
- Minor adjustments if needed

**Pros:**
- ✅ Minimal conflicts
- ✅ Clear ownership
- ✅ Easier to test

**Cons:**
- ⚠️ Sequential (slower overall)

---

### Option 2: Parallel Work with Clear Boundaries

**USDC Agent Focus:**
- ✅ `src/services/chain/*` - All chain service files
- ✅ `src/schema/pot.ts` - Schema updates
- ✅ `SettleHome.tsx` - **Only** settlement logic (lines ~340-500)
- ✅ `ExpensesTab.tsx` - **Only** settlement modal logic (lines ~108-450)

**PSA Agent Focus:**
- ✅ `SettleHome.tsx` - **Only** styling/className props (already done)
- ✅ `ExpensesTab.tsx` - **Only** styling/className props (already done)
- ✅ CSS and design tokens
- ✅ Other components

**Coordination Rules:**
1. **USDC Agent:** Add logic, preserve existing PSA className/style props
2. **PSA Agent:** Avoid touching settlement logic sections
3. **Both:** Use git branches and communicate changes

**Pros:**
- ✅ Parallel work (faster)
- ✅ Clear boundaries

**Cons:**
- ⚠️ Requires coordination
- ⚠️ Merge conflicts possible

---

### Option 3: File Ownership (Hybrid)

**USDC Agent Owns:**
- `src/services/chain/*` (all files)
- `src/schema/pot.ts`
- Settlement logic sections in `SettleHome.tsx` and `ExpensesTab.tsx`

**PSA Agent Owns:**
- `src/styles/globals.css` (PSA section)
- `src/utils/usePSAStyle.ts`
- Styling props in all components

**Coordination:**
- USDC agent adds new JSX elements → uses existing PSA patterns
- PSA agent verifies new elements work with PSA styles

**Pros:**
- ✅ Clear ownership
- ✅ Can work in parallel
- ✅ Natural separation

**Cons:**
- ⚠️ Requires communication

---

## Recommended Approach: Option 3 (File Ownership)

### Implementation Plan

#### USDC Agent Work:
1. **Phase 1:** Chain service (`src/services/chain/*`) - **No conflicts**
2. **Phase 2:** Schema (`src/schema/pot.ts`) - **No conflicts**
3. **Phase 3:** Settlement logic (`SettleHome.tsx`, `ExpensesTab.tsx`)
   - Add USDC settlement functions
   - **Preserve existing PSA className/style props**
   - Use existing PSA patterns: `const { isPSA, psaStyles, psaClasses } = usePSAStyle();`

#### PSA Agent Work:
1. Continue PSA styling on other components
2. **Avoid:** Settlement logic sections in `SettleHome.tsx` and `ExpensesTab.tsx`
3. **After USDC merge:** Verify PSA styles work with new USDC flows

---

## Conflict Prevention Checklist

### For USDC Agent:
- [ ] Import `usePSAStyle` hook if adding new UI elements
- [ ] Use existing PSA patterns: `className={isPSA ? psaClasses.card : 'card'}`
- [ ] Don't modify PSA-related CSS or design tokens
- [ ] Test with PSA style enabled after implementation

### For PSA Agent:
- [ ] Avoid modifying settlement logic sections
- [ ] Focus on styling props (`className`, `style`) only
- [ ] Test USDC flows after USDC agent completes work

---

## Git Workflow

### Recommended Branch Strategy:

```
main
├── feature/usdc-implementation (USDC agent)
│   ├── Phase 1: Chain service
│   ├── Phase 2: Schema
│   └── Phase 3: Settlement logic
│
└── feature/psa-styling (PSA agent)
    └── Other components
```

### Merge Strategy:
1. **USDC agent** merges to `main` first (smaller, focused changes)
2. **PSA agent** merges after, resolves any conflicts
3. Both agents test final integration

---

## Communication Protocol

### Before Starting:
- ✅ USDC agent: Announce which files will be modified
- ✅ PSA agent: Confirm which files are being worked on

### During Work:
- ✅ Use descriptive commit messages
- ✅ Comment in code if touching shared files
- ✅ Test both default and PSA styles

### After Completion:
- ✅ USDC agent: Verify PSA styles still work
- ✅ PSA agent: Test USDC flows with PSA enabled

---

## Conflict Resolution

### If Merge Conflicts Occur:

**In `SettleHome.tsx` or `ExpensesTab.tsx`:**

1. **USDC logic conflicts:** USDC agent resolves (they own the logic)
2. **PSA styling conflicts:** PSA agent resolves (they own the styling)
3. **Both conflict:** Coordinate via comments/communication

**Resolution Pattern:**
```typescript
// USDC logic (USDC agent owns)
const handleUsdcSettlement = async () => {
  // ... USDC logic
};

// PSA styling (PSA agent owns)
<div
  className={isPSA ? psaClasses.card : 'card'}  // PSA styling
  onClick={handleUsdcSettlement}  // USDC logic
>
```

---

## Testing Checklist

### USDC Agent:
- [ ] Test USDC settlements in **default** style
- [ ] Test USDC settlements in **PSA** style
- [ ] Verify PSA styles are preserved

### PSA Agent:
- [ ] Test USDC flows with PSA styles enabled
- [ ] Verify new USDC UI elements have PSA styling
- [ ] Check for any styling regressions

---

## Summary

**Risk Level:** 🟡 **MEDIUM** - Manageable with coordination

**Recommended Strategy:** **Option 3 (File Ownership)**
- Clear boundaries
- Can work in parallel
- Minimal conflicts expected

**Key Files to Coordinate:**
- `src/components/screens/SettleHome.tsx` (lines ~340-500 for USDC logic)
- `src/components/screens/ExpensesTab.tsx` (lines ~108-450 for USDC logic)

**Success Criteria:**
- ✅ USDC settlements work
- ✅ PSA styles preserved
- ✅ No merge conflicts
- ✅ Both styles tested
