import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// GET /api/portal/whoami - is the signed-in user the agency owner?
// Self-hosted deployments serve a single agency: the earliest-created profile is the owner
// (same rule as /api/public/branding, /api/public/contact and /api/public/checkout).
// Everyone who registers later is a visitor/client and gets the limited account area.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: owner } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ isOwner: owner?.id === user.id });
}
