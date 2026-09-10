-- Fix select_org_membership recursion
DROP POLICY IF EXISTS "select_org_membership" ON organization_members;

-- The best way to prevent recursion is to just allow users to see all organization members 
-- IF they share an organization, BUT to bypass the policy check on the subquery, we can 
-- use a security definer function or just avoid the direct recursive check.
-- Actually, the easiest non-recursive way for organization_members is:
-- A user can see rows where they are the user_id, OR they can see rows for organizations they belong to.
-- Since Postgres might recurse on IN (SELECT...), we use a wrapper or just simplify.
CREATE OR REPLACE FUNCTION public.get_user_orgs()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = auth.uid();
$$;

CREATE POLICY "select_org_membership" ON organization_members 
FOR SELECT TO authenticated 
USING (
  user_id = auth.uid() OR 
  organization_id IN (SELECT public.get_user_orgs())
);

-- Fix organizations policy recursion
DROP POLICY IF EXISTS "select_org_if_member" ON organizations;
CREATE POLICY "select_org_if_member" ON organizations 
FOR SELECT TO authenticated 
USING (
  id IN (SELECT public.get_user_orgs())
);

DROP POLICY IF EXISTS "update_org_if_member" ON organizations;
CREATE POLICY "update_org_if_member" ON organizations 
FOR UPDATE TO authenticated 
USING (
  id IN (SELECT public.get_user_orgs())
) WITH CHECK (
  id IN (SELECT public.get_user_orgs())
);
