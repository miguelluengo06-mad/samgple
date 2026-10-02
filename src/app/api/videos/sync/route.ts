import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { agencyUser } from '@/lib/routeAuth';
import { grantCredits, type OrderLike } from '@/lib/videoServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/videos/sync → apunta en el saldo los vídeos de compras anteriores (cada compra cuenta una sola vez)
export async function POST(req: NextRequest) {
  const auth = await agencyUser(req, { write: true });
  if ('error' in auth) return auth.error;

  const { data: leads, error } = await supabaseAdmin.from('leads').select('email, answers').eq('owner_id', auth.ownerId).not('answers->order', 'is', null).limit(2000);
  if (error) return NextResponse.json({ error: 'No se pudieron leer las compras' }, { status: 500 });

  let customers = 0;
  let videos = 0;
  for (const l of leads || []) {
    const order = l.answers?.order;
    if (!l.email || !order?.session_id || order.livemode === false) continue;
    const { credits, isNew } = await grantCredits(order as OrderLike, l.email);
    if (isNew) {
      customers += 1;
      videos += credits;
    }
  }
  return NextResponse.json({ customers, videos });
}
