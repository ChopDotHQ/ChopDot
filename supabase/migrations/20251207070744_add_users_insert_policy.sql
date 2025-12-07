-- Add INSERT policy for users table
-- Allows authenticated users to create their own user record

CREATE POLICY "Users can insert their own record"
ON public.users
FOR INSERT
WITH CHECK (id = auth.uid());
