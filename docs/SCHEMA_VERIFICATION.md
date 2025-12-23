# Schema Verification Guide

**Date:** 2025-12-23  
**Purpose:** Verify schema parity between local and production after migrations

## Quick Verification

Run these queries in Supabase SQL Editor: https://supabase.com/dashboard/project/jpzacnkirymlyxwmafox/sql

### 1. Tables Check
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'pots', 'pot_members', 'crdt_checkpoints', 'crdt_changes', 'receipts', 'auth_nonces', 'wallet_links', 'invites')
ORDER BY table_name;
```

**Expected:** 9 tables should exist

### 2. RLS Check
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'pots', 'pot_members', 'invites', 'auth_nonces', 'wallet_links')
ORDER BY tablename;
```

**Expected:** All tables should have `rowsecurity = true`

### 3. Policies Check
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('pots', 'pot_members', 'users', 'invites')
ORDER BY tablename, policyname;
```

**Expected:** Should see policies like:
- `pots`: "Users can read accessible pots", "Users can update their own pots", "Users can delete their own pots"
- `pot_members`: "Members can read pot_members", "Pot creators can add members", etc.
- `users`: "Users can read all users", "Users can insert their own record", "Users can update their own profile"
- `invites`: "Inviter or members can view invites", etc.

### 4. Function Check
```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'can_access_pot';
```

**Expected:** Function should exist with `routine_type = 'FUNCTION'`

### 5. Indexes Check
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('invites', 'wallet_links', 'auth_nonces')
ORDER BY tablename, indexname;
```

**Expected:** 
- `invites`: `invites_pot_email_idx`, `invites_token_idx`, `invites_pot_idx`, `invites_status_idx`
- `wallet_links`: `wallet_links_user_chain_address_unique_idx`, `wallet_links_user_id_idx`, etc.
- `auth_nonces`: `auth_nonces_expires_at_idx`

## Detailed Schema Comparison

### Core Tables Structure

#### users
- Should have: `id`, `wallet_address`, `name`, `avatar_url`, `created_at`, `updated_at`, `last_seen_at`
- Constraints: `id` PRIMARY KEY, `wallet_address` UNIQUE

#### pots
- Should have: `id`, `name`, `created_by`, `base_currency`, `archived_at`, etc.
- Constraints: `id` PRIMARY KEY, `created_by` FOREIGN KEY to `users.id`

#### pot_members
- Should have: `id`, `pot_id`, `user_id`, `role`, `status`
- Constraints: `id` PRIMARY KEY, `(pot_id, user_id)` UNIQUE, FOREIGN KEYs to `pots` and `users`

#### auth_nonces
- Should have: `address`, `nonce`, `expires_at`, `created_at`
- Constraints: `address` PRIMARY KEY
- Indexes: `auth_nonces_expires_at_idx`

#### wallet_links
- Should have: `id`, `user_id`, `chain`, `address`, `provider`, `verified_at`, `created_at`, `updated_at`
- Constraints: `id` PRIMARY KEY, `(user_id, chain, LOWER(address))` UNIQUE
- Indexes: Multiple indexes for queries

#### invites
- Should have: `id`, `pot_id`, `invitee_email`, `status`, `token`, `expires_at`, `accepted_at`, `accepted_by`, `created_by`, `created_at`
- Constraints: `id` PRIMARY KEY, `(pot_id, invitee_email)` UNIQUE, `token` UNIQUE
- Indexes: Multiple indexes for lookups

## Verification Checklist

- [ ] All 9 core tables exist
- [ ] RLS is enabled on all security-sensitive tables
- [ ] Key RLS policies exist and are correct
- [ ] `can_access_pot` function exists
- [ ] All expected indexes exist
- [ ] No duplicate constraints (check for errors)
- [ ] Foreign key constraints are correct

## Common Issues to Check

1. **Missing Tables:** If any table is missing, the migration didn't apply
2. **RLS Not Enabled:** If `rowsecurity = false`, RLS policies won't work
3. **Missing Policies:** If policies are missing, users may have incorrect access
4. **Missing Function:** If `can_access_pot` is missing, pot access policies will fail
5. **Duplicate Constraints:** Check for errors about duplicate primary keys/unique constraints

## Next Steps After Verification

If schema verification passes:
1. Run smoke tests (see `SMOKE_TEST_CHECKLIST.md`)
2. Test wallet auth flow
3. Test invites system
4. Monitor for errors in production

If schema verification fails:
1. Note which checks failed
2. Review migration files for the failed items
3. Check Supabase migration history
4. Re-run specific migrations if needed
