-- Fix RLS Infinite Recursion Bug

-- 1. Create a secure function to check admin status
-- This function runs as the database owner (security definer), bypassing RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Admins can do everything with user_roles" ON public.user_roles;

-- 3. Re-create the admin policy using the secure function
CREATE POLICY "Admins can do everything with user_roles"
  ON public.user_roles
  FOR ALL
  USING (public.is_admin());

-- Note: The "Users can read their own role" policy is safe and remains unchanged.
