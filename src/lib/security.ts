/**
 * Seguridad: detección de comportamiento sospechoso, registro de IPs y bloqueo.
 *
 * Funciona igual en el servidor (rutas) y en el Edge (middleware): solo usa fetch contra la API REST de Supabase
 * con la clave de servicio, así que nada de esto es accesible desde el navegador. Si las tablas todavía no existen
 * (migrations/add-security.sql) o Supabase no responde, falla "abierto": nunca tumba la web por un fallo propio.
 */

export type SecurityKind =
  | 'login_failed'
  | 'forbidden'
  | 'rate_limited'
  | 'bot_honeypot'
  | 'attack_path'
  | 'attack_payload'
  | 'burst'
  | 'manual';

export const KIND_LABEL: Record<SecurityKind, string> = {
  login_failed: 'Contraseña incorrecta',
  forbidden: 'Intento de acceso a zona restringida',
  rate_limited: 'Demasiadas peticiones',
  bot_honeypot: 'Bot en formulario',
  attack_path: 'Ruta de ataque',
  attack_payload: 'Datos de ataque',
  burst: 'Ráfaga de peticiones',
  manual: 'Bloqueo manual',
};

const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Cuántos eventos del mismo tipo (en la ventana) bastan para bloquear, y por cuánto tiempo. */
export const RULES: Record<Exclude<SecurityKind, 'manual'>, { max: number; windowMs: number; blockMs: number }> = {
  login_failed: { max: 6, windowMs: 15 * 60_000, blockMs: DAY },
  forbidden: { max: 3, windowMs: 10 * 60_000, blockMs: 7 * DAY },
  rate_limited: { max: 10, windowMs: 10 * 60_000, blockMs: HOUR },
  bot_honeypot: { max: 3, windowMs: HOUR, blockMs: 7 * DAY },
  attack_path: { max: 1, windowMs: HOUR, blockMs: 30 * DAY },
  attack_payload: { max: 1, windowMs: HOUR, blockMs: 30 * DAY },
  burst: { max: 1, windowMs: HOUR, blockMs: HOUR },
};

/* ── Detección ─────────────────────────────────────────────────────────────── */

// Rutas que ningún visitante legítimo pide a esta web: solo las prueban los escáneres automáticos.
const ATTACK_PATHS = [
  /^\/wp-(admin|login|content|includes|json)/i,
  /^\/xmlrpc\.php/i,
  /\.php\d?$/i,
  /^\/\.(env|git|svn|hg|aws|ssh|docker|npmrc|htaccess|htpasswd|ds_store)/i,
  /\/\.(env|git)(\/|$)/i,
  /^\/(phpmyadmin|pma|myadmin|adminer|mysql|cgi-bin|vendor\/phpunit|actuator|server-status|server-info|solr|jenkins|console|manager\/html|boaform|hnap1|sdk|owa|ecp|autodiscover)/i,
  /^\/(backup|dump|database|db|config|credentials|secrets?)\.(sql|zip|tar|gz|bak|json|ya?ml|env|old|txt)$/i,
  /^\/(shell|cmd|eval|exec|webshell|c99|r57)(\.|\/|$)/i,
];

