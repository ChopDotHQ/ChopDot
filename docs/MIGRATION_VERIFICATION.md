# Migration Verification One-Pager

**Last Updated:** 2025-12-23  
**Purpose:** Track which migrations exist and where they're applied (local/preview/prod)

## Migration Inventory

### Local Migrations (supabase/migrations/)

| Migration File | Timestamp | Description | Status | Notes |
|---------------|-----------|-------------|--------|-------|
| `20241113000001_initial_schema.sql` | 2024-11-13 | Initial CRDT schema (users, pots, pot_members, crdt_checkpoints, crdt_changes, receipts) | ✅ Fixed | Primary schema with RLS policies |
| `20251117163627_drop_all_public_tables.sql` | 2025-11-17 | Drop all public tables | ⚠️ Review | May conflict with remote schema |
| `20251118144415_remote_schema.sql` | 2025-11-18 | Remote schema pull (duplicate constraints fixed) | ✅ Fixed | Had duplicate PKs/constraints/indexes - now commented out |
| `20251118160000_add_payload_columns.sql` | 2025-11-18 | Add payload columns | ✅ Applied | Schema additions |
| `20251118173000_fix_pot_members_rls.sql` | 2025-11-18 | Fix pot members RLS | ✅ Applied | RLS policy fixes |
| `20251127120000_create_auth_nonces.sql` | 2025-11-27 | Create auth nonces table | ✅ Applied | Wallet auth support |
| `20251205000000_create_wallet_links.sql` | 2025-12-05 | Create wallet_links table | ✅ Applied | Wallet linking support |
| `20251207070112_fix_rls_infinite_recursion.sql` | 2025-12-07 | Fix RLS infinite recursion | ✅ Applied | RLS bug fix |
| `20251207070744_add_users_insert_policy.sql` | 2025-12-07 | Add users insert policy | ✅ Applied | RLS policy addition |
| `20251208000000_create_invites.sql` | 2025-12-08 | Create invites table | ✅ Applied | Invitation system |
| `20251208001500_enable_pot_access_for_members.sql` | 2025-12-08 | Enable pot access for members | ✅ Applied | RLS policy updates |
| `20251217190000_fix_pot_create_rls.sql` | 2025-12-17 | Fix pot create RLS | ✅ Applied | Latest local migration |

**Total Local Migrations:** 12

### Cloud Migrations (To Verify)

Check Supabase Dashboard: https://supabase.com/dashboard/project/jpzacnkirymlyxwmafox/database/migrations

**Expected Cloud Migrations:**
- All 5 local migrations above (if pushed)
- Any migrations added by Liam/Teddy (unknown - need to verify)

## Environment Status

### Local Development
- **Status:** ✅ Working (after conflict fixes)
- **Last Reset:** 2025-12-23
- **Applied Migrations:** All 5 local migrations
- **Verification:** `supabase db reset` succeeds

### Preview Environment
- **Status:** ❓ Unknown
- **Needs Verification:** 
  - Which migrations are applied?
  - Does schema match local?
  - Any migration conflicts?

### Production Environment
- **Status:** ❓ Unknown
- **Needs Verification:**
  - Which migrations are applied?
  - Does schema match local?
  - Any migration conflicts?

## Verification Checklist

### Step 1: Pull Cloud Migrations
```bash
# Login to Supabase
supabase login

# Link project (if not already linked)
supabase link --project-ref jpzacnkirymlyxwmafox

# Pull migrations from cloud
supabase db pull
```

**Expected Outcome:**
- Download any migrations that exist in cloud but not locally
- Compare with local migrations list above

### Step 2: Compare Migration Lists

**Action Items:**
- [ ] List all migrations in cloud dashboard
- [ ] Compare with local migrations
- [ ] Identify any cloud-only migrations
- [ ] Identify any local-only migrations
- [ ] Document any discrepancies

### Step 3: Verify Schema Parity

**For each environment (local/preview/prod):**

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Check constraints
SELECT conname, conrelid::regclass, contype 
FROM pg_constraint 
WHERE connamespace = 'public'::regnamespace 
ORDER BY conrelid::regclass, conname;
```

**Compare:**
- [ ] Tables match across environments
- [ ] RLS policies match
- [ ] Constraints match (no duplicates)
- [ ] Indexes match

### Step 4: Test Migration Application

**Local Test:**
```bash
# Reset and verify all migrations apply cleanly
supabase db reset

# Check for errors
# Should complete without constraint/index conflicts
```

**Cloud Test (if possible):**
- [ ] Verify migrations can be applied to preview
- [ ] Verify migrations can be applied to prod (if safe)

## Known Issues & Fixes

### Fixed Issues

1. **Duplicate PRIMARY KEY constraints** (2025-12-23)
   - **File:** `20251118144415_remote_schema.sql`
   - **Issue:** Tried to add PKs that already existed from `20241113000001_initial_schema.sql`
   - **Fix:** Commented out duplicate constraint additions with references to original migration
   - **Affected:** crdt_changes, crdt_checkpoints, pot_members, pots, receipts, users

2. **Duplicate UNIQUE constraints** (2025-12-23)
   - **File:** `20251118144415_remote_schema.sql`
   - **Issue:** Tried to add UNIQUE constraints that already existed
   - **Fix:** Commented out duplicates
   - **Affected:** pot_members, crdt_changes, receipts, users

3. **Duplicate FOREIGN KEY constraints** (2025-12-23)
   - **File:** `20251118144415_remote_schema.sql`
   - **Issue:** Tried to add FKs that already existed
   - **Fix:** Commented out duplicates
   - **Affected:** crdt_changes, crdt_checkpoints, pot_members, pots, receipts

4. **Duplicate INDEXES** (2025-12-23)
   - **File:** `20251118144415_remote_schema.sql`
   - **Issue:** Tried to create indexes that already existed
   - **Fix:** Commented out duplicates
   - **Affected:** All CRDT and pot-related indexes

5. **Duplicate RLS POLICIES** (2025-12-23)
   - **File:** `20251118144415_remote_schema.sql`
   - **Issue:** Tried to create policies that already existed
   - **Fix:** Commented out duplicates
   - **Affected:** All CRDT and pot-related policies

### Open Questions

1. **Liam/Teddy Migrations:** What migrations did they add to cloud? When?
2. **Migration Order:** Is `20251117163627_drop_all_public_tables.sql` safe to run in cloud?
3. **Schema Drift:** Are there any schema differences between local and cloud?

## Next Steps

1. **Immediate:** Run `supabase db pull` to get cloud migrations
2. **Compare:** Document differences between local and cloud migration lists
3. **Coordinate:** Check with Liam/Teddy about any migrations they added
4. **Verify:** Run schema parity checks for all environments
5. **Fix:** Resolve any migration conflicts or schema drift
6. **Test:** Run smoke tests once migrations are verified

## Commands Reference

```bash
# Check local migrations
ls -1 supabase/migrations/*.sql

# Pull from cloud
supabase login
supabase link --project-ref jpzacnkirymlyxwmafox
supabase db pull

# Reset local (applies all migrations)
supabase db reset

# Check migration status
supabase migration list

# Push local migrations to cloud
supabase db push
```

## Related Docs

- `SUPABASE_SETUP.md` - General Supabase setup guide
- `supabase-dev.sh` - Helper script for migration commands
- Migration conflict fix: See git commit `be255d1` and related commits
