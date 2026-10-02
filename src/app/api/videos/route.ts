import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { agencyUser } from '@/lib/routeAuth';
import { missingTable } from '@/lib/videoServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/videos → todos los pedidos de vídeo y el saldo de cada cliente que ha pedido
export async function GET(req: NextRequest) {
  const auth = await agencyUser(req);
  if ('error' in auth) return auth.error;

  const [requests, ledger] = await Promise.all([
    supabaseAdmin.from('video_requests').select('*').eq('owner_id', auth.ownerId).order('created_at', { ascending: false }).limit(500),
    supabaseAdmin.from('video_credit_ledger').select('customer_email, delta'),
  ]);
  if (missingTable(requests.error) || missingTable(ledger.error)) return NextResponse.json({ setup: true });
  if (requests.error || ledger.error) return NextResponse.json({ error: 'No se pudieron cargar los pedidos' }, { status: 500 });

  const balances: Record<string, number> = {};
  for (const row of ledger.data || []) balances[row.customer_email] = (balances[row.customer_email] || 0) + row.delta;
  return NextResponse.json({ requests: requests.data || [], balances });
}
