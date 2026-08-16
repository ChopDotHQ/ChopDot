-- Fixed queries to check if edits persisted
-- Pot ID: 1a6b158a-c1a8-44c1-af77-038686f5b74d (Devconnect Buenos Aires Sample)

-- 1. Check the full metadata for the pot we edited
SELECT 
  id,
  name,
  created_at,
  updated_at,
  last_edit_at,
  jsonb_array_length(COALESCE(metadata->'expenses', '[]'::jsonb)) as expense_count,
  jsonb_array_length(COALESCE(metadata->'members', '[]'::jsonb)) as member_count,
  metadata->'expenses' as expenses,
  metadata->'members' as members
FROM public.pots
WHERE id = '1a6b158a-c1a8-44c1-af77-038686f5b74d';

-- 2. Check if any expense contains "Test Expense" (using EXISTS)
SELECT 
  id,
  name,
  last_edit_at,
  jsonb_array_length(COALESCE(metadata->'expenses', '[]'::jsonb)) as expense_count,
  expense->>'memo' as expense_memo,
  expense->>'amount' as expense_amount
FROM public.pots,
  jsonb_array_elements(COALESCE(metadata->'expenses', '[]'::jsonb)) as expense
WHERE id = '1a6b158a-c1a8-44c1-af77-038686f5b74d'
  AND (expense->>'memo' LIKE '%Test Expense%' OR expense->>'memo' LIKE '%Browser Persistence%');

-- 3. Check if Charlie is in the members array (using EXISTS)
SELECT 
  id,
  name,
  last_edit_at,
  jsonb_array_length(COALESCE(metadata->'members', '[]'::jsonb)) as member_count,
  member->>'name' as member_name,
  member->>'id' as member_id
FROM public.pots,
  jsonb_array_elements(COALESCE(metadata->'members', '[]'::jsonb)) as member
WHERE id = '1a6b158a-c1a8-44c1-af77-038686f5b74d'
  AND member->>'name' = 'Charlie';

-- 4. Check when last_edit_at was updated (should be recent if edits persisted)
SELECT 
  id,
  name,
  last_edit_at,
  updated_at,
  EXTRACT(EPOCH FROM (NOW() - last_edit_at)) / 60 as minutes_since_last_edit,
  CASE 
    WHEN last_edit_at > NOW() - INTERVAL '10 minutes' THEN 'Recent (within 10 min)'
    WHEN last_edit_at > NOW() - INTERVAL '1 hour' THEN 'Recent (within 1 hour)'
    ELSE 'Old'
  END as edit_recency
FROM public.pots
WHERE id = '1a6b158a-c1a8-44c1-af77-038686f5b74d';