// Firmas claras de inyección o de salto de directorios en la URL ya decodificada.
const ATTACK_PAYLOADS = [
  /\.\.(\/|\\)/,
  /<\s*script/i,
  /javascript\s*:/i,
  /union(\s|\+|\/\*.*?\*\/)+select/i,
  /(\b|'|")or(\s|\+)+['"]?1['"]?\s*=\s*['"]?1/i,
  /\$\{\s*jndi\s*:/i,
  /(;|\|\||&&)\s*(cat|wget|curl|bash|sh|nc)\s/i,
  /\/etc\/(passwd|shadow)/i,
  /(sleep|benchmark|pg_sleep)\s*\(\s*\d/i,
  /%00/,
];

export function detectAttack(pathname: string, search: string): { kind: 'attack_path' | 'attack_payload'; detail: string } | null {
  let decoded = pathname + search;
  try {
    decoded = decodeURIComponent(pathname + search);
  } catch {
    // %-secuencias rotas: ya es sospechoso por sí mismo
    return { kind: 'attack_payload', detail: 'URL con codificación inválida' };
  }
  if (ATTACK_PATHS.some((r) => r.test(pathname))) return { kind: 'attack_path', detail: pathname.slice(0, 200) };
  if (ATTACK_PAYLOADS.some((r) => r.test(decoded))) return { kind: 'attack_payload', detail: decoded.slice(0, 200) };
  return null;
}

/* ── IP ────────────────────────────────────────────────────────────────────── */

const IPV4 = /^(\d{1,3})(\.\d{1,3}){3}$/;
const IPV6 = /^[0-9a-f:]{2,45}$/i;

export function isValidIp(ip: string): boolean {
  if (IPV4.test(ip)) return ip.split('.').every((n) => Number(n) <= 255);
  return ip.includes(':') && IPV6.test(ip);
}

/** IP del visitante. En Vercel `x-real-ip` / `x-forwarded-for` los pone la plataforma, no el cliente. */
export function getClientIp(headers: Headers): string {
  const real = headers.get('x-real-ip')?.trim();
  if (real && isValidIp(real)) return real;
  const first = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (first && isValidIp(first)) return first;
  return 'unknown';
}

/** IPs que nunca se bloquean (la tuya): SECURITY_ALLOWLIST_IPS="1.2.3.4,5.6.7.8" */
export function isAllowlisted(ip: string): boolean {
  const list = (process.env.SECURITY_ALLOWLIST_IPS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return list.includes(ip);
}

/* ── Almacén (REST de Supabase) ────────────────────────────────────────────── */

function conn() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } };
}

async function rest(path: string, init: RequestInit = {}): Promise<Response | null> {
  const c = conn();
  if (!c) return null;
  try {
    return await fetch(`${c.url}/rest/v1/${path}`, { ...init, headers: { ...c.headers, ...(init.headers || {}) }, signal: AbortSignal.timeout(3000), cache: 'no-store' });
  } catch {
    return null;
  }
}

const blockCache = new Map<string, { blocked: boolean; at: number }>();
const CACHE_MS = 30_000;

export function forgetBlockCache(ip?: string) {
  if (ip) blockCache.delete(ip);
  else blockCache.clear();
}

export async function isBlocked(ip: string): Promise<boolean> {
  if (ip === 'unknown' || isAllowlisted(ip)) return false;
  const hit = blockCache.get(ip);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.blocked;
  const res = await rest(`blocked_ips?ip=eq.${encodeURIComponent(ip)}&select=expires_at&limit=1`);
  if (!res || !res.ok) return false;
  const rows = (await res.json().catch(() => [])) as { expires_at: string | null }[];
  let blocked = rows.length > 0 && (!rows[0].expires_at || new Date(rows[0].expires_at).getTime() > Date.now());
  // Una IP de confianza (la tuya) nunca se bloquea, aunque tuviera un bloqueo antiguo
  if (blocked && (await isTrusted(ip))) blocked = false;
  blockCache.set(ip, { blocked, at: Date.now() });
  if (blockCache.size > 5000) blockCache.clear();
  return blocked;
}

export async function recordEvent(e: { ip: string; kind: SecurityKind; path?: string; userAgent?: string | null; detail?: string }): Promise<void> {
  await rest('security_events', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ip: e.ip, kind: e.kind, path: e.path?.slice(0, 300), user_agent: e.userAgent?.slice(0, 300) ?? null, detail: e.detail?.slice(0, 300) }),
  });
}

export async function countRecent(ip: string, kind: SecurityKind, windowMs: number, cap: number): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const res = await rest(`security_events?ip=eq.${encodeURIComponent(ip)}&kind=eq.${kind}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=${cap}`);
  if (!res || !res.ok) return 0;
  return ((await res.json().catch(() => [])) as unknown[]).length;
}

/** Cuenta fallos de acceso a un mismo email desde cualquier IP (contra ataques repartidos). */
export async function countRecentByDetail(kind: SecurityKind, detail: string, windowMs: number, cap: number): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const res = await rest(`security_events?kind=eq.${kind}&detail=eq.${encodeURIComponent(detail)}&created_at=gte.${encodeURIComponent(since)}&select=id&limit=${cap}`);
  if (!res || !res.ok) return 0;
  return ((await res.json().catch(() => [])) as unknown[]).length;
}

const trustCache = new Map<string, { trusted: boolean; at: number }>();

export async function isTrusted(ip: string): Promise<boolean> {
  if (ip === 'unknown') return false;
  if (isAllowlisted(ip)) return true;
  const hit = trustCache.get(ip);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.trusted;
  const res = await rest(`trusted_ips?ip=eq.${encodeURIComponent(ip)}&select=ip&limit=1`);
  if (!res || !res.ok) return false;
  const trusted = ((await res.json().catch(() => [])) as unknown[]).length > 0;
  trustCache.set(ip, { trusted, at: Date.now() });
  if (trustCache.size > 2000) trustCache.clear();
  return trusted;
}

