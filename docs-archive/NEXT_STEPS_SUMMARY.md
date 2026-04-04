# Next Steps Summary

**Date:** 2025-12-23  
**Status:** Migrations synced ✅ | Schema verification needed | Smoke tests needed

## ✅ Completed

1. **Migration Sync**
   - ✅ Identified 8 missing migrations in cloud
   - ✅ Fixed idempotency issues in 3 migrations
   - ✅ Successfully pushed all 8 migrations to production
   - ✅ All 12 migrations now synced between local and cloud

2. **Documentation Created**
   - ✅ Migration verification one-pager (`MIGRATION_VERIFICATION.md`)
   - ✅ Smoke test checklist (`SMOKE_TEST_CHECKLIST.md`)
   - ✅ Schema verification guide (`SCHEMA_VERIFICATION.md`)

## 🔄 Next Steps (In Order)

### Step 1: Schema Verification (5 minutes)

**Action:** Run SQL queries in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/jpzacnkirymlyxwmafox/sql
2. Run the queries from `docs/SCHEMA_VERIFICATION.md`
3. Verify:
   - All 9 tables exist
   - RLS is enabled on all tables
   - `can_access_pot` function exists
   - All expected indexes exist

**Expected:** All checks pass ✅

### Step 2: Smoke Tests (15-20 minutes)

**Action:** Follow `docs/SMOKE_TEST_CHECKLIST.md`

**Critical Tests:**
1. ✅ Pot creation (USD, DOT, USDC)
2. ✅ Expense creation and splitting
3. ✅ Settlement flow (especially crypto)
4. ✅ Wallet authentication
5. ✅ RLS access control

**How to Test:**
- Open your production app URL
- Follow the checklist step-by-step
- Note any errors in browser console
- Document results in the checklist

### Step 3: Feature-Specific Tests (10 minutes)

**Wallet Auth:**
- [ ] Sign out
- [ ] Click "Continue with Wallet"
- [ ] Verify nonce request works
- [ ] Sign message
- [ ] Verify authentication succeeds
- [ ] Check `auth_nonces` table has entry
- [ ] Check `wallet_links` table has entry

**Invites:**
- [ ] Create a pot
- [ ] Send invite to email
- [ ] Verify `invites` table has entry
- [ ] Verify invite token is generated

**RLS Policies:**
- [ ] Create pot as User A
- [ ] Sign out, sign in as User B
- [ ] Verify User B cannot see User A's pot
- [ ] Verify User B cannot access User A's pot directly

## 📋 Quick Reference

**Migration Status:**
- Local: 12 migrations ✅
- Cloud: 12 migrations ✅
- Status: Fully synced ✅

**Key Files:**
- `docs/MIGRATION_VERIFICATION.md` - Migration tracking
- `docs/SMOKE_TEST_CHECKLIST.md` - Test procedures
- `docs/SCHEMA_VERIFICATION.md` - Schema verification queries

**Supabase Dashboard:**
- SQL Editor: https://supabase.com/dashboard/project/jpzacnkirymlyxwmafox/sql
- Migrations: https://supabase.com/dashboard/project/jpzacnkirymlyxwmafox/database/migrations
- Tables: https://supabase.com/dashboard/project/jpzacnkirymlyxwmafox/editor

## 🎯 Success Criteria

**Schema Verification:**
- ✅ All 9 tables exist
- ✅ RLS enabled on all security tables
- ✅ All policies exist
- ✅ Function exists
- ✅ All indexes exist

**Smoke Tests:**
- ✅ Pot creation works
- ✅ Expense creation works
- ✅ Settlement flow works
- ✅ Wallet auth works
- ✅ No critical console errors

## ⚠️ If Issues Found

1. **Schema Issues:**
   - Check migration history in Supabase dashboard
   - Review migration files for missing items
   - Re-run specific migrations if needed

2. **Functional Issues:**
   - Check browser console for errors
   - Verify RLS policies are correct
   - Check network tab for failed requests
   - Review Supabase logs

3. **RLS Issues:**
   - Verify policies exist (see schema verification)
   - Check `can_access_pot` function exists
   - Verify user authentication is working

## 📝 Notes

- All migrations are now idempotent (safe to re-run)
- Production schema should match local development
- Wallet auth and invites features are now available in production
- RLS infinite recursion bug is fixed
