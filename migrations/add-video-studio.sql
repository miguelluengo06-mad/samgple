-- Estudio de vídeos: catálogo de avatares, saldo de vídeos de cada cliente y sus pedidos.
-- Idempotente: se puede ejecutar más de una vez. Pégalo en Supabase → SQL Editor → Run.

-- 1) Catálogo de avatares (las imágenes se pegan como enlaces)
CREATE TABLE IF NOT EXISTS avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  style TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT NOT NULL,
  preview_url TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_avatars_owner ON avatars(owner_id, active);

-- 2) Saldo de vídeos: un libro de movimientos por cliente (el saldo es la suma). Así todo queda auditado.
CREATE TABLE IF NOT EXISTS video_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('purchase', 'request', 'refund', 'manual')),
  ref TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_ledger_email ON video_credit_ledger(customer_email);
-- Una compra, un pedido y una devolución solo cuentan una vez aunque el webhook y /gracias lleguen a la vez
CREATE UNIQUE INDEX IF NOT EXISTS uq_video_ledger_ref
  ON video_credit_ledger(reason, ref) WHERE ref IS NOT NULL AND reason IN ('purchase', 'request', 'refund');

-- 3) Pedidos de vídeo
CREATE TABLE IF NOT EXISTS video_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  avatar_id UUID,
  avatar_name TEXT NOT NULL DEFAULT '',
  avatar_image_url TEXT,
  script_notes TEXT NOT NULL,
  est_seconds INTEGER NOT NULL DEFAULT 0,
  product TEXT,
  tone TEXT,
  cta TEXT,
  drive_url TEXT,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'scripting', 'script_review', 'production', 'delivered', 'cancelled')),
  script_text TEXT,
  client_feedback TEXT,
  delivery_url TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_requests_email ON video_requests(customer_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_requests_status ON video_requests(owner_id, status);

-- 4) Gastar un vídeo de forma atómica: dos pedidos a la vez no pueden pasarse del saldo
CREATE OR REPLACE FUNCTION public.consume_video_credit(p_email TEXT, p_ref TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE balance INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(lower(p_email)));
  SELECT COALESCE(SUM(delta), 0) INTO balance FROM video_credit_ledger WHERE customer_email = lower(p_email);
  IF balance < 1 THEN
    RETURN FALSE;
  END IF;
  INSERT INTO video_credit_ledger (customer_email, delta, reason, ref) VALUES (lower(p_email), -1, 'request', p_ref);
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_video_credit(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_video_credit(TEXT, TEXT) TO service_role;

-- 5) Solo el servidor accede (la web usa la clave de servicio)
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON avatars, video_credit_ledger, video_requests FROM anon, authenticated;
GRANT ALL ON avatars, video_credit_ledger, video_requests TO service_role;
