# Supabase Integration Plan - Review & Recommendations

**Reviewer:** AI Assistant  
**Date:** November 18, 2025  
**Status:** Overall solid plan, with several critical additions recommended

---

## ✅ What's Good About the Plan

1. **Phased approach** - CRUD first, CRDT second is smart and reduces risk
2. **Clear ownership** - Each item has an owner
3. **Realistic scope** - Focuses on core functionality first
4. **Architecture alignment** - Your existing Service → Repository → Source pattern maps well to Supabase
5. **Auth already integrated** - Supabase auth is already working, so `auth.uid()` mapping is straightforward

---

## 🚨 Critical Missing Items

### 1. **Data Migration Strategy** ⚠️ CRITICAL
**Problem:** You have existing users with data in localStorage. How do you migrate them?

**Recommendation:**
```markdown
| Item | Description | Owner |
|------|-------------|-------|
| Migration script | One-time script to export localStorage data and import to Supabase. Handle conflicts (local vs remote). | App |
| Migration UI | Optional: In-app migration flow that prompts users to sync their data on first Supabase login. | App |
| Rollback plan | If migration fails, keep localStorage as fallback until migration succeeds. | App |
```

**Questions to answer:**
- What happens if a user has pots in localStorage but also pots in Supabase?
- Do we merge, overwrite, or let user choose?
- How do we handle ID conflicts?

### 2. **Error Handling & Offline Strategy** ⚠️ CRITICAL
**Problem:** What happens when Supabase is down or user is offline?

**Recommendation:**
```markdown
| Item | Description | Owner |
|------|-------------|-------|
| Offline detection | Detect network status, fallback to localStorage when offline. | App |
| Error boundaries | Wrap Supabase calls in try/catch, show user-friendly errors. | App |
| Retry logic | Queue failed mutations, retry when back online. | App |
| Graceful degradation | If Supabase fails, fall back to localStorage (Phase 1) or queue for later (Phase 2). | App |
```

**Current gap:** Your plan says "keep optimistic UI" but doesn't specify what happens when the mutation fails.

### 3. **Real-time Subscriptions** ⚠️ IMPORTANT
**Problem:** Your plan doesn't mention Supabase Realtime for live updates across devices.

**Recommendation:**
```markdown
| Item | Description | Owner |
|------|-------------|-------|
| Realtime subscriptions | Subscribe to `pots`, `expenses`, `pot_members` changes. Update UI when other devices make changes. | App |
| Subscription cleanup | Properly unsubscribe on component unmount to prevent memory leaks. | App |
| Conflict resolution | Handle case where user edits locally while remote change comes in via Realtime. | App |
```

**Why this matters:** Without Realtime, users won't see changes from other devices until they refresh. This defeats the "cross-device sync" goal.

### 4. **Performance & Optimization** ⚠️ IMPORTANT
**Problem:** No mention of pagination, caching, or query optimization.

**Recommendation:**
```markdown
| Item | Description | Owner |
|------|-------------|-------|
| Pagination | Pot lists, expense lists should be paginated (Supabase supports this). | App |
| Query optimization | Use `.select()` to only fetch needed columns, add filters to reduce data transfer. | App |
| Caching strategy | Cache pot data in memory/IndexedDB, invalidate on mutations. | App |
| Batch operations | Use Supabase's batch insert/update where possible (e.g., multiple expenses). | App |
```

**Current risk:** Loading all pots/expenses at once could be slow for users with lots of data.

### 5. **Data Validation & Type Safety** ⚠️ IMPORTANT
**Problem:** No mention of validating data before sending to Supabase.

**Recommendation:**
```markdown
| Item | Description | Owner |
|------|-------------|-------|
| Schema validation | Validate data against Supabase schema before insert/update (use Zod or similar). | App |
| Type mapping | Ensure TypeScript types match Supabase schema exactly (consider codegen). | App |
| Constraint handling | Handle foreign key violations, unique constraints gracefully. | App |
```

**Why this matters:** PostgREST will reject invalid data. Better to catch errors client-side first.

### 6. **Testing Strategy** ⚠️ IMPORTANT
**Problem:** Testing is mentioned in Phase 2 but not Phase 1.

**Recommendation:**
```markdown
| Item | Description | Owner |
|------|-------------|-------|
| Unit tests | Test Supabase source implementation (mock Supabase client). | App |
| Integration tests | Test full flow: create pot → add expense → verify in Supabase. | App |
| E2E tests | Test cross-device sync: create pot on Device A, verify on Device B. | App |
| Error scenarios | Test offline mode, network failures, rate limiting. | App |
```

---

## 📋 Recommended Additions to Phase 1

### A. Pre-Implementation Checklist
```markdown
| Item | Description | Owner |
|------|-------------|-------|
| Supabase source implementation | Create `SupabaseSource` class implementing same interface as `LocalStorageSource`. | App |
| Source switching | Add feature flag or env var to switch between LocalStorageSource and SupabaseSource. | App |
| Connection testing | Add health check to verify Supabase connection on app start. | App |
| Rate limit handling | Handle Supabase rate limits gracefully (429 errors). | App |
```

### B. Data Layer Updates
```markdown
| Item | Description | Owner |
|------|-------------|-------|
| Repository updates | Update repositories to work with Supabase data types (UUIDs, timestamps). | App |
| Type mapping | Map between app types and Supabase types (e.g., `amount_minor` vs `amount`). | App |
| Transaction support | Use Supabase transactions for multi-table operations (e.g., create pot + add members). | App |
```

