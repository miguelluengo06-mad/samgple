import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { isAgencyPrincipal, requireAgencyPrincipal } from '@/lib/agencyAccess';
import { checkRateLimit } from '@/lib/validation';
import { generateAccessPassword } from '@/lib/accessPassword';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/agency/create-customer-access  { email, name?, reset? }
 *
 * La agencia crea el acceso de un cliente (el registro público está cerrado): se crea la cuenta con el email ya
 * confirmado y una contraseña generada, que se devuelve UNA sola vez para que se la pase al cliente.
 * Si la cuenta ya existe, solo se cambia la contraseña cuando se pide expresamente (reset: true).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const forbidden = await requireAgencyPrincipal(supabaseAdmin, user.id, req);
  if (forbidden) return forbidden;

  if (!checkRateLimit(`customer-access:${user.id}`, 30, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim().slice(0, 120);
  const reset = body.reset === true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Email no válido' }, { status: 400 });

  const password = generateAccessPassword();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { full_name: name } : undefined,
  });

  if (!createError && created?.user) {
    return NextResponse.json({ created: true, email, password, loginUrl: `${siteUrl}/auth` });
  }

  const exists = /already (been )?registered|already exists/i.test(createError?.message || '');
  if (!exists) {
    console.error('Create customer access error:', createError);
    return NextResponse.json({ error: 'No se pudo crear el acceso' }, { status: 500 });
  }
  if (!reset) return NextResponse.json({ created: false, alreadyRegistered: true, email });

  // Cambiar la contraseña de una cuenta existente: nunca la de alguien del equipo de la agencia
  const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const users = (list?.users ?? []) as { id: string; email?: string }[];
  const target = users.find((u) => (u.email || '').toLowerCase() === email);
  if (!target) return NextResponse.json({ error: 'No se encontró la cuenta' }, { status: 404 });
  if (await isAgencyPrincipal(supabaseAdmin, target.id)) {
    return NextResponse.json({ error: 'Esa cuenta es del equipo de la agencia: cambia su contraseña desde Ajustes.' }, { status: 403 });
  }
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(target.id, { password, email_confirm: true });
  if (updateError) {
    console.error('Reset customer password error:', updateError);
    return NextResponse.json({ error: 'No se pudo cambiar la contraseña' }, { status: 500 });
  }
  return NextResponse.json({ created: false, reset: true, email, password, loginUrl: `${siteUrl}/auth` });
}
