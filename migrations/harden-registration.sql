-- Hardening for public registration.
--
-- The original policies assume every account belongs to the agency. With a public
-- "Registrarse" link that is no longer true: any registered visitor could read the
-- agency's keys, rewrite its settings, or join someone else's team. Idempotent.

-- 1) portal_settings holds the agency's n8n / Coolify / AI / SMTP / OAuth secrets.
--    The app only touches it through server routes using the service role (which bypasses
--    RLS), so no policy for `authenticated` is needed at all.
DROP POLICY IF EXISTS "Authenticated users can read portal settings" ON portal_settings;
DROP POLICY IF EXISTS "Admin can update portal settings" ON portal_settings;
REVOKE ALL ON portal_settings FROM anon, authenticated;

-- 2) profiles.team_id decides which team's data a user can see (client_instances,
--    credentials, templates, widgets...). The "update own profile" policy let anyone
--    set their own team_id to any value. Only the server (service role) may change it.
CREATE OR REPLACE FUNCTION public.protect_profile_team_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.team_id IS DISTINCT FROM OLD.team_id
     AND coalesce(auth.role(), '') <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'team_id can only be changed by the server' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_team_id ON profiles;
CREATE TRIGGER protect_profile_team_id
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_team_id();
