-- Supabase Data Verification Queries
-- Run these in Supabase SQL Editor after testing CRUD operations

-- ============================================================================
-- 1. CHECK RECENT POTS
-- ============================================================================
-- Verify pots were created with correct structure
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
  jsonb_array_length(COALESCE(metadata->'members', '[]'::jsonb)) as members_count,
  jsonb_array_length(COALESCE(metadata->'expenses', '[]'::jsonb)) as expenses_count,
  metadata->'members' as members_preview,
  metadata->'expenses' as expenses_preview,
  last_edit_at,
  archived_at,
  created_at,
  updated_at
FROM pots
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- 2. CHECK POT MEMBERS (OWNER MEMBERSHIPS)
-- ============================================================================
-- Verify that every pot has an owner in pot_members table
SELECT 
  p.id as pot_id,
  p.name as pot_name,
  p.created_by,
  pm.id as member_id,
  pm.user_id,
  pm.role,
  pm.status,
  pm.joined_at,
  CASE 
    WHEN pm.id IS NULL THEN '❌ MISSING OWNER'
    WHEN pm.role != 'owner' THEN '⚠️  NOT OWNER'
    ELSE '✅ OK'
  END as status_check
FROM pots p
LEFT JOIN pot_members pm ON pm.pot_id = p.id AND pm.role = 'owner'
WHERE p.created_at > NOW() - INTERVAL '1 hour'  -- Recent pots only
ORDER BY p.created_at DESC;

-- ============================================================================
-- 3. VERIFY OWNER MEMBERSHIP CREATION
-- ============================================================================
-- Check if all pots with created_by have corresponding owner memberships
SELECT 
  COUNT(*) as total_pots,
  COUNT(pm.id) as pots_with_owner,
  COUNT(*) - COUNT(pm.id) as missing_owners
FROM pots p
LEFT JOIN pot_members pm ON pm.pot_id = p.id AND pm.role = 'owner'
WHERE p.created_at > NOW() - INTERVAL '1 hour';

-- Expected: missing_owners should be 0

-- ============================================================================
-- 4. CHECK METADATA STRUCTURE
-- ============================================================================
-- Verify metadata JSONB contains expected fields
SELECT 
  id,
  name,
  jsonb_typeof(metadata) as metadata_type,
  jsonb_object_keys(metadata) as metadata_keys,
  CASE 
    WHEN metadata ? 'members' THEN '✅'
    ELSE '❌'
  END as has_members,
  CASE 
    WHEN metadata ? 'expenses' THEN '✅'
    ELSE '❌'
  END as has_expenses,
  CASE 
    WHEN metadata ? 'history' THEN '✅'
    ELSE '❌'
  END as has_history
FROM pots
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 5. CHECK SPECIFIC POT DETAILS
-- ============================================================================
-- Replace 'YOUR_POT_ID' with an actual pot ID from your test
-- SELECT 
--   id,
--   name,
--   base_currency,
--   pot_type,
--   metadata->'members' as members,
--   metadata->'expenses' as expenses,
--   metadata->'budget' as budget_from_metadata,
--   budget as budget_from_column,
--   last_edit_at
-- FROM pots
-- WHERE id = 'YOUR_POT_ID';

-- ============================================================================
-- 6. VERIFY UPDATE OPERATIONS
-- ============================================================================
-- Check if updates are reflected (compare updated_at to created_at)
SELECT 
  id,
  name,
  created_at,
  updated_at,
  last_edit_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_since_creation,
  CASE 
    WHEN updated_at > created_at THEN '✅ Updated'
    ELSE '⚠️  Never updated'
  END as update_status
FROM pots
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;

-- ============================================================================
-- 7. CHECK FOR ARCHIVED POTS
-- ============================================================================
-- Verify archived_at handling
SELECT 
  id,
  name,
  archived_at,
  CASE 
    WHEN archived_at IS NOT NULL THEN '✅ Archived'
    ELSE 'Active'
  END as archive_status
FROM pots
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- ============================================================================
-- 8. VERIFY CASCADE DELETE (if you tested deletion)
-- ============================================================================
-- After deleting a pot, verify pot_members are also deleted
-- SELECT 
--   pm.id,
--   pm.pot_id,
--   pm.user_id,
--   pm.role
-- FROM pot_members pm
-- WHERE pm.pot_id NOT IN (SELECT id FROM pots);
-- 
-- Expected: Should return 0 rows (all orphaned members should be deleted)

-- ============================================================================
-- 9. SUMMARY STATS
-- ============================================================================
SELECT 
  COUNT(*) as total_pots,
  COUNT(DISTINCT created_by) as unique_creators,
  COUNT(*) FILTER (WHERE archived_at IS NOT NULL) as archived_pots,
  COUNT(*) FILTER (WHERE pot_type = 'expense') as expense_pots,
  COUNT(*) FILTER (WHERE pot_type = 'savings') as savings_pots,
  AVG(jsonb_array_length(COALESCE(metadata->'members', '[]'::jsonb))) as avg_members,
  AVG(jsonb_array_length(COALESCE(metadata->'expenses', '[]'::jsonb))) as avg_expenses
FROM pots
WHERE created_at > NOW() - INTERVAL '1 hour';

