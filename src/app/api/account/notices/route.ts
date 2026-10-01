import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isValidUUID } from '@/lib/validation';
import { markNoticeRead, parseNotices } from '@/lib/notices';

export const dynamic = 'force-dynamic';

async function confirmedUser(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  // Sin email confirmado cualquiera podría leer avisos ajenos registrándose con su dirección
  if (error || !user?.email || !user.email_confirmed_at) return null;
  return user;
}

const escapeLike = (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`);

// GET /api/account/notices — avisos que la agencia ha dejado a este cliente (por email confirmado)
export async function GET(req: NextRequest) {
  const user = await confirmedUser(req);
  if (!user) return NextResponse.json({ notices: [] });

  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('id, answers')
    .ilike('email', escapeLike(user.email!))
    .not('answers->notices', 'is', null)
    .limit(50);
  if (error) {
    console.error('Account notices fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }

  const notices = (data || [])
    .flatMap((l: any) => parseNotices(l.answers).map((n) => ({ lead_id: l.id, id: n.id, title: n.title, body: n.body, created_at: n.created_at, read_at: n.read_at ?? null })))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 50);
  return NextResponse.json({ notices });
}

// POST /api/account/notices  { leadId, noticeId } — marcar un aviso como leído
export async function POST(req: NextRequest) {
  const user = await confirmedUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!isValidUUID(body?.leadId) || typeof body?.noticeId !== 'string') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, answers')
    .eq('id', body.leadId)
    .ilike('email', escapeLike(user.email!))
    .maybeSingle();
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const answers = markNoticeRead(lead.answers, body.noticeId);
  if (answers) await supabaseAdmin.from('leads').update({ answers }).eq('id', lead.id);
  return NextResponse.json({ ok: true });
}
