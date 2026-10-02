import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { agencyAccessFor, getSiteOwnerId } from '@/lib/agencyAccess';

export const dynamic = 'force-dynamic';

// GET /api/portal/whoami → ¿es la persona que pregunta de la agencia (dueño o equipo)?
// Es la única fuente de verdad del rol: usa la misma regla que protege todas las rutas de administración.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [ownerId, access] = await Promise.all([getSiteOwnerId(supabaseAdmin), agencyAccessFor(supabaseAdmin, user.id, req)]);
  // passkeyRequired: es del equipo pero esta sesión no entró con passkey (el panel le pide que entre con él)
  return NextResponse.json({ isOwner: ownerId === user.id, isAgency: access === 'ok', passkeyRequired: access === 'passkey_required' });
}
