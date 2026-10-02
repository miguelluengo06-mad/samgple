import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAgencyPrincipal } from '@/lib/agencyAccess';
import { alertNewAdminIp, countRecentByDetail, getClientIp, isBlocked, reportSuspicious, trustIp } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GENERIC = 'Email o contraseña incorrectos';

/**
 * POST /api/auth/login  { email, password } → { access_token, refresh_token }
 *
 * El acceso pasa por aquí (no directo a Supabase desde el navegador) para poder contar los fallos:
 *  - 6 contraseñas mal desde la misma IP en 15 min → la IP se bloquea 24 h y te avisa Telegram.
 *  - 10 fallos al mismo email en 15 min, vengan de donde vengan → ese email se pausa 15 min.
 * La respuesta de error es siempre la misma, exista o no la cuenta.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const path = req.nextUrl.pathname;
  const userAgent = req.headers.get('user-agent');

  if (await isBlocked(ip)) return new NextResponse('Acceso denegado', { status: 403, headers: { 'Cache-Control': 'no-store' } });

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password || email.length > 254 || password.length > 200 || !email.includes('@')) {
    return NextResponse.json({ error: GENERIC }, { status: 400 });
  }

  // Ataque repartido contra una misma cuenta (muchas IPs): pausa esa cuenta, no a la gente
  if ((await countRecentByDetail('login_failed', email, 15 * 60_000, 11)) >= 10) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera 15 minutos o restablece la contraseña.' }, { status: 429 });
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ error: 'Acceso no disponible' }, { status: 503 });

  const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    const blocked = await reportSuspicious({ ip, kind: 'login_failed', path, userAgent, detail: email });
    if (blocked) return new NextResponse('Acceso denegado', { status: 403, headers: { 'Cache-Control': 'no-store' } });
    // Supabase avisa de sus propios límites: se respeta el 429
    if (error && /rate limit|too many/i.test(error.message)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera un momento y vuelve a probar.' }, { status: 429 });
    }
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }

  // Entra alguien del equipo de la agencia: su IP queda registrada como de confianza (nunca se bloquea) y,
  // si es una IP nueva, te llega un aviso por Telegram por si no has sido tú.
  try {
    if (await isAgencyPrincipal(supabaseAdmin, data.user.id)) {
      const { isNew } = await trustIp(ip, `Acceso de ${email}`, true);
      if (isNew) await alertNewAdminIp(ip, email, userAgent);
    }
  } catch {
    /* el acceso sigue adelante aunque no se pueda registrar la IP */
  }

  return NextResponse.json(
    { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
