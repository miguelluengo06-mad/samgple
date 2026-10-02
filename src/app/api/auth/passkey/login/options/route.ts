import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { checkRateLimit } from '@/lib/validation';
import { getClientIp, isBlocked, reportSuspicious } from '@/lib/security';
import { relyingParty, saveChallenge } from '@/lib/passkeys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/auth/passkey/login/options → desafío para entrar con passkey (público; el navegador ofrece la huella)
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (await isBlocked(ip)) return new NextResponse('Acceso denegado', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  if (!checkRateLimit(`passkey-options:${ip}`, 30, 60_000).allowed) {
    await reportSuspicious({ ip, kind: 'rate_limited', path: req.nextUrl?.pathname, userAgent: req.headers.get('user-agent') });
    return NextResponse.json({ error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
  }
  const rp = relyingParty(req.headers);
  if (!rp) return NextResponse.json({ error: 'Origen no permitido' }, { status: 400 });

  const options = await generateAuthenticationOptions({ rpID: rp.rpID, userVerification: 'required' });
  const challengeId = await saveChallenge(options.challenge, 'login');
  if (!challengeId) return NextResponse.json({ error: 'Los passkeys todavía no están activados.' }, { status: 503 });
  return NextResponse.json({ options, challengeId }, { headers: { 'Cache-Control': 'no-store' } });
}
