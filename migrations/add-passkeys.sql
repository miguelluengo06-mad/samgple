-- Passkeys (huella / cara) para administradores y trabajadores.
-- Idempotente: se puede ejecutar más de una vez. Pégalo en Supabase → SQL Editor → Run.

-- 1) Las claves públicas de los dispositivos de cada persona del equipo (la clave secreta nunca sale del móvil)
CREATE TABLE IF NOT EXISTS passkeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT '{}',
  device_name TEXT NOT NULL DEFAULT '',
  backed_up BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkeys(user_id);

-- 2) Desafíos de un solo uso (caducan a los 5 minutos)
CREATE TABLE IF NOT EXISTS passkey_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('register', 'login')),
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) Sesiones que han entrado con passkey: el servidor solo deja usar la administración a estas
CREATE TABLE IF NOT EXISTS passkey_sessions (
  session_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_passkey_sessions_user ON passkey_sessions(user_id);

ALTER TABLE passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE passkey_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE passkey_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON passkeys, passkey_challenges, passkey_sessions FROM anon, authenticated;
GRANT ALL ON passkeys, passkey_challenges, passkey_sessions TO service_role;

-- 4) Cerrar el acceso directo desde el navegador a datos que solo debe tocar el servidor.
--    Sin esto, una contraseña robada podría leer o cambiar solicitudes y equipo llamando a la API pública de
--    Supabase, saltándose la exigencia de passkey.
REVOKE ALL ON leads FROM anon, authenticated;
REVOKE ALL ON team_members FROM anon, authenticated;

-- 5) Perfiles: desde el navegador solo se puede cambiar la marca y el nombre; la clave de Stripe, el correo
--    de avisos y demás ajustes solo los cambia el servidor.
REVOKE UPDATE ON profiles FROM authenticated;
GRANT UPDATE (business_name, agency_logo_url, full_name, avatar_url, updated_at) ON profiles TO authenticated;
