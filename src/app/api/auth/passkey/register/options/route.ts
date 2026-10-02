import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { agencyUser } from '@/lib/routeAuth';
import { listPasskeys, relyingParty, saveChallenge } from '@/lib/passkeys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/auth/passkey/register/options → opciones para registrar un dispositivo (solo equipo con sesión)
export async function POST(req: NextRequest) {
  const auth = await agencyUser(req);
  if ('error' in auth) return auth.error;
  const rp = relyingParty(req.headers);
  if (!rp) return NextResponse.json({ error: 'Origen no permitido' }, { status: 400 });

  const { rows, setup } = await listPasskeys(auth.userId);
  if (setup) return NextResponse.json({ error: 'Falta crear las tablas de passkeys', setup: true }, { status: 409 });

  const { data } = await supabaseAdmin.auth.admin.getUserById(auth.userId);
  const email = data?.user?.email || auth.userId;

  const options = await generateRegistrationOptions({
    rpName: rp.rpName,
    rpID: rp.rpID,
    userName: email,
    userDisplayName: String(data?.user?.user_metadata?.full_name || email),
    userID: new TextEncoder().encode(auth.userId),
    attestationType: 'none',
    excludeCredentials: rows.map((r) => ({ id: r.credential_id, transports: r.transports })),
    // Clave «descubrible» (para entrar sin escribir el email) y siempre con huella, cara o PIN del dispositivo
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
  });
  const challengeId = await saveChallenge(options.challenge, 'register', auth.userId);
  if (!challengeId) return NextResponse.json({ error: 'No se pudo preparar el registro' }, { status: 500 });
  return NextResponse.json({ options, challengeId });
}
