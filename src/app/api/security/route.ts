import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAgencyPrincipal } from '@/lib/agencyAccess';
import { canManageTeam, getEffectiveOwnerId } from '@/lib/teamUtils';
import { blockIp, getClientIp, isValidIp, trustIp, unblockIp, untrustIp } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const missingTable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message || ''));

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const forbidden = await requireAgencyPrincipal(supabaseAdmin, user.id, req);
  if (forbidden) return { error: forbidden };
  const { role } = await getEffectiveOwnerId(supabaseAdmin, user.id);
  return { role };
}

// GET /api/security → IPs bloqueadas, eventos recientes y resumen
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if ('error' in auth) return auth.error;

  const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
  const [blocked, events, trusted] = await Promise.all([
    supabaseAdmin.from('blocked_ips').select('*').order('blocked_at', { ascending: false }).limit(200),
    supabaseAdmin.from('security_events').select('*').gte('created_at', since).order('created_at', { ascending: false }).limit(300),
    supabaseAdmin.from('trusted_ips').select('*').order('last_seen', { ascending: false }).limit(100),
  ]);
  if (missingTable(blocked.error) || missingTable(events.error) || missingTable(trusted.error)) return NextResponse.json({ setup: true, myIp: getClientIp(req.headers) });
  if (blocked.error || events.error || trusted.error) return NextResponse.json({ error: 'No se pudo cargar la seguridad' }, { status: 500 });

  const now = Date.now();
  const active = (blocked.data || []).filter((b: any) => !b.expires_at || new Date(b.expires_at).getTime() > now);
  return NextResponse.json({ myIp: getClientIp(req.headers), blocked: active, events: events.data || [], trusted: trusted.data || [] });
}

// POST /api/security { ip, days? }  → bloqueo manual (days omitido = permanente)
// POST /api/security { trust: true, ip?, label? } → registrar una IP de confianza (sin ip = la tuya actual)
export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if ('error' in auth) return auth.error;
  if (!canManageTeam(auth.role)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const ip = String(body.ip || (body.trust ? getClientIp(req.headers) : '')).trim();
  if (!isValidIp(ip)) return NextResponse.json({ error: 'IP no válida' }, { status: 400 });

  if (body.trust === true) {
    const { ok } = await trustIp(ip, String(body.label || 'Añadida a mano').trim(), false);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'No se pudo registrar la IP' }, { status: 500 });
  }

  if (ip === getClientIp(req.headers)) return NextResponse.json({ error: 'Esa es tu IP actual: te bloquearías a ti mismo.' }, { status: 400 });
  const days = Number(body.days);
  const ok = await blockIp(ip, 'Bloqueo manual', Number.isFinite(days) && days > 0 ? Math.min(days, 365) * 24 * 3600_000 : null, true);
  if (!ok) return NextResponse.json({ error: 'No se pudo bloquear: esa IP es de confianza. Quítala primero de la lista.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/security?ip=…  → desbloquear  ·  ?trusted=1 → quitar una IP de confianza
export async function DELETE(req: NextRequest) {
  const auth = await authenticate(req);
  if ('error' in auth) return auth.error;
  if (!canManageTeam(auth.role)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  const ip = req.nextUrl.searchParams.get('ip') || '';
  if (!isValidIp(ip)) return NextResponse.json({ error: 'IP no válida' }, { status: 400 });
  const ok = req.nextUrl.searchParams.get('trusted') === '1' ? await untrustIp(ip) : await unblockIp(ip);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'No se pudo desbloquear' }, { status: 500 });
}
