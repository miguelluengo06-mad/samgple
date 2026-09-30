import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// GET /api/account/calls - the signed-in visitor's own calls/requests, matched by (confirmed) email.
// Deliberately returns a narrow projection: internal notes, status history and other
// agency-only columns never leave this route.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Without a confirmed email anyone could claim someone else's bookings by registering with their address.
  if (!user.email || !user.email_confirmed_at) return NextResponse.json({ calls: [] });

  // ilike for case-insensitivity; escape the LIKE wildcards that are legal in an email (_ and %).
  const pattern = user.email.replace(/[\\%_]/g, (c) => `\\${c}`);

  const { data, error: queryError } = await supabaseAdmin
    .from('leads')
    .select('id, kind, call_at, status, created_at')
    .ilike('email', pattern)
    .order('created_at', { ascending: false })
    .limit(50);

  if (queryError) {
    console.error('Account calls fetch error:', queryError);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }

  return NextResponse.json({ calls: data || [] });
}
