-- Check if edits were saved (look for recent last_edit_at or new pots)

-- 1. Check ALL pots for your user, sorted by last_edit_at (most recent first)
SELECT 
  id,
  name,
  created_at,
  updated_at,
  last_edit_at,
  EXTRACT(EPOCH FROM (NOW() - last_edit_at)) / 60 as minutes_since_last_edit,
  jsonb_array_length(COALESCE(metadata->'expenses', '[]'::jsonb)) as expense_count,
  jsonb_array_length(COALESCE(metadata->'members', '[]'::jsonb)) as member_count
FROM public.pots
WHERE created_by = '31d13820-6b56-489e-859b-3cc25d017a70'
ORDER BY last_edit_at DESC NULLS LAST;

-- 2. Check if there are any pots created AFTER the sample pots (might be new pots from edits)
SELECT 
  id,
  name,
  created_at,
  updated_at,
  last_edit_at
FROM public.pots
WHERE created_by = '31d13820-6b56-489e-859b-3cc25d017a70'
  AND created_at > '2025-11-19 10:40:00'  -- After sample pots were created
ORDER BY created_at DESC;

-- 3. Check the exact metadata for the pot we edited (to see current state)
SELECT 
  id,
  name,
  last_edit_at,
  updated_at,
  metadata
FROM public.pots
WHERE id = '1a6b158a-c1a8-44c1-af77-038686f5b74d';

