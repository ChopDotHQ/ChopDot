-- Verified User ID from network requests: 31d13820-6b56-489e-859b-3cc25d017a70

-- 1. List all pots for your user
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
WHERE created_by = '31d13820-6b56-489e-859b-3cc25d017a70'
ORDER BY created_at DESC;

-- 2. Check metadata for expense "Test Expense - Browser Persistence Check"
SELECT 
  id,
  name,
  last_edit_at,
  jsonb_array_length(COALESCE(metadata->'expenses', '[]'::jsonb)) as expense_count,
  jsonb_array_elements(metadata->'expenses') as expense
FROM public.pots
WHERE created_by = '31d13820-6b56-489e-859b-3cc25d017a70'
  AND metadata->'expenses' IS NOT NULL
  AND jsonb_array_length(COALESCE(metadata->'expenses', '[]'::jsonb)) > 0;

-- 3. Check metadata for member "Charlie"
SELECT 
  id,
  name,
  last_edit_at,
  jsonb_array_length(COALESCE(metadata->'members', '[]'::jsonb)) as member_count,
  jsonb_array_elements(metadata->'members') as member
FROM public.pots
WHERE created_by = '31d13820-6b56-489e-859b-3cc25d017a70'
  AND metadata->'members' IS NOT NULL
  AND jsonb_array_length(COALESCE(metadata->'members', '[]'::jsonb)) > 0;

-- 4. Find pot with the test expense
SELECT 
  id,
  name,
  last_edit_at,
  jsonb_array_elements(metadata->'expenses')->>'memo' as expense_memo,
  jsonb_array_elements(metadata->'expenses')->>'amount' as expense_amount
FROM public.pots
WHERE created_by = '31d13820-6b56-489e-859b-3cc25d017a70'
  AND metadata->'expenses' IS NOT NULL
  AND (
    jsonb_array_elements(metadata->'expenses')->>'memo' LIKE '%Test Expense%'
    OR jsonb_array_elements(metadata->'expenses')->>'memo' LIKE '%Browser Persistence%'
  );

-- 5. Find pot with Charlie as member
SELECT 
  id,
  name,
  last_edit_at,
  jsonb_array_elements(metadata->'members')->>'name' as member_name
FROM public.pots
WHERE created_by = '31d13820-6b56-489e-859b-3cc25d017a70'
  AND metadata->'members' IS NOT NULL
  AND jsonb_array_elements(metadata->'members')->>'name' = 'Charlie';

