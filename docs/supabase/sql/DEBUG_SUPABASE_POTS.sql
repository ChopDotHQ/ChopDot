-- Debug queries to find pots in Supabase

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
  jsonb_array_length(metadata->'expenses') as expense_count,
  jsonb_array_length(metadata->'members') as member_count
FROM public.pots
WHERE created_by = (
  SELECT id FROM auth.users 
  WHERE email = 'devpen787@gmail.com'  -- Replace with your email
  LIMIT 1
)
ORDER BY created_at DESC;

-- 2. Alternative: List all pots (if you know your user ID)
-- Replace 'YOUR_USER_ID' with your actual auth user ID
SELECT 
  id,
  name,
  created_by,
  base_currency,
  pot_type,
  created_at,
  updated_at,
  last_edit_at,
  jsonb_array_length(metadata->'expenses') as expense_count,
  jsonb_array_length(metadata->'members') as member_count
FROM public.pots
WHERE created_by = 'YOUR_USER_ID'  -- Replace with your user ID
ORDER BY created_at DESC;

-- 3. Get your user ID from auth.users
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. List all pots (no filter) - to see what exists
SELECT 
  id,
  name,
  created_by,
  created_at,
  updated_at,
  last_edit_at
FROM public.pots
ORDER BY created_at DESC
LIMIT 10;

