-- SQL to clear existing Supabase pots for testing
-- Run this in Supabase SQL Editor before logging back in

-- Delete pot members first (foreign key constraint)
DELETE FROM public.pot_members;

-- Delete pots
DELETE FROM public.pots;

-- Note: We keep the users table intact since we'll need it for the test

