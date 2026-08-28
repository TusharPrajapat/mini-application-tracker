-- Migration: 005_fix_profile_update_rls.sql
-- Description: Update profiles UPDATE policy to use SECURITY DEFINER function current_profile_role() for role check.

/*
  REASON FOR MIGRATION:
  Using current_profile_role() in the WITH CHECK clause ensures consistency with other RLS policies
  and prevents subquery execution during row updates that could trigger RLS policy recursion or subquery evaluation locks.
*/

DROP POLICY IF EXISTS "Users can update own profile except role" ON public.profiles;

CREATE POLICY "Users can update own profile except role"
ON public.profiles FOR UPDATE
USING (
  auth_user_id = auth.uid()
)
WITH CHECK (
  auth_user_id = auth.uid()
  AND role = current_profile_role()
);
