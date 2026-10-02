import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { agencyUser } from '@/lib/routeAuth';
import { sanitizeAvatar } from '@/lib/videos';
import { missingTable } from '@/lib/videoServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/avatars → catálogo completo (también los desactivados)
export async function GET(req: NextRequest) {
  const auth = await agencyUser(req);
  if ('error' in auth) return auth.error;
  const { data, error } = await supabaseAdmin.from('avatars').select('*').eq('owner_id', auth.ownerId).order('created_at', { ascending: true });
  if (missingTable(error)) return NextResponse.json({ avatars: [], setup: true });
  if (error) return NextResponse.json({ error: 'No se pudo cargar el catálogo' }, { status: 500 });
  return NextResponse.json({ avatars: data || [] });
}

// POST /api/avatars { name, style, gender, tags, image_url, preview_url?, active? }
export async function POST(req: NextRequest) {
  const auth = await agencyUser(req, { write: true });
  if ('error' in auth) return auth.error;
  const input = sanitizeAvatar(await req.json().catch(() => ({})));
  if (!input) return NextResponse.json({ error: 'Pon un nombre y el enlace de la imagen (http o https).' }, { status: 400 });
  const { data, error } = await supabaseAdmin.from('avatars').insert({ owner_id: auth.ownerId, ...input }).select('*').single();
  if (missingTable(error)) return NextResponse.json({ error: 'Falta crear las tablas', setup: true }, { status: 409 });
  if (error) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  return NextResponse.json({ avatar: data });
}
