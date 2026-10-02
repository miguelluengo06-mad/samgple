-- samgple — esquema base (solo lo que usa la web y el panel)
--
-- Orden para una instalación nueva en Supabase → SQL Editor:
--   1. este archivo
--   2. add-prompts.sql   (biblioteca de prompts)
--   3. add-security.sql  (registro de eventos, IPs bloqueadas e IPs de confianza)
-- Si vienes de una instalación antigua, ejecuta además drop-legacy-tables.sql (borra tablas que ya no se usan).
-- Idempotente: se puede ejecutar más de una vez.

-- ============================================
-- 1. profiles — un perfil por usuario de Supabase Auth
--    (el más antiguo es la agencia; ver src/lib/agencyAccess.ts)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  -- Marca de la agencia
  business_name TEXT,
  agency_logo_url TEXT,
  -- Cobros con Stripe (clave cifrada)
  agency_stripe_key_encrypted TEXT,
  agency_stripe_key_set BOOLEAN DEFAULT false,
  -- Correo para los avisos (SMTP cifrado)
  agency_smtp_host TEXT,
  agency_smtp_port INTEGER DEFAULT 587,
  agency_smtp_user TEXT,
  agency_smtp_pass_encrypted TEXT,
  agency_smtp_sender TEXT,
  agency_smtp_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Crea el perfil al registrarse un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 2. team_members — personas del equipo de la agencia
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'removed')),
  token TEXT UNIQUE,
  accepted_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_owner_id ON team_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member_id ON team_members(member_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_token ON team_members(token);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

-- ============================================
-- 3. leads — solicitudes, llamadas agendadas y carritos
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'won', 'lost')),
  source TEXT NOT NULL DEFAULT 'website',
  kind TEXT NOT NULL DEFAULT 'proposal' CHECK (kind IN ('proposal', 'call')),
  call_at TIMESTAMPTZ,
  answers JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_call_at ON leads(call_at) WHERE call_at IS NOT NULL;

-- Una llamada activa por franja horaria (cancelar = status 'lost' libera la franja)
CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_call_slot
  ON leads(owner_id, call_at)
  WHERE kind = 'call' AND call_at IS NOT NULL AND status <> 'lost';

-- ============================================
-- Seguridad a nivel de fila (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'Owner can manage team') THEN
    CREATE POLICY "Owner can manage team" ON team_members FOR ALL USING (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'Member can view own invite') THEN
    CREATE POLICY "Member can view own invite" ON team_members FOR SELECT USING (member_id = auth.uid() OR email = auth.email());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Owners manage their own leads') THEN
    CREATE POLICY "Owners manage their own leads" ON leads FOR ALL TO authenticated
      USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Service role full access profiles') THEN
    CREATE POLICY "Service role full access profiles" ON profiles FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'team_members' AND policyname = 'Service role full access team_members') THEN
    CREATE POLICY "Service role full access team_members" ON team_members FOR ALL TO service_role USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Service role full access leads') THEN
    CREATE POLICY "Service role full access leads" ON leads FOR ALL TO service_role USING (true);
  END IF;
END $$;

GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON team_members TO authenticated;
GRANT SELECT, UPDATE, DELETE ON leads TO authenticated;
GRANT ALL ON profiles, team_members, leads TO service_role;
