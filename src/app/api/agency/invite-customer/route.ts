import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAgencyPrincipal } from '@/lib/agencyAccess';
import { checkRateLimit } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/agency/invite-customer { email, name? } - the agency invites a customer to their account area
// (purchases + support). Registration stays closed to everyone else. The invite link confirms the email.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const forbidden = await requireAgencyPrincipal(supabaseAdmin, user.id, req);
  if (forbidden) return forbidden;

  const limit = checkRateLimit(`invite-customer:${user.id}`, 30, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Email no válido' }, { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/portal`,
    data: name ? { full_name: name } : undefined,
  });

  if (inviteError) {
    const exists = /already (been )?registered|already exists/i.test(inviteError.message);
    if (exists) return NextResponse.json({ invited: false, alreadyRegistered: true });
    console.error('Invite customer error:', inviteError);
    return NextResponse.json({ error: 'No se pudo enviar la invitación' }, { status: 500 });
  }
  return NextResponse.json({ invited: true });
}
