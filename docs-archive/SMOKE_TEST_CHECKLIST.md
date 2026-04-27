# Smoke Test Checklist

**Date:** 2025-12-23  
**Purpose:** Verify core functionality after migration sync  
**Environment:** Production (after migrations pushed)

## Pre-Test Setup

- [ ] Clear browser cache/localStorage
- [ ] Verify Supabase connection (check network tab)
- [ ] Confirm user is logged in/authenticated
- [ ] Check browser console for errors

## Core Functionality Tests

### 1. Pot Creation
- [ ] Navigate to Pots tab
- [ ] Click "Create Pot" button
- [ ] Fill in pot name (e.g., "Test Pot")
- [ ] Select currency (test USD, DOT, USDC)
- [ ] Click "Create"
- [ ] Verify pot appears in pots list
- [ ] Verify pot can be opened
- [ ] Check browser console for errors

**Expected:** Pot created successfully, no errors in console

### 2. Expense Creation
- [ ] Open a pot
- [ ] Navigate to Expenses tab
- [ ] Click "Add Expense"
- [ ] Fill in expense details:
  - [ ] Description (e.g., "Test Expense")
  - [ ] Amount (e.g., 10.00)
  - [ ] Paid by (select member)
  - [ ] Split method (equal, percentage, shares)
- [ ] Click "Save"
- [ ] Verify expense appears in expenses list
- [ ] Verify expense shows correct amount and split
- [ ] Check browser console for errors

**Expected:** Expense created successfully, split calculated correctly

### 3. Settlement Flow
- [ ] Navigate to Settle tab
- [ ] Verify settlement suggestions appear (if balances exist)
- [ ] Click "Settle Up" button
- [ ] Review settlement details:
  - [ ] From/To members correct
  - [ ] Amount correct
  - [ ] Currency correct
- [ ] For crypto pots (DOT/USDC):
  - [ ] Verify wallet connection prompt appears
  - [ ] Connect wallet (if not already connected)
  - [ ] Verify settlement amount in crypto format
- [ ] Click "Confirm Settlement"
- [ ] Verify settlement appears in history
- [ ] Check browser console for errors

**Expected:** Settlement flow works, wallet connection works for crypto

### 4. Member Management
- [ ] Open a pot
- [ ] Navigate to Members tab
- [ ] Verify current members are displayed
- [ ] Check member balances are correct
- [ ] Verify "Add Member" functionality (if available)
- [ ] Check browser console for errors

**Expected:** Members displayed correctly, balances accurate

## Wallet Auth Tests

### 5. Wallet Authentication
- [ ] Sign out (if logged in)
- [ ] Click "Continue with Wallet" or wallet auth option
- [ ] Verify nonce request works
- [ ] Sign message with wallet
- [ ] Verify authentication succeeds
- [ ] Verify user profile is created
- [ ] Check browser console for errors
- [ ] Check Supabase `auth_nonces` table has entry
- [ ] Check Supabase `wallet_links` table has entry

**Expected:** Wallet auth works, nonces and wallet_links created

### 6. Wallet Linking
- [ ] Navigate to Settings/Account
- [ ] Verify connected wallets are displayed
- [ ] Add a new wallet (if functionality exists)
- [ ] Verify wallet appears in list
- [ ] Check Supabase `wallet_links` table

**Expected:** Wallet linking works, data persists

## Invites System Tests

### 7. Pot Invites
- [ ] Open a pot
- [ ] Look for "Invite" or "Share" functionality
- [ ] Send an invite to an email address
- [ ] Verify invite is created
- [ ] Check Supabase `invites` table has entry
- [ ] Verify invite token is generated
- [ ] Check browser console for errors

**Expected:** Invites can be created, data persists in database

### 8. Invite Acceptance (if possible)
- [ ] Use invite token/link
- [ ] Verify invite can be accepted
- [ ] Verify user is added to pot_members
- [ ] Verify invite status updates to "accepted"
- [ ] Check Supabase `invites` table status updated

**Expected:** Invite acceptance flow works

## RLS Policy Tests

### 9. Access Control
- [ ] Create a pot as User A
- [ ] Sign out
- [ ] Sign in as User B
- [ ] Verify User B cannot see User A's pot
- [ ] Verify User B cannot access User A's pot directly (if URL known)
- [ ] Check browser console for errors

**Expected:** RLS policies enforce access control correctly

### 10. Cross-User Pot Access (if invites work)
- [ ] User A creates pot and invites User B
- [ ] User B accepts invite
- [ ] User B signs in
- [ ] Verify User B can see and access the pot
- [ ] Verify User B can read expenses/members
- [ ] Verify User B cannot modify pot settings (if creator-only)
- [ ] Check browser console for errors

**Expected:** Shared pots work correctly with RLS

## Database Verification

### 11. Schema Verification
Run these SQL queries in Supabase SQL Editor:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'pots', 'pot_members', 'crdt_checkpoints', 'crdt_changes', 'receipts', 'auth_nonces', 'wallet_links', 'invites')
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'pots', 'pot_members', 'invites')
ORDER BY tablename;

-- Check key policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('pots', 'pot_members', 'users', 'invites')
ORDER BY tablename, policyname;

-- Check can_access_pot function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'can_access_pot';
```

**Expected:** All tables exist, RLS enabled, policies present, function exists

## Error Monitoring

### 12. Console Errors
- [ ] Open browser DevTools Console
- [ ] Perform all above tests
- [ ] Note any errors or warnings
- [ ] Check for:
  - [ ] RLS policy errors
  - [ ] Missing table errors
  - [ ] Authentication errors
  - [ ] Network errors

**Expected:** No critical errors, warnings are acceptable if non-blocking

## Performance Checks

### 13. Load Times
- [ ] Note time to load pots list
- [ ] Note time to create pot
- [ ] Note time to load pot details
- [ ] Note time to load expenses
- [ ] Check network tab for slow queries

**Expected:** Reasonable load times (< 2s for most operations)

## Test Results Summary

**Date Tested:** _______________  
**Tester:** _______________  
**Environment:** Production / Preview  

**Results:**
- Pot Creation: ✅ / ❌
- Expense Creation: ✅ / ❌
- Settlement Flow: ✅ / ❌
- Wallet Auth: ✅ / ❌
- Wallet Linking: ✅ / ❌
- Invites: ✅ / ❌
- RLS Policies: ✅ / ❌
- Schema Verification: ✅ / ❌

**Issues Found:**
- [List any issues]

**Notes:**
- [Additional observations]
