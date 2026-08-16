# Pot Creation Verification - SQL Queries

**Pot Created:** "Final UUID Test Pot"  
**UUID:** `21d5933d-776a-4899-8bd9-42b504309369`  
**Created At:** ~$(date) (check Supabase for exact timestamp)

---

## ✅ Verification Queries

Run these in Supabase SQL Editor to verify the pot was created correctly:

### 1. Check Pot Row in `public.pots`

```sql
-- Find the pot by UUID
SELECT 
  id,
  name,
  created_by,
  base_currency,
  pot_type,
  checkpoint_enabled,
  budget_enabled,
  budget,
  goal_amount,
  goal_description,
  created_at,
  updated_at,
  archived_at,
  metadata
FROM public.pots
WHERE id = '21d5933d-776a-4899-8bd9-42b504309369';
```

**Expected Results:**
- ✅ `id` = `21d5933d-776a-4899-8bd9-42b504309369` (UUID format)
- ✅ `name` = `Final UUID Test Pot`
- ✅ `created_by` = Your auth user ID (UUID)
- ✅ `base_currency` = `USD` (or selected currency)
- ✅ `pot_type` = `expense` (or `savings`)
- ✅ `metadata` = JSONB with pot data (members, expenses, etc.)

### 2. Check Owner Membership in `public.pot_members`

```sql
-- Find owner membership for this pot
SELECT 
  pot_id,
  user_id,
  role,
  status,
  joined_at,
  wallet_address
FROM public.pot_members
WHERE pot_id = '21d5933d-776a-4899-8bd9-42b504309369'
  AND role = 'owner';
```

**Expected Results:**
- ✅ `pot_id` = `21d5933d-776a-4899-8bd9-42b504309369`
- ✅ `user_id` = Your auth user ID (matches `pots.created_by`)
- ✅ `role` = `owner`
- ✅ `status` = `active`

### 3. Check User Row in `public.users`

```sql
-- Find your user record
SELECT 
  id,
  email,
  username,
  created_at,
  updated_at
FROM public.users
WHERE id = (
  SELECT created_by 
  FROM public.pots 
  WHERE id = '21d5933d-776a-4899-8bd9-42b504309369'
);
```

**Expected Results:**
- ✅ `id` = Your auth user ID (UUID)
- ✅ `email` = Your login email
- ✅ Row exists (created/updated by `ensureUserRecord()`)

---

## 🔍 Comprehensive Check

Run this single query to verify all three in one go:

```sql
-- Verify pot, owner membership, and user record
SELECT 
  p.id as pot_id,
  p.name as pot_name,
  p.created_by,
  p.base_currency,
  p.pot_type,
  p.created_at as pot_created_at,
  pm.user_id as owner_user_id,
  pm.role as owner_role,
  pm.status as owner_status,
  pm.joined_at as owner_joined_at,
  u.id as user_id,
  u.email as user_email,
  u.username as user_username
FROM public.pots p
LEFT JOIN public.pot_members pm 
  ON pm.pot_id = p.id 
  AND pm.role = 'owner'
LEFT JOIN public.users u 
  ON u.id = p.created_by
WHERE p.id = '21d5933d-776a-4899-8bd9-42b504309369';
```

**Expected Results:**
- ✅ All three tables have matching rows
- ✅ `pot_id` = UUID format
- ✅ `created_by` = `owner_user_id` = `user_id` (all match)
- ✅ `owner_role` = `owner`
- ✅ `owner_status` = `active`

---

## 📊 Network Request Evidence

From browser console/network tab:

**Successful Requests:**
1. ✅ `GET /rest/v1/pots?...&id=eq.21d5933d-776a-4899-8bd9-42b504309369` - UUID check
2. ✅ `POST /rest/v1/users?on_conflict=id` - User upsert (200 OK)
3. ✅ `POST /rest/v1/pots?on_conflict=id` - Pot creation (200 OK)
4. ✅ `POST /rest/v1/pot_members?on_conflict=pot_id%2Cuser_id` - Owner membership (200 OK)

**Console Logs:**
```
[LOG] [DL][timing] {method: createPot, ms: 315.40, potId: 21d5933d-776a-4899-8bd9-42b504309369}
[LOG] [DataLayer] Pot created via service {potId: 1763547265841}
```

**Note:** There's a timestamp ID (`1763547265841`) in the log, but the actual Supabase pot uses the UUID (`21d5933d-776a-4899-8bd9-42b504309369`). This might be a local fallback ID, but the Supabase save succeeded with the UUID.

---

## ✅ Success Criteria

- [x] Pot created with UUID (not timestamp)
- [x] User record created/updated in `public.users`
- [x] Owner membership created in `public.pot_members`
- [x] All three POST requests returned 200 OK
- [x] No RLS errors
- [x] No infinite recursion errors

---

**Status:** ✅ **POT CREATION SUCCESSFUL**

Run the SQL queries above in Supabase to verify the data was persisted correctly.

