import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Passkeys para el equipo de la agencia (administradores y trabajadores).
 *
 * Regla: cuando una persona del equipo tiene 2 o más passkeys, solo las sesiones que han entrado con passkey pueden
 * usar la administración. Una contraseña robada (o un enlace de «recuperar contraseña») ya no sirve de nada, entre
 * por donde entre. Los clientes no se ven afectados: siguen con su acceso normal.
 *
 * Si las tablas todavía no existen (migrations/add-passkeys.sql) todo falla «abierto»: no se exige nada.
 */

import { PASSKEYS_REQUIRED } from '@/lib/passkeyConstants';

export const CHALLENGE_TTL_MS = 5 * 60_000;

const missingTable = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message || ''));

export const toB64u = (b: Uint8Array) => Buffer.from(b).toString('base64url');
export const fromB64u = (s: string) => new Uint8Array(Buffer.from(s, 'base64url'));

/** El `session_id` que Supabase pone dentro del token de acceso. Solo se lee tras validar el token con getUser. */
export function sessionIdFromToken(authorization: string | null | undefined): string | null {
  const token = (authorization || '').replace(/^Bearer\s+/i, '');
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const claims = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    return typeof claims.session_id === 'string' && claims.session_id ? claims.session_id : null;
  } catch {
    return null;
  }
}

/* ── Passkeys de una persona ─────────────────────────────────────────────── */

export interface PasskeyRow {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string[];
  device_name: string;
  backed_up: boolean;
  created_at: string;
  last_used_at: string | null;
}

const countCache = new Map<string, { n: number; at: number }>();
const COUNT_TTL_MS = 20_000;

export function forgetPasskeyCount(userId: string) {
  countCache.delete(userId);
}

export async function countPasskeys(userId: string): Promise<number> {
  const hit = countCache.get(userId);
  if (hit && Date.now() - hit.at < COUNT_TTL_MS) return hit.n;
  const { count, error } = await supabaseAdmin.from('passkeys').select('id', { count: 'exact', head: true }).eq('user_id', userId);
  const n = error ? 0 : count || 0;
  countCache.set(userId, { n, at: Date.now() });
  return n;
}

/** ¿Esta persona del equipo está obligada a entrar con passkey? */
export async function mustUsePasskey(userId: string): Promise<boolean> {
  return (await countPasskeys(userId)) >= PASSKEYS_REQUIRED;
}

export async function listPasskeys(userId: string): Promise<{ rows: PasskeyRow[]; setup: boolean }> {
  const { data, error } = await supabaseAdmin.from('passkeys').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (missingTable(error)) return { rows: [], setup: true };
  return { rows: (data || []) as PasskeyRow[], setup: false };
}

export async function findPasskey(credentialId: string): Promise<PasskeyRow | null> {
  const { data } = await supabaseAdmin.from('passkeys').select('*').eq('credential_id', credentialId).maybeSingle();
  return (data as PasskeyRow | null) || null;
}

/* ── Desafíos de un solo uso ─────────────────────────────────────────────── */

export async function saveChallenge(challenge: string, purpose: 'register' | 'login', userId?: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from('passkey_challenges').insert({ challenge, purpose, user_id: userId || null }).select('id').single();
  if (error || !data) return null;
  return data.id as string;
}

/** Devuelve el desafío y lo borra (no se puede usar dos veces); null si no existe, ya se usó o caducó. */
export async function consumeChallenge(id: string, purpose: 'register' | 'login'): Promise<{ challenge: string; user_id: string | null } | null> {
  const { data } = await supabaseAdmin.from('passkey_challenges').select('challenge, user_id, created_at').eq('id', id).eq('purpose', purpose).maybeSingle();
  if (!data) return null;
  await supabaseAdmin.from('passkey_challenges').delete().eq('id', id);
  if (Date.now() - new Date(data.created_at).getTime() > CHALLENGE_TTL_MS) return null;
  return { challenge: data.challenge as string, user_id: (data.user_id as string | null) ?? null };
}

/* ── Sesiones con passkey ────────────────────────────────────────────────── */

export async function markPasskeySession(sessionId: string, userId: string): Promise<void> {
  await supabaseAdmin.from('passkey_sessions').upsert({ session_id: sessionId, user_id: userId }, { onConflict: 'session_id' });
}

export async function isPasskeySession(sessionId: string, userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('passkey_sessions').select('session_id').eq('session_id', sessionId).eq('user_id', userId).maybeSingle();
  return !!data;
}

/* ── Dominio de la web ───────────────────────────────────────────────────── */

/**
 * rpID y origen esperados. Con NEXT_PUBLIC_SITE_URL, el origen de la petición solo vale si es esa web (o un
 * subdominio suyo): un passkey de otra web no sirve aquí. Sin la variable (desarrollo) se usa el origen recibido.
 */
export function relyingParty(headers: Headers): { rpID: string; origin: string; rpName: string } | null {
  const origin = headers.get('origin');
  if (!origin) return null;
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return null;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  let rpID = host;
  if (site) {
    try {
      rpID = new URL(site).hostname;
    } catch {
      return null;
    }
    if (host !== rpID && !host.endsWith(`.${rpID}`)) return null;
  }
  return { rpID, origin, rpName: 'samgple' };
}
