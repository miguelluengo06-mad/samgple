import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAgencyPrincipal } from '@/lib/agencyAccess';
import { canWrite, getEffectiveOwnerId } from '@/lib/teamUtils';
import { isValidUUID } from '@/lib/validation';
import { sanitizePrompt } from '@/lib/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authorize(req: NextRequest, id: string) {
  if (!isValidUUID(id)) return { error: NextResponse.json({ error: 'Invalid ID' }, { status: 400 }) };
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const forbidden = await requireAgencyPrincipal(supabaseAdmin, user.id, req);
  if (forbidden) return { error: forbidden };
  const { ownerId, role } = await getEffectiveOwnerId(supabaseAdmin, user.id);
  if (!canWrite(role)) return { error: NextResponse.json({ error: 'Sin permiso para editar' }, { status: 403 }) };
  return { ownerId };
}

// PATCH /api/prompts/[id]  { title, body, category, block_ids }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(req, id);
  if ('error' in auth) return auth.error;

  const { data: existing } = await supabaseAdmin.from('prompts').select('id, kind').eq('id', id).eq('owner_id', auth.ownerId).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const raw = await req.json().catch(() => ({}));

  // Solo marcar/desmarcar favorita
  if (Object.keys(raw).length === 1 && typeof raw.favorite === 'boolean') {
    const { data, error } = await supabaseAdmin.from('prompts').update({ favorite: raw.favorite }).eq('id', id).eq('owner_id', auth.ownerId).select('*').single();
    if (error) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
    return NextResponse.json({ prompt: data });
  }

  const input = sanitizePrompt({ ...raw, kind: existing.kind });
  if (!input) return NextResponse.json({ error: 'Falta el título o el texto' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('prompts')
    .update({ title: input.title, body: input.body, category: input.category, block_ids: input.block_ids, tags: input.tags, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', auth.ownerId)
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  return NextResponse.json({ prompt: data });
}

// DELETE /api/prompts/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(req, id);
  if ('error' in auth) return auth.error;
  const { error } = await supabaseAdmin.from('prompts').delete().eq('id', id).eq('owner_id', auth.ownerId);
  if (error) return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
