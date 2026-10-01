import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAgencyPrincipal } from '@/lib/agencyAccess';
import { canWrite, getEffectiveOwnerId } from '@/lib/teamUtils';
import { sanitizePrompt, STARTER_PIECES } from '@/lib/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** La tabla `prompts` se crea con migrations/add-prompts.sql; hasta entonces el panel enseña cómo hacerlo. */
const missingTable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message || ''));

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const forbidden = await requireAgencyPrincipal(supabaseAdmin, user.id);
  if (forbidden) return { error: forbidden };
  const { ownerId, role } = await getEffectiveOwnerId(supabaseAdmin, user.id);
  return { ownerId, role };
}

// GET /api/prompts → { prompts, setup? }
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ('error' in auth) return auth.error;

  const { data, error } = await supabaseAdmin
    .from('prompts')
    .select('*')
    .eq('owner_id', auth.ownerId)
    .order('created_at', { ascending: true });
  if (missingTable(error)) return NextResponse.json({ prompts: [], setup: true });
  if (error) {
    console.error('Prompts fetch error:', error);
    return NextResponse.json({ error: 'No se pudieron cargar los prompts' }, { status: 500 });
  }
  return NextResponse.json({ prompts: data || [] });
}

// POST /api/prompts  { kind, title, body, category, block_ids }  ·  { seed: true } crea las piezas de ejemplo
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if ('error' in auth) return auth.error;
  if (!canWrite(auth.role)) return NextResponse.json({ error: 'Sin permiso para editar' }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  if (body?.seed === true) {
    const rows = STARTER_PIECES.map((p) => ({ owner_id: auth.ownerId, kind: 'block', ...p }));
    const { data, error } = await supabaseAdmin.from('prompts').insert(rows).select('*');
    if (missingTable(error)) return NextResponse.json({ error: 'Falta crear la tabla', setup: true }, { status: 409 });
    if (error) return NextResponse.json({ error: 'No se pudieron crear las piezas' }, { status: 500 });
    return NextResponse.json({ prompts: data });
  }

  const input = sanitizePrompt(body);
  if (!input) return NextResponse.json({ error: 'Falta el título o el texto' }, { status: 400 });

  const { data, error } = await supabaseAdmin.from('prompts').insert({ owner_id: auth.ownerId, ...input }).select('*').single();
  if (missingTable(error)) return NextResponse.json({ error: 'Falta crear la tabla', setup: true }, { status: 409 });
  if (error) {
    console.error('Prompt create error:', error);
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  }
  return NextResponse.json({ prompt: data });
}
