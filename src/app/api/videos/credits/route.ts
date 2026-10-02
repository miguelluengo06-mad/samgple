import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { agencyUser } from '@/lib/routeAuth';
import { getBalance } from '@/lib/videoServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/videos/credits { email, delta, note? } → regalar (o quitar) vídeos a mano
export async function POST(req: NextRequest) {
  const auth = await agencyUser(req, { write: true });
  if ('error' in auth) return auth.error;

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const delta = Math.trunc(Number(body.delta));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Email no válido' }, { status: 400 });
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100) return NextResponse.json({ error: 'Pon un número entre -100 y 100 (distinto de 0).' }, { status: 400 });

  const balance = await getBalance(email);
  if (balance + delta < 0) return NextResponse.json({ error: `Solo tiene ${balance} disponibles: no se pueden quitar ${Math.abs(delta)}.` }, { status: 400 });

  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : '';
  const { error } = await supabaseAdmin.from('video_credit_ledger').insert({ customer_email: email, delta, reason: 'manual', note: note || null });
  if (error) return NextResponse.json({ error: 'No se pudo ajustar el saldo' }, { status: 500 });
  return NextResponse.json({ balance: balance + delta });
}
