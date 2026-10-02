import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAgencyPrincipal } from '@/lib/agencyAccess';
import { canWrite, getEffectiveOwnerId, type TeamRole } from '@/lib/teamUtils';

/** Cliente con sesión y email confirmado (sin email confirmado cualquiera podría registrarse con un correo ajeno). */
export async function confirmedCustomer(req: NextRequest): Promise<{ id: string; email: string; name: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user?.email || !user.email_confirmed_at) return null;
  return { id: user.id, email: user.email.toLowerCase(), name: String(user.user_metadata?.full_name || '') };
}

/** Persona de la agencia (dueño o equipo). Con `write` además exige permiso de edición. */
export async function agencyUser(
  req: NextRequest,
  opts: { write?: boolean } = {}
): Promise<{ error: NextResponse } | { ownerId: string; role: TeamRole; userId: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const forbidden = await requireAgencyPrincipal(supabaseAdmin, user.id, req);
  if (forbidden) return { error: forbidden };
  const { ownerId, role } = await getEffectiveOwnerId(supabaseAdmin, user.id);
  if (opts.write && !canWrite(role)) return { error: NextResponse.json({ error: 'Sin permiso para editar' }, { status: 403 }) };
  return { ownerId, role, userId: user.id };
}
