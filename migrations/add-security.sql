-- Seguridad del panel: registro de eventos sospechosos, IPs bloqueadas y cierre de permisos que ya no hacen falta.
-- Idempotente: se puede ejecutar más de una vez. Pégalo en Supabase → SQL Editor → Run.

-- 1) Eventos sospechosos y IPs bloqueadas (solo el servidor accede, con la clave de servicio)
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  kind TEXT NOT NULL,
  path TEXT,
  user_agent TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_kind ON security_events(kind, created_at DESC);

CREATE TABLE IF NOT EXISTS blocked_ips (
  ip TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  manual BOOLEAN NOT NULL DEFAULT FALSE
);

-- IPs de confianza (las tuyas): nunca se bloquean. Se registran solas cuando entras al panel.
CREATE TABLE IF NOT EXISTS trusted_ips (
  ip TEXT PRIMARY KEY,
  label TEXT NOT NULL DEFAULT '',
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  auto BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON security_events, blocked_ips, trusted_ips FROM anon, authenticated;
GRANT ALL ON security_events, blocked_ips, trusted_ips TO service_role;

-- 2) Nadie puede cambiar su propia antigüedad ni su id (el panel considera administrador al perfil más antiguo):
--    sin esto, cualquier cliente con acceso podría ponerse una fecha anterior y convertirse en admin.
CREATE OR REPLACE FUNCTION public.protect_profile_identity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.id IS DISTINCT FROM OLD.id)
     AND coalesce(auth.role(), '') <> 'service_role'
     AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'created_at and id can only be changed by the server' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_identity ON profiles;
CREATE TRIGGER protect_profile_identity
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_identity();
