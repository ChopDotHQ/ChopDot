-- Add INSERT policy for users table
-- Allows authenticated users to create their own user record

DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
CREATE POLICY "Users can insert their own record"
ON public.users
FOR INSERT
WITH CHECK (id = auth.uid());
