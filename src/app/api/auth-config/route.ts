import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

let _client: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _client;
}

/**
 * Public endpoint — returns only what the login page needs (no authentication required).
 * Registration is closed: the only time it opens is the very first run, to create the administrator.
 * Customer accounts are created by the agency from the panel.
 */
export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    const [{ data: profile }, { count }] = await Promise.all([
      sb.from('profiles')
        .select('business_name')
        .or('business_name.not.is.null')
        .limit(1)
        .maybeSingle(),
      sb.from('profiles').select('id', { count: 'exact', head: true }),
    ]);

    const firstRun = (count ?? 0) === 0;

    return NextResponse.json({
      allow_signup: firstRun,
      // Solo el nombre de empresa: nunca el nombre personal de quien creó la cuenta
      agency_name: profile?.business_name || null,
      first_run: firstRun,
    });
  } catch {
    return NextResponse.json({ allow_signup: false, agency_name: null, first_run: false });
  }
}
