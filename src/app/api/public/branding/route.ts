import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/public/branding - agency name/logo for the public site (no auth)
// Self-hosted deployments serve a single agency, so the earliest-created
// profile is treated as the agency owner (clients are invited afterwards).
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('business_name, agency_logo_url')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Public branding fetch error:', error);
    return NextResponse.json({ business_name: null, agency_logo_url: null });
  }

  return NextResponse.json({
    business_name: data?.business_name ?? null,
    agency_logo_url: data?.agency_logo_url ?? null,
  });
}
