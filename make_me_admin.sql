-- 1. First, ensure you have signed up or created a user in Supabase Authentication.
-- 2. Run this query in Supabase Dashboard > SQL Editor
-- 3. Replace 'admin@testwise.com' with your actual email address.

UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'shjyhyfa@gmail.com' -- << CHANGE THIS EMAIL
);

-- Verify the result
SELECT * FROM public.user_roles WHERE role = 'admin';
