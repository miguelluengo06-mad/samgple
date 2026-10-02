import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { agencyUser } from '@/lib/routeAuth';
import { consumeChallenge, countPasskeys, forgetPasskeyCount, markPasskeySession, explainOrigin, relyingParty, sessionIdFromToken, toB64u } from '@/lib/passkeys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/auth/passkey/register/verify { challengeId, response, name } → guarda el dispositivo
export async function POST(req: NextRequest) {
  const auth = await agencyUser(req);
  if ('error' in auth) return auth.error;
  const rp = relyingParty(req.headers);
  if (!rp) return NextResponse.json({ error: explainOrigin(req.headers) }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const challenge = typeof body.challengeId === 'string' ? await consumeChallenge(body.challengeId, 'register') : null;
  // El desafío tiene que ser de esta misma persona y no haberse usado ya
  if (!challenge || challenge.user_id !== auth.userId || !body.response) {
    return NextResponse.json({ error: 'El registro caducó. Inténtalo de nuevo.' }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo verificar el dispositivo.' }, { status: 400 });
  }
  if (!verification.verified || !verification.registrationInfo) return NextResponse.json({ error: 'No se pudo verificar el dispositivo.' }, { status: 400 });

  const { credential, credentialBackedUp } = verification.registrationInfo;
  const name = typeof body.name === 'string' ? body.name.replace(/\u0000/g, '').trim().slice(0, 60) : '';
  const { error } = await supabaseAdmin.from('passkeys').insert({
    user_id: auth.userId,
    credential_id: credential.id,
    public_key: toB64u(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports || body.response?.response?.transports || [],
    device_name: name || 'Mi dispositivo',
    backed_up: credentialBackedUp,
  });
  if (error) {
    const dup = error.code === '23505';
    return NextResponse.json({ error: dup ? 'Ese dispositivo ya estaba registrado.' : 'No se pudo guardar el dispositivo.' }, { status: dup ? 409 : 500 });
  }

  forgetPasskeyCount(auth.userId);
  // Quien acaba de registrar el dispositivo ha demostrado tenerlo (con huella o cara): esta sesión sigue valiendo
  const sid = sessionIdFromToken(req.headers.get('authorization'));
  if (sid) await markPasskeySession(sid, auth.userId);
  return NextResponse.json({ ok: true, count: await countPasskeys(auth.userId) });
}
