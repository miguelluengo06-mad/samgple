import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSiteOwnerId, isAgencyPrincipal } from '@/lib/agencyAccess';

export const dynamic = 'force-dynamic';

// GET /api/portal/whoami → ¿es la persona que pregunta de la agencia (dueño o equipo)?
// Es la única fuente de verdad del rol: usa la misma regla que protege todas las rutas de administración.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [ownerId, isAgency] = await Promise.all([getSiteOwnerId(supabaseAdmin), isAgencyPrincipal(supabaseAdmin, user.id)]);
  return NextResponse.json({ isOwner: ownerId === user.id, isAgency });
}
