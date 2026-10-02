import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAgencyPrincipal } from '@/lib/agencyAccess';
import { getEffectiveOwnerId } from '@/lib/teamUtils';

// GET /api/leads/count - lightweight count of new (unactioned) leads, for the nav badge
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const forbidden = await requireAgencyPrincipal(supabaseAdmin, user.id, req);
  if (forbidden) return forbidden;

  const { ownerId } = await getEffectiveOwnerId(supabaseAdmin, user.id);

  const { count, error: countError } = await supabaseAdmin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('status', 'new');

  if (countError) {
    return NextResponse.json({ error: 'Failed to count leads' }, { status: 500 });
  }

  return NextResponse.json({ new: count || 0 });
}
