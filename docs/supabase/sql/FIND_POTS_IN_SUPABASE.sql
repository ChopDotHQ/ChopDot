-- Step 1: Find your user ID from auth.users
-- Run this first to get your user ID
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: List ALL pots (no filter) to see what exists
-- This will show you all pots regardless of owner
SELECT 
  id,
  name,
  created_by,
  base_currency,
  pot_type,
  created_at,
  updated_at,
  last_edit_at,
  jsonb_array_length(COALESCE(metadata->'expenses', '[]'::jsonb)) as expense_count,
  jsonb_array_length(COALESCE(metadata->'members', '[]'::jsonb)) as member_count
FROM public.pots
ORDER BY created_at DESC
LIMIT 20;

-- Step 3: After you get your user_id from Step 1, replace 'YOUR_USER_ID' below
-- and run this to see YOUR pots
SELECT 
  id,
  name,
  created_by,
  base_currency,
  pot_type,
  created_at,
  updated_at,
  last_edit_at,
  jsonb_array_length(COALESCE(metadata->'expenses', '[]'::jsonb)) as expense_count,
  jsonb_array_length(COALESCE(metadata->'members', '[]'::jsonb)) as member_count,
  metadata->'expenses' as expenses_array,
  metadata->'members' as members_array
FROM public.pots
WHERE created_by = 'YOUR_USER_ID'  -- Replace with your user_id from Step 1
ORDER BY created_at DESC;

-- Step 4: Check if any pot has the test expense we added
-- This searches ALL pots for the expense memo
SELECT 
  id,
  name,
  created_by,
  last_edit_at,
  jsonb_array_elements(metadata->'expenses') as expense
FROM public.pots
WHERE metadata->'expenses' IS NOT NULL
  AND metadata->'expenses' != '[]'::jsonb
  AND (
    jsonb_array_elements(metadata->'expenses')->>'memo' LIKE '%Test Expense%'
    OR jsonb_array_elements(metadata->'expenses')->>'memo' LIKE '%Browser Persistence%'
  );

-- Step 5: Check if any pot has Charlie as a member
SELECT 
  id,
  name,
  created_by,
  last_edit_at,
  jsonb_array_elements(metadata->'members') as member
FROM public.pots
WHERE metadata->'members' IS NOT NULL
  AND metadata->'members' != '[]'::jsonb
  AND jsonb_array_elements(metadata->'members')->>'name' = 'Charlie';

