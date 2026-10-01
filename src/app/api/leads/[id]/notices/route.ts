import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getEffectiveOwnerId, canWrite } from '@/lib/teamUtils';
import { isValidUUID } from '@/lib/validation';
import { addNotice } from '@/lib/notices';

// POST /api/leads/[id]/notices  { title, body } — aviso para el cliente: lo verá en su cuenta
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ownerId, role } = await getEffectiveOwnerId(supabaseAdmin, user.id);
  if (!canWrite(role)) return NextResponse.json({ error: 'You do not have permission to manage leads' }, { status: 403 });

  const { data: lead } = await supabaseAdmin.from('leads').select('id, owner_id, answers').eq('id', id).maybeSingle();
  if (!lead || lead.owner_id !== ownerId) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const added = addNotice(lead.answers, { title: body?.title, body: body?.body });
  if (!added) return NextResponse.json({ error: 'Escribe un título y un mensaje' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('leads')
    .update({ answers: added.answers, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) {
    console.error('Notice save error:', error);
    return NextResponse.json({ error: 'No se pudo guardar el aviso' }, { status: 500 });
  }
  return NextResponse.json({ lead: data, notice: added.notice });
}
