DROP POLICY IF EXISTS "select_org_if_member" ON organizations;
CREATE POLICY "select_org_if_member" ON organizations 
FOR SELECT TO authenticated 
USING (
  id IN (SELECT public.get_user_orgs()) OR created_by = auth.uid()
);

-- Also let's just make sure update policy works for creators too just in case
DROP POLICY IF EXISTS "update_org_if_member" ON organizations;
CREATE POLICY "update_org_if_member" ON organizations 
FOR UPDATE TO authenticated 
USING (
  id IN (SELECT public.get_user_orgs()) OR created_by = auth.uid()
) WITH CHECK (
  id IN (SELECT public.get_user_orgs()) OR created_by = auth.uid()
);
