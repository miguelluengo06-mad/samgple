import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const TYPES: EmailOtpType[] = ['invite', 'recovery', 'magiclink', 'signup', 'email'];

/**
 * Enlace de los correos de acceso (crear contraseña, recuperar…): canjea el token de un solo uso, abre la sesión
 * y redirige. Los enlaces los genera el servidor al comprar un pack o desde la ficha del cliente.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const rawNext = searchParams.get('next') ?? '/portal';
  // Solo rutas propias: evita redirecciones a webs de terceros
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/portal';

  if (tokenHash && type && TYPES.includes(type)) {
    const store = await cookies();
    const supabase = createServerClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        get: (name: string) => store.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try {
            store.set({ name, value, ...options });
          } catch {
            /* cookie no escribible en este contexto */
          }
        },
        remove: (name: string, options: CookieOptions) => {
          try {
            store.delete({ name, ...options });
          } catch {
            /* ignore */
          }
        },
      },
    });
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${baseUrl}${next}`);
  }

  return NextResponse.redirect(`${baseUrl}/auth/auth-code-error`);
}
