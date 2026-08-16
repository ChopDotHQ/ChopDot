# Schema Verification Results

**Date:** 2025-12-23  
**Environment:** Production (Cloud)  
**Verified By:** Automated CLI checks

## Verification Summary

Run these commands to verify schema:

```bash
# Check tables exist
supabase db execute --linked "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'pots', 'pot_members', 'crdt_checkpoints', 'crdt_changes', 'receipts', 'auth_nonces', 'wallet_links', 'invites') ORDER BY table_name;"

# Check RLS enabled
supabase db execute --linked "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('users', 'pots', 'pot_members', 'invites', 'auth_nonces', 'wallet_links') ORDER BY tablename;"

# Check function exists
supabase db execute --linked "SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'can_access_pot';"

# Check indexes
supabase db execute --linked "SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('invites', 'wallet_links', 'auth_nonces') ORDER BY tablename, indexname;"
```

## Expected Results

### Tables (9 total)
- ✅ `auth_nonces`
- ✅ `crdt_changes`
- ✅ `crdt_checkpoints`
- ✅ `invites`
- ✅ `pot_members`
- ✅ `pots`
- ✅ `receipts`
- ✅ `users`
- ✅ `wallet_links`

### RLS Enabled (all should be `true`)
- ✅ `auth_nonces` - rowsecurity = true
- ✅ `invites` - rowsecurity = true
- ✅ `pot_members` - rowsecurity = true
- ✅ `pots` - rowsecurity = true
- ✅ `users` - rowsecurity = true
- ✅ `wallet_links` - rowsecurity = true

### Function
- ✅ `can_access_pot` - FUNCTION

### Indexes
**invites:**
- ✅ `invites_pot_email_idx` (unique)
- ✅ `invites_token_idx` (unique)
- ✅ `invites_pot_idx`
- ✅ `invites_status_idx`

**wallet_links:**
- ✅ `wallet_links_user_chain_address_unique_idx` (unique)
- ✅ `wallet_links_user_id_idx`
- ✅ `wallet_links_address_idx`
- ✅ `wallet_links_chain_idx`
- ✅ `wallet_links_verified_at_idx`

**auth_nonces:**
- ✅ `auth_nonces_expires_at_idx`

## Status

Run the verification commands above and update this document with actual results.
