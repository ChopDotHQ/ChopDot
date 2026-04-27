# Manual Testing Guide - Supabase Integration

**Status:** Ready for manual verification  
**Date:** November 18, 2025

---

## ✅ What I Can Do For You

1. ✅ **Started dev server** - Running at http://localhost:5173 with `VITE_DATA_SOURCE=supabase`
2. ✅ **Created SQL verification queries** - See `scripts/verify-supabase-data.sql`
3. ✅ **Verified code implementation** - All automated checks pass

## ⚠️ What You Need To Do (Browser Testing)

I **cannot** interact with browser UIs (clicking, typing, etc.), so you'll need to:

1. **Open the app** in your browser: http://localhost:5173
2. **Log in** via Supabase auth (email/password or wallet)
3. **Test CRUD operations** through the UI:
   - Create a new pot
   - Edit the pot (change name, budget, etc.)
   - Add members/expenses (if UI supports it)
   - Delete a pot
4. **Run SQL queries** (see below) to verify data in Supabase

---

## 🧪 Testing Steps

### Step 1: Verify Dev Server is Running

```bash
# Check if server is running
curl http://localhost:5173 | head -20

# Or check logs
tail -f /tmp/chopdot-dev.log
```

### Step 2: Test Fallback Logic (Before Login)

1. **Temporarily remove Supabase env vars:**
   ```bash
   # Backup current .env
   cp .env .env.backup
   
   # Remove Supabase vars
   sed -i '' '/VITE_SUPABASE/d' .env
   ```

2. **Reload the app** in browser (hard refresh: Cmd+Shift+R)

3. **Check browser console** - Should see:
   ```
   [DataContext] Supabase not configured. Falling back to LocalStorageSource.
   ```

4. **Restore env vars:**
   ```bash
   cp .env.backup .env
   ```

### Step 3: Test CRUD Operations

#### Create Pot
1. Log in via Supabase auth
2. Create a new pot through UI
3. Fill in:
   - Name: "Test Pot"
   - Type: Expense
   - Base Currency: USD
   - Budget: 1000
   - Add a member if possible

#### Update Pot
1. Edit the pot you just created
2. Change name to "Updated Test Pot"
3. Change budget to 2000

#### Delete Pot
1. Delete the test pot

### Step 4: Verify in Supabase

Run these queries in **Supabase SQL Editor**:

#### Quick Check - Recent Pots
```sql
SELECT 
  id,
  name,
  base_currency,
  pot_type,
  budget,
  jsonb_array_length(COALESCE(metadata->'members', '[]'::jsonb)) as members_count,
  created_at
FROM pots
ORDER BY created_at DESC
LIMIT 5;
```

#### Verify Owner Memberships
```sql
SELECT 
  p.id as pot_id,
  p.name,
  p.created_by,
  pm.user_id,
  pm.role,
  pm.status
FROM pots p
LEFT JOIN pot_members pm ON pm.pot_id = p.id AND pm.role = 'owner'
WHERE p.created_at > NOW() - INTERVAL '1 hour'
ORDER BY p.created_at DESC;
```

**Expected:** Every pot should have a `pot_members` row with `role = 'owner'`

#### Check Metadata Structure
```sql
SELECT 
  id,
  name,
  metadata->'members' as members,
  metadata->'expenses' as expenses,
  metadata->'budget' as budget_from_metadata
FROM pots
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 3;
```

**Expected:** `metadata` should contain `members` and `expenses` arrays

---

## 📋 Full SQL Verification Script

See `scripts/verify-supabase-data.sql` for comprehensive verification queries.

To run:
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste queries from `scripts/verify-supabase-data.sql`
3. Run each section and verify results

---

## ✅ Success Criteria

After manual testing, verify:

- [ ] **Pots created** - Rows appear in `public.pots` table
- [ ] **Metadata populated** - `metadata` JSONB contains `members` and `expenses`
- [ ] **Owner memberships** - Every pot has a row in `pot_members` with `role='owner'`
- [ ] **Updates work** - `updated_at` changes when pot is edited
- [ ] **Deletes work** - Pot removed from `pots`, cascade removes from `pot_members`
- [ ] **Fallback works** - Warning appears when env vars removed

---

## 🐛 Troubleshooting

### Dev Server Not Starting
```bash
# Check if port is in use
lsof -ti:5173

# Kill existing process
lsof -ti:5173 | xargs kill -9

# Restart
VITE_DATA_SOURCE=supabase npm run dev
```

### No Data in Supabase
- Check browser console for errors
- Verify you're logged in (check `auth.uid()`)
- Check Supabase RLS policies allow your user to insert

### Owner Membership Missing
- Check `created_by` is set on pot
- Verify `ensureOwnerMembership()` was called
- Check Supabase logs for errors

---

## 📝 Notes

- **Dev server logs:** `/tmp/chopdot-dev.log`
- **Dev server PID:** `/tmp/chopdot-dev.pid` (to stop: `kill $(cat /tmp/chopdot-dev.pid)`)
- **SQL queries:** `scripts/verify-supabase-data.sql`

---

*Ready for your manual testing! Let me know what you find.*

