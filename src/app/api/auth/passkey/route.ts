import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { agencyUser } from '@/lib/routeAuth';
import { isValidUUID } from '@/lib/validation';
import { forgetPasskeyCount, listPasskeys } from '@/lib/passkeys';
import { PASSKEYS_REQUIRED } from '@/lib/passkeyConstants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/auth/passkey → mis dispositivos registrados
export async function GET(req: NextRequest) {
  const auth = await agencyUser(req);
  if ('error' in auth) return auth.error;
  const { rows, setup } = await listPasskeys(auth.userId);
  return NextResponse.json({
    setup,
    required: PASSKEYS_REQUIRED,
    passkeys: rows.map((r) => ({ id: r.id, name: r.device_name, created_at: r.created_at, last_used_at: r.last_used_at, backed_up: r.backed_up })),
  });
}

// DELETE /api/auth/passkey?id=… → quitar uno de mis dispositivos
export async function DELETE(req: NextRequest) {
  const auth = await agencyUser(req);
  if ('error' in auth) return auth.error;
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  const { error } = await supabaseAdmin.from('passkeys').delete().eq('id', id).eq('user_id', auth.userId);
  if (error) return NextResponse.json({ error: 'No se pudo quitar el dispositivo' }, { status: 500 });
  forgetPasskeyCount(auth.userId);
  return NextResponse.json({ ok: true });
}
