import { PACK_GROUPS, SINGLE_VIDEO, WELCOME_PACK } from '@/lib/packs';

/**
 * Estudio de vídeos: reglas comunes al panel del cliente, al de administración y a la API.
 *  - El saldo de vídeos sale del número de vídeos de cada pack comprado.
 *  - Un vídeo dura como máximo 45 s: se calcula por el número de palabras de las notas (voz natural ≈ 2,5 palabras/s).
 */

export const MAX_VIDEO_SECONDS = 45;
const WORDS_PER_SECOND = 2.5;

/** Segundos aproximados que ocupa un texto hablado. */
export function estimateSeconds(text: string): number {
  const words = (text.trim().match(/\S+/g) || []).length;
  return words === 0 ? 0 : Math.ceil(words / WORDS_PER_SECOND);
}

/** Palabras que caben en el límite (para el contador del formulario). */
export const MAX_WORDS = Math.floor(MAX_VIDEO_SECONDS * WORDS_PER_SECOND);

export type VideoStatus = 'requested' | 'scripting' | 'script_review' | 'production' | 'delivered' | 'cancelled';

export const STATUS_ORDER: VideoStatus[] = ['requested', 'scripting', 'script_review', 'production', 'delivered'];

export const STATUS_LABEL: Record<VideoStatus, string> = {
  requested: 'Solicitado',
  scripting: 'Preparando el guion',
  script_review: 'Guion para tu visto bueno',
  production: 'En producción',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

/** Texto corto del paso, para el cliente. */
export const STATUS_HINT: Record<VideoStatus, string> = {
  requested: 'Hemos recibido tu pedido. En breve empezamos con el guion.',
  scripting: 'Estamos escribiendo el guion con lo que nos has contado.',
  script_review: 'Revisa el guion: apruébalo o pídenos los cambios que quieras. No producimos nada sin tu visto bueno.',
  production: 'Guion aprobado. Estamos creando tu vídeo.',
  delivered: 'Tu vídeo está listo.',
  cancelled: 'Pedido cancelado. El vídeo ha vuelto a tu saldo.',
};

export const TONES = ['Cercano', 'Profesional', 'Divertido', 'Enérgico', 'Elegante', 'Directo'];

/** Vídeos que da cada pack. Cualquier pack desconocido da 0 (no se inventa saldo). */
export function creditsForPackId(packId: string): number {
  if (packId === WELCOME_PACK.id) return 2;
  if (packId === SINGLE_VIDEO.id) return numberIn(SINGLE_VIDEO.headline);
  for (const g of PACK_GROUPS) {
    const p = g.packs.find((x) => x.id === packId);
    if (p) return numberIn(p.headline);
  }
  return 0;
}

const numberIn = (headline: string) => Number((headline.match(/\d+/) || ['0'])[0]);

/** Vídeos de un pedido pagado: suma de los packs comprados por su cantidad. */
export function creditsForItems(items: { pack_id: string; qty: number }[]): number {
  return items.reduce((sum, it) => sum + creditsForPackId(it.pack_id) * Math.max(1, Math.floor(it.qty || 1)), 0);
}

/** Qué cambios de estado puede hacer el cliente por su cuenta. */
export function clientCanDo(status: VideoStatus, action: 'approve' | 'changes' | 'cancel'): VideoStatus | null {
  if (action === 'approve' && status === 'script_review') return 'production';
  if (action === 'changes' && status === 'script_review') return 'scripting';
  if (action === 'cancel' && status === 'requested') return 'cancelled';
  return null;
}

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim().slice(0, max) : '');

export interface VideoRequestInput {
  avatarId: string;
  scriptNotes: string;
  product: string;
  tone: string;
  cta: string;
  driveUrl: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Enlace http(s) o cadena vacía. Nunca javascript:, data:, etc. */
export function safeUrl(v: unknown): string {
  const s = clean(v, 500);
  if (!s) return '';
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : '';
  } catch {
    return '';
  }
}

/** Valida el pedido que llega del cliente. Devuelve el error en español o los datos limpios. */
export function validateVideoRequest(body: any): { ok: true; value: VideoRequestInput; seconds: number } | { ok: false; error: string } {
  const avatarId = clean(body?.avatarId, 40);
  if (!UUID_RE.test(avatarId)) return { ok: false, error: 'Elige un avatar.' };
  const scriptNotes = clean(body?.scriptNotes, 2000);
  if (scriptNotes.length < 10) return { ok: false, error: 'Cuéntanos qué quieres que diga el vídeo.' };
  const seconds = estimateSeconds(scriptNotes);
  if (seconds > MAX_VIDEO_SECONDS) return { ok: false, error: `El vídeo dura como máximo ${MAX_VIDEO_SECONDS} segundos (unas ${MAX_WORDS} palabras). Acorta las notas.` };
  const driveRaw = clean(body?.driveUrl, 500);
  const driveUrl = safeUrl(driveRaw);
  if (driveRaw && !driveUrl) return { ok: false, error: 'El enlace de Google Drive no es válido.' };
  return {
    ok: true,
    seconds,
    value: { avatarId, scriptNotes, product: clean(body?.product, 300), tone: clean(body?.tone, 40), cta: clean(body?.cta, 200), driveUrl },
  };
}

export interface AvatarInput {
  name: string;
  style: string;
  gender: string;
  tags: string[];
  image_url: string;
  preview_url: string | null;
  active: boolean;
}

/** Valida un avatar del catálogo (el panel de administración pega enlaces de imagen y, opcionalmente, de vídeo corto). */
export function sanitizeAvatar(input: any): AvatarInput | null {
  const name = clean(input?.name, 80);
  const imageUrl = safeUrl(input?.image_url);
  if (!name || !imageUrl) return null;
  const rawTags = Array.isArray(input?.tags) ? input.tags : typeof input?.tags === 'string' ? input.tags.split(',') : [];
  const tags: string[] = [];
  for (const t of rawTags) {
    const tag = clean(t, 24).toLowerCase().replace(/^#/, '');
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return {
    name,
    style: clean(input?.style, 40),
    gender: clean(input?.gender, 20),
    tags: tags.slice(0, 10),
    image_url: imageUrl,
    preview_url: safeUrl(input?.preview_url) || null,
    active: input?.active !== false,
  };
}

/** SQL de migrations/add-video-studio.sql: el panel lo enseña si las tablas todavía no existen. */
export const VIDEO_SETUP_SQL = `-- Estudio de vídeos: catálogo de avatares, saldo de vídeos de cada cliente y sus pedidos.
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
`;