### C. React Integration
```markdown
| Item | Description | Owner |
|------|-------------|-------|
| Loading states | Show loading indicators while fetching from Supabase. | App |
| Error states | Show error messages when Supabase operations fail. | App |
| Optimistic updates | Update UI immediately, rollback if Supabase call fails. | App |
| Refresh triggers | Add manual refresh buttons, auto-refresh on focus. | App |
```

---

## 🔍 Schema-Specific Considerations

Based on your schema inventory, here are specific items to address:

### 1. **Missing Tables in Plan**
Your plan mentions these tables, but your schema also has:
- `payments` - Not mentioned in plan
- `crdt_changes` / `crdt_checkpoints` - Mentioned in Phase 2, but structure should be planned in Phase 1
- `profiles` - Not mentioned (though you have auth)

### 2. **RLS Policy Gaps**
Your plan says "keep existing policies" but:
- `expenses` table has **no RLS** - anyone can read/write expenses
- `contributions` table has **no RLS** - anyone can read/write contributions
- `settlements` table has **no RLS** - anyone can read/write settlements

**Recommendation:** Even if you defer full RLS, add basic policies:
- Users can only read/write expenses for pots they're members of
- Users can only read/write contributions for expenses in their pots
- Users can only read/write settlements for their pots

### 3. **Foreign Key Constraints**
Your schema has FKs to `users` table, but:
- Is `users` table in Supabase `auth.users` or a separate `profiles` table?
- How do you handle wallet-only users who might not have a `profiles` row?

**Recommendation:** Clarify user ID mapping strategy.

### 4. **Default Values**
Your schema has defaults (e.g., `currency_code = 'DOT'`), but:
- Should these be enforced client-side or rely on DB defaults?
- What if client sends different currency?

**Recommendation:** Document which defaults are enforced where.

---

## 🎯 Phase 1 Enhancement Recommendations

### Add to Phase 1 Table:

| Item | Description | Owner | Priority |
|------|-------------|-------|----------|
| **Migration strategy** | Plan for migrating existing localStorage data to Supabase | App | HIGH |
| **Offline/error handling** | Fallback to localStorage when Supabase unavailable | App | HIGH |
| **Real-time subscriptions** | Subscribe to Supabase Realtime for live updates | App | HIGH |
| **Data validation** | Validate data before sending to Supabase | App | MEDIUM |
| **Performance optimization** | Pagination, caching, query optimization | App | MEDIUM |
| **Source switching** | Feature flag to toggle between LocalStorageSource and SupabaseSource | App | MEDIUM |
| **Testing** | Unit and integration tests for Supabase integration | App | MEDIUM |
| **Rate limit handling** | Handle 429 errors gracefully | App | LOW |
| **Connection health** | Health check on app start | App | LOW |

---

## 🔄 Phase 2 Enhancements

### Add to Phase 2 Table:

| Item | Description | Owner |
|------|-------------|-------|
| **CRDT + Realtime sync** | Combine CRDT changes with Realtime subscriptions for best of both worlds | App |
| **Conflict resolution UI** | Show users when conflicts occur and let them resolve | App |
| **Offline queue** | Queue CRDT changes when offline, sync when back online | App |
| **Snapshot strategy** | Decide on IPFS/Crust integration for checkpoint storage | Dev |

---

## ❓ Open Questions to Resolve

1. **User ID mapping**: How do wallet addresses map to Supabase user IDs? Is there a `profiles` table?
2. **Migration timing**: Do you migrate all users at once or gradually?
3. **RLS scope**: When exactly will you add RLS to `expenses`, `contributions`, `settlements`?
4. **CRDT storage**: Will CRDT changes be stored as bytea in Supabase or still use IPFS?
5. **Performance targets**: What's acceptable load time? How many pots/expenses per user?
6. **Error recovery**: If Supabase is down for hours, do users lose data or queue it?

---

## 📊 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Medium | High | Test migration thoroughly, keep localStorage backup |
| Performance issues with large datasets | High | Medium | Implement pagination early |
| Offline users lose functionality | High | Medium | Keep localStorage fallback in Phase 1 |
| RLS gaps allow unauthorized access | Medium | High | Add basic RLS policies even if minimal |
| Real-time sync conflicts | Medium | Low | Use CRDT in Phase 2, optimistic locking in Phase 1 |

---

## ✅ Final Verdict

**Overall:** The plan is **solid and well-structured**, but needs these additions:

1. ✅ **Add migration strategy** (critical for existing users)
2. ✅ **Add offline/error handling** (critical for reliability)
3. ✅ **Add Real-time subscriptions** (important for cross-device sync)
4. ✅ **Add performance considerations** (important for scalability)
5. ✅ **Clarify RLS scope** (important for security)

**Recommendation:** Add the items above to Phase 1 before starting implementation. The plan is about 80% complete - these additions will make it production-ready.

---

## 🚀 Suggested Next Steps

1. **Update Phase 1 table** with the recommended additions above
2. **Create migration script** as first Phase 1 task
3. **Set up SupabaseSource** as second task (parallel to migration planning)
4. **Add feature flag** to toggle between sources for gradual rollout
5. **Write integration tests** before full implementation

---

*This review is based on:*
- *Your existing codebase architecture (Service → Repository → Source pattern)*
- *Your Supabase schema inventory*
- *Best practices for Supabase integration*
- *Common pitfalls in similar migrations*

