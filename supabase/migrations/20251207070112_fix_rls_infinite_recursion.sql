-- Fix infinite recursion in RLS policies
-- The issue: pots policy checks pot_members, pot_members policy checks pots = circular dependency

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read pots they are members of" ON public.pots;
DROP POLICY IF EXISTS "Pot owners can update pots" ON public.pots;
DROP POLICY IF EXISTS "Users can read pot members if they are a member" ON public.pot_members;
DROP POLICY IF EXISTS "Pot owners can manage members" ON public.pot_members;

-- ============================================================================
-- POTS TABLE POLICIES (avoid referencing pot_members)
-- ============================================================================

-- SELECT: Users can read pots they created
DROP POLICY IF EXISTS "Users can read their own pots" ON public.pots;
CREATE POLICY "Users can read their own pots"
ON public.pots
FOR SELECT
USING (created_by = auth.uid());

-- UPDATE: Users can update pots they created
DROP POLICY IF EXISTS "Users can update their own pots" ON public.pots;
CREATE POLICY "Users can update their own pots"
ON public.pots
FOR UPDATE
USING (created_by = auth.uid());

-- ============================================================================
-- POT_MEMBERS TABLE POLICIES (simple, no circular reference)
-- ============================================================================

-- SELECT: Users can read pot_members for pots they created
DROP POLICY IF EXISTS "Users can read members of their pots" ON public.pot_members;
CREATE POLICY "Users can read members of their pots"
ON public.pot_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pots
    WHERE pots.id = pot_members.pot_id
    AND pots.created_by = auth.uid()
  )
);

-- INSERT: Only pot creators can add members
DROP POLICY IF EXISTS "Pot creators can add members" ON public.pot_members;
CREATE POLICY "Pot creators can add members"
ON public.pot_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pots
    WHERE pots.id = pot_members.pot_id
    AND pots.created_by = auth.uid()
  )
);

-- UPDATE: Only pot creators can update members
DROP POLICY IF EXISTS "Pot creators can update members" ON public.pot_members;
CREATE POLICY "Pot creators can update members"
ON public.pot_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.pots
    WHERE pots.id = pot_members.pot_id
    AND pots.created_by = auth.uid()
  )
);

-- DELETE: Only pot creators can remove members
DROP POLICY IF EXISTS "Pot creators can remove members" ON public.pot_members;
CREATE POLICY "Pot creators can remove members"
ON public.pot_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.pots
    WHERE pots.id = pot_members.pot_id
    AND pots.created_by = auth.uid()
  )
);

-- ============================================================================
-- NOTES
-- ============================================================================
-- This simplified approach:
-- 1. Users can only see/manage pots they created (via created_by)
-- 2. Users can see/manage pot_members for pots they created
-- 3. No circular dependencies between policies
-- 4. Shared pots functionality can be added later via a junction table approach
