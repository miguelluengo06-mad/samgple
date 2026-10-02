import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { agencyUser } from '@/lib/routeAuth';
import { isValidUUID } from '@/lib/validation';
import { sanitizeAvatar } from '@/lib/videos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PATCH /api/avatars/[id]  (los campos que no se envíen se conservan; { active } sirve para activar/desactivar)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  const auth = await agencyUser(req, { write: true });
  if ('error' in auth) return auth.error;

  const { data: existing } = await supabaseAdmin.from('avatars').select('*').eq('id', id).eq('owner_id', auth.ownerId).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const merged = sanitizeAvatar({ ...existing, ...body });
  if (!merged) return NextResponse.json({ error: 'Pon un nombre y el enlace de la imagen (http o https).' }, { status: 400 });

  const { data, error } = await supabaseAdmin.from('avatars').update(merged).eq('id', id).eq('owner_id', auth.ownerId).select('*').single();
  if (error) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  return NextResponse.json({ avatar: data });
}

// DELETE /api/avatars/[id]  (los pedidos ya hechos conservan el nombre y la imagen que tenían)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  const auth = await agencyUser(req, { write: true });
  if ('error' in auth) return auth.error;
  const { error } = await supabaseAdmin.from('avatars').delete().eq('id', id).eq('owner_id', auth.ownerId);
  if (error) return NextResponse.json({ error: 'No se pudo eliminar' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
