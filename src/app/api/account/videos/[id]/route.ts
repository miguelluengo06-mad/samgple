import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { confirmedCustomer } from '@/lib/routeAuth';
import { isValidUUID } from '@/lib/validation';
import { sendTelegram } from '@/lib/telegram';
import { clientCanDo, type VideoStatus } from '@/lib/videos';
import { getBalance } from '@/lib/videoServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PATCH /api/account/videos/[id]  { action: 'approve' | 'changes' | 'cancel', feedback? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Pedido no válido' }, { status: 400 });
  const customer = await confirmedCustomer(req);
  if (!customer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  if (action !== 'approve' && action !== 'changes' && action !== 'cancel') return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  // Solo sus propios pedidos
  const { data: current } = await supabaseAdmin
    .from('video_requests')
    .select('id, status, customer_name, avatar_name')
    .eq('id', id)
    .eq('customer_email', customer.email)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });

  const next: VideoStatus | null = clientCanDo(current.status as VideoStatus, action);
  if (!next) return NextResponse.json({ error: 'Ese pedido ya no admite este cambio.' }, { status: 409 });

  const feedback = typeof body?.feedback === 'string' ? body.feedback.replace(/\u0000/g, '').trim().slice(0, 2000) : '';
  if (action === 'changes' && feedback.length < 3) return NextResponse.json({ error: 'Cuéntanos qué quieres cambiar del guion.' }, { status: 400 });

  const update: Record<string, unknown> = { status: next, updated_at: new Date().toISOString() };
  if (action === 'changes') update.client_feedback = feedback;
  if (action === 'approve') update.client_feedback = null;

  // La condición de estado evita que dos clics seguidos apliquen el cambio dos veces
  const { data: updated, error } = await supabaseAdmin
    .from('video_requests')
    .update(update)
    .eq('id', id)
    .eq('customer_email', customer.email)
    .eq('status', current.status)
    .select('id, status, client_feedback')
    .maybeSingle();
  if (error || !updated) return NextResponse.json({ error: 'No se pudo completar. Inténtalo de nuevo.' }, { status: 409 });

  if (action === 'cancel') {
    // Si se cancela antes de empezar, el vídeo vuelve al saldo (una sola vez por pedido)
    await supabaseAdmin.from('video_credit_ledger').insert({ customer_email: customer.email, delta: 1, reason: 'refund', ref: id, note: 'Pedido cancelado por el cliente' });
  }

  const esc = (t: string) => t.replace(/[<>&]/g, '');
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  const who = esc(current.customer_name || customer.email);
  const text =
    action === 'approve' ? `✅ <b>${who}</b> ha aprobado el guion (${esc(current.avatar_name)}). Listo para producir.`
    : action === 'changes' ? `✏️ <b>${who}</b> pide cambios en el guion:\n${esc(feedback.slice(0, 300))}`
    : `🚫 <b>${who}</b> ha cancelado un pedido. El vídeo vuelve a su saldo.`;
  await sendTelegram(text, { label: 'Abrir pedidos', url: `${siteBase}/portal/videos` });

  return NextResponse.json({ request: updated, balance: await getBalance(customer.email) });
}

