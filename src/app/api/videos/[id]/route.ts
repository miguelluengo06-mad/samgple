import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { agencyUser } from '@/lib/routeAuth';
import { isValidUUID } from '@/lib/validation';
import { STATUS_ORDER, safeUrl, type VideoStatus } from '@/lib/videos';
import { announceVideoUpdate } from '@/lib/videoServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALL: VideoStatus[] = [...STATUS_ORDER, 'cancelled'];
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\u0000/g, '').trim().slice(0, max) : '');

// PATCH /api/videos/[id]  { status?, script_text?, delivery_url?, admin_notes? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  const auth = await agencyUser(req, { write: true });
  if ('error' in auth) return auth.error;

  const { data: current } = await supabaseAdmin.from('video_requests').select('*').eq('id', id).eq('owner_id', auth.ownerId).maybeSingle();
  if (!current) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.script_text !== undefined) update.script_text = clean(body.script_text, 6000) || null;
  if (body.admin_notes !== undefined) update.admin_notes = clean(body.admin_notes, 4000) || null;
  if (body.delivery_url !== undefined) {
    const url = safeUrl(body.delivery_url);
    if (clean(body.delivery_url, 500) && !url) return NextResponse.json({ error: 'El enlace del vídeo no es válido.' }, { status: 400 });
    update.delivery_url = url || null;
  }

  let next: VideoStatus | null = null;
  if (body.status !== undefined) {
    if (!ALL.includes(body.status)) return NextResponse.json({ error: 'Estado no válido' }, { status: 400 });
    next = body.status as VideoStatus;
    const script = (update.script_text as string | null | undefined) ?? current.script_text;
    const delivery = (update.delivery_url as string | null | undefined) ?? current.delivery_url;
    if (next === 'script_review' && !script) return NextResponse.json({ error: 'Escribe el guion antes de enviarlo a aprobar.' }, { status: 400 });
    if (next === 'delivered' && !delivery) return NextResponse.json({ error: 'Pega el enlace del vídeo terminado antes de marcarlo entregado.' }, { status: 400 });
    update.status = next;
  }

  const { data: updated, error } = await supabaseAdmin.from('video_requests').update(update).eq('id', id).eq('owner_id', auth.ownerId).select('*').single();
  if (error || !updated) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });

  // Anular un pedido devuelve el vídeo al saldo (solo una vez, aunque se repita)
  if (next === 'cancelled' && current.status !== 'cancelled') {
    await supabaseAdmin.from('video_credit_ledger').insert({ customer_email: current.customer_email, delta: 1, reason: 'refund', ref: id, note: 'Pedido anulado por la agencia' });
  }

  if (next && next !== current.status) {
    const who = current.customer_email;
    if (next === 'script_review') await announceVideoUpdate(auth.ownerId, who, 'Tu guion está listo para revisar', 'Entra en tu panel, léelo y apruébalo o pídenos los cambios que quieras. No producimos nada sin tu visto bueno.', { mail: true });
    else if (next === 'production') await announceVideoUpdate(auth.ownerId, who, 'Tu vídeo está en producción', 'Con el guion aprobado hemos empezado a crear tu vídeo. Te avisamos en cuanto esté listo.');
    else if (next === 'delivered') await announceVideoUpdate(auth.ownerId, who, 'Tu vídeo está listo', 'Ya puedes verlo y descargarlo desde tu panel.', { mail: true });
    else if (next === 'scripting') await announceVideoUpdate(auth.ownerId, who, 'Estamos preparando tu guion', 'Hemos empezado a escribir el guion con lo que nos contaste.');
    else if (next === 'cancelled') await announceVideoUpdate(auth.ownerId, who, 'Pedido cancelado', 'Hemos cancelado tu pedido y el vídeo ha vuelto a tu saldo.');
  }

  return NextResponse.json({ request: updated });
}