/**
 * Registra una IP como de confianza (o renueva «visto por última vez»). Devuelve `isNew` para poder avisar
 * cuando entra desde un sitio que no se había visto antes. Quita cualquier bloqueo que tuviera.
 */
export async function trustIp(ip: string, label = '', auto = true): Promise<{ ok: boolean; isNew: boolean }> {
  if (ip === 'unknown' || !isValidIp(ip)) return { ok: false, isNew: false };
  const existing = await rest(`trusted_ips?ip=eq.${encodeURIComponent(ip)}&select=ip&limit=1`);
  const isNew = !!existing && existing.ok && ((await existing.json().catch(() => [])) as unknown[]).length === 0;
  const res = await rest('trusted_ips', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(isNew ? { ip, label: label.slice(0, 80), auto, last_seen: new Date().toISOString() } : { ip, last_seen: new Date().toISOString() }),
  });
  trustCache.set(ip, { trusted: true, at: Date.now() });
  if (res && res.ok) await unblockIp(ip);
  return { ok: !!res && res.ok, isNew };
}

export async function untrustIp(ip: string): Promise<boolean> {
  const res = await rest(`trusted_ips?ip=eq.${encodeURIComponent(ip)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  trustCache.delete(ip);
  return !!res && res.ok;
}

/** Aviso por Telegram: alguien ha entrado al panel desde una IP que no se había visto. */
export async function alertNewAdminIp(ip: string, email: string, userAgent: string | null) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const text = `🔐 <b>Nuevo acceso al panel</b>\n🌐 <code>${esc(ip)}</code>\n👤 ${esc(email)}${userAgent ? `\n💻 ${esc(userAgent.slice(0, 100))}` : ''}\n\nSi no has sido tú, bloquéala en Seguridad y cambia la contraseña.`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* sin aviso */
  }
}

export async function blockIp(ip: string, reason: string, ttlMs: number | null, manual = false): Promise<boolean> {
  if (ip === 'unknown' || isAllowlisted(ip) || (await isTrusted(ip))) return false;
  const res = await rest('blocked_ips', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ ip, reason: reason.slice(0, 200), blocked_at: new Date().toISOString(), expires_at: ttlMs ? new Date(Date.now() + ttlMs).toISOString() : null, manual }),
  });
  blockCache.set(ip, { blocked: true, at: Date.now() });
  return !!res && res.ok;
}

export async function unblockIp(ip: string): Promise<boolean> {
  const res = await rest(`blocked_ips?ip=eq.${encodeURIComponent(ip)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  forgetBlockCache(ip);
  return !!res && res.ok;
}

/* ── Informar de algo raro ─────────────────────────────────────────────────── */

export interface SuspiciousInput {
  ip: string;
  kind: Exclude<SecurityKind, 'manual'>;
  path?: string;
  userAgent?: string | null;
  detail?: string;
}

/**
 * Registra el evento y, si esa IP supera el umbral de su tipo, la bloquea y avisa por Telegram.
 * Devuelve true si la IP ha quedado bloqueada. Nunca lanza.
 */
export async function reportSuspicious(input: SuspiciousInput): Promise<boolean> {
  try {
    if (input.ip === 'unknown' || isAllowlisted(input.ip) || (await isTrusted(input.ip))) return false;
    await recordEvent(input);
    const rule = RULES[input.kind];
    const n = rule.max <= 1 ? 1 : await countRecent(input.ip, input.kind, rule.windowMs, rule.max + 1);
    if (n < rule.max) return false;
    const ok = await blockIp(input.ip, `${KIND_LABEL[input.kind]}${input.detail ? ` · ${input.detail}` : ''}`, rule.blockMs);
    if (ok) await alertBlocked(input.ip, input.kind, input.detail, rule.blockMs);
    return ok;
  } catch {
    return false;
  }
}

async function alertBlocked(ip: string, kind: SecurityKind, detail: string | undefined, ttlMs: number) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const days = ttlMs >= DAY ? `${Math.round(ttlMs / DAY)} d` : `${Math.round(ttlMs / HOUR)} h`;
  const text = `🚨 <b>IP bloqueada</b>\n🌐 <code>${esc(ip)}</code>\n⚠️ ${esc(KIND_LABEL[kind])}${detail ? `\n📝 ${esc(detail.slice(0, 120))}` : ''}\n⏱ Bloqueo: ${days}`;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* sin aviso, pero el bloqueo ya está hecho */
  }
}

/** SQL de migrations/add-security.sql: el panel lo enseña si las tablas todavía no existen. */
export const SECURITY_SETUP_SQL = `-- Seguridad del panel: registro de eventos sospechosos, IPs bloqueadas y cierre de permisos que ya no hacen falta.
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
`;
