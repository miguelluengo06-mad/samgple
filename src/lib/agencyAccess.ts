import { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getEffectiveOwnerId } from '@/lib/teamUtils';

/**
 * Who counts as "the agency" on this deployment.
 *
 * A self-hosted install serves a single agency: the earliest-created profile is the owner
 * (same rule as /api/public/branding, /api/public/contact and /api/portal/whoami), and the
 * owner's accepted team members act on their behalf.
 *
 * Anyone else who registers (visitors from the public site, invited clients) must never
 * reach routes that use the agency's own infrastructure keys — n8n / Coolify / FlowEngine /
 * AI / SMTP. Those routes call requireAgencyPrincipal().
 */

const OWNER_TTL_MS = 30_000;
let ownerCache: { id: string; at: number } | null = null;

export async function getSiteOwnerId(supabase: SupabaseClient): Promise<string | null> {
  const now = Date.now();
  if (ownerCache && now - ownerCache.at < OWNER_TTL_MS) return ownerCache.id;

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data?.id) return null;
  ownerCache = { id: data.id, at: now };
  return data.id;
}

/** True for the agency owner and for accepted members of the owner's team. */
export async function isAgencyPrincipal(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const ownerId = await getSiteOwnerId(supabase);
  if (!ownerId) return false;
  if (userId === ownerId) return true;
  const ctx = await getEffectiveOwnerId(supabase, userId);
  return ctx.isTeamMember && ctx.ownerId === ownerId;
}

/** Returns a 403 response when the user is not part of the agency, or null when access is fine. */
export async function requireAgencyPrincipal(supabase: SupabaseClient, userId: string): Promise<NextResponse | null> {
  if (await isAgencyPrincipal(supabase, userId)) return null;
  return NextResponse.json({ error: 'Only the agency team can do this' }, { status: 403 });
}

/** Test helper — the owner lookup is cached for a short time. */
export function resetAgencyAccessCache() {
  ownerCache = null;
}
