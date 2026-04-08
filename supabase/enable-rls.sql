-- Run in Supabase Dashboard → SQL Editor.
-- Enables RLS and adds permissive policies for anon + authenticated (browser client with anon key).
-- Replace policies later with auth-scoped rules (e.g. org_id, user_id) before production.

-- floor_plans
ALTER TABLE public.floor_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "floor_plans_all_anon_auth" ON public.floor_plans;
CREATE POLICY "floor_plans_all_anon_auth"
  ON public.floor_plans
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- spotters
ALTER TABLE public.spotters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "spotters_all_anon_auth" ON public.spotters;
CREATE POLICY "spotters_all_anon_auth"
  ON public.spotters
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- components
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "components_all_anon_auth" ON public.components;
CREATE POLICY "components_all_anon_auth"
  ON public.components
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- issues
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "issues_all_anon_auth" ON public.issues;
CREATE POLICY "issues_all_anon_auth"
  ON public.issues
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- issue_photos
ALTER TABLE public.issue_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "issue_photos_all_anon_auth" ON public.issue_photos;
CREATE POLICY "issue_photos_all_anon_auth"
  ON public.issue_photos
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
