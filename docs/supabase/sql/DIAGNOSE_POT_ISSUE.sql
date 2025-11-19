-- Comprehensive diagnostic queries
-- User ID: 31d13820-6b56-489e-859b-3cc25d017a70

-- 1. Check if ANY pots exist for your user
SELECT COUNT(*) as pot_count
FROM public.pots
WHERE created_by = '31d13820-6b56-489e-859b-3cc25d017a70';

-- 2. List ALL pots (to see what exists)
SELECT 
  id,
  name,
  created_by,
  created_at,
  updated_at,
  last_edit_at
FROM public.pots
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check if your user exists in auth.users
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE id = '31d13820-6b56-489e-859b-3cc25d017a70';

-- 4. Check if your user exists in public.users
SELECT 
  id,
  email,
  username,
  created_at
FROM public.users
WHERE id = '31d13820-6b56-489e-859b-3cc25d017a70';

-- 5. If pots exist, check their metadata
SELECT 
  id,
  name,
  last_edit_at,
  jsonb_array_length(COALESCE(metadata->'expenses', '[]'::jsonb)) as expense_count,
  jsonb_array_length(COALESCE(metadata->'members', '[]'::jsonb)) as member_count,
  metadata
FROM public.pots
WHERE created_by = '31d13820-6b56-489e-859b-3cc25d017a70'
ORDER BY created_at DESC;

