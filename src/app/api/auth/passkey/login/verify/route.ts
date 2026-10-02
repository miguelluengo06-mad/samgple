import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAgencyPrincipal } from '@/lib/agencyAccess';
import { alertNewAdminIp, getClientIp, isBlocked, reportSuspicious, trustIp } from '@/lib/security';
import { checkRateLimit } from '@/lib/validation';
import { consumeChallenge, findPasskey, fromB64u, markPasskeySession, relyingParty, sessionIdFromToken } from '@/lib/passkeys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FAIL = 'No se pudo entrar con ese passkey.';

// POST /api/auth/passkey/login/verify { challengeId, response } → { access_token, refresh_token }
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const userAgent = req.headers.get('user-agent');
  const path = req.nextUrl?.pathname;
  if (await isBlocked(ip)) return new NextResponse('Acceso denegado', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  if (!checkRateLimit(`passkey-verify:${ip}`, 20, 60_000).allowed) return NextResponse.json({ error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
  const rp = relyingParty(req.headers);
  if (!rp) return NextResponse.json({ error: 'Origen no permitido' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const fail = async (status = 401) => {
    const blocked = await reportSuspicious({ ip, kind: 'login_failed', path, userAgent, detail: 'passkey' });
    return blocked ? new NextResponse('Acceso denegado', { status: 403, headers: { 'Cache-Control': 'no-store' } }) : NextResponse.json({ error: FAIL }, { status });
  };

  const challenge = typeof body.challengeId === 'string' ? await consumeChallenge(body.challengeId, 'login') : null;
  const credentialId = typeof body.response?.id === 'string' ? body.response.id : '';
  if (!challenge || !credentialId) return fail();

  const row = await findPasskey(credentialId);
  if (!row) return fail();

  let verified = false;
  let newCounter = row.counter;
  try {
    const v = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      credential: { id: row.credential_id, publicKey: fromB64u(row.public_key), counter: Number(row.counter), transports: row.transports as never },
      requireUserVerification: true,
    });
    verified = v.verified;
    newCounter = v.authenticationInfo.newCounter;
  } catch {
    verified = false;
  }
  if (!verified) return fail();

  // Solo el equipo entra con passkey: si ya no es de la agencia, no entra
  if (!(await isAgencyPrincipal(supabaseAdmin, row.user_id))) return NextResponse.json({ error: FAIL }, { status: 403 });

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
  const email = userData?.user?.email;
  if (!email) return fail();

  // Sesión de Supabase: enlace de un solo uso generado y canjeado aquí mismo, en el servidor
  const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email });
  const hashed = (link as { properties?: { hashed_token?: string } } | null)?.properties?.hashed_token;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (linkError || !hashed || !url || !anon) return NextResponse.json({ error: 'No se pudo abrir la sesión.' }, { status: 503 });

  const anonClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: sess, error: otpError } = await anonClient.auth.verifyOtp({ type: 'magiclink', token_hash: hashed });
  if (otpError || !sess.session) return NextResponse.json({ error: 'No se pudo abrir la sesión.' }, { status: 503 });

  const sid = sessionIdFromToken(`Bearer ${sess.session.access_token}`);
  if (sid) await markPasskeySession(sid, row.user_id);
  await supabaseAdmin.from('passkeys').update({ counter: newCounter, last_used_at: new Date().toISOString() }).eq('id', row.id);

  try {
    const { isNew } = await trustIp(ip, `Passkey de ${email}`, true);
    if (isNew) await alertNewAdminIp(ip, email, userAgent);
  } catch {
    /* el acceso sigue adelante */
  }

  return NextResponse.json({ access_token: sess.session.access_token, refresh_token: sess.session.refresh_token }, { headers: { 'Cache-Control': 'no-store' } });
}
