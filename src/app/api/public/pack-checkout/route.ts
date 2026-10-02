import { getClientIp, reportSuspicious } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit, isValidUUID } from '@/lib/validation';
import { WELCOME_PACK, getPurchasable, welcomeSpots } from '@/lib/packs';
import { trackingFromCookies } from '@/lib/metaCapi';
import { buildCheckoutParams, getAgencyStripe, safeReturnPath } from '@/lib/packCheckout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/public/pack-checkout — crea una sesión de Stripe Checkout para un pack (sin login).
 *   body: { packId: string, leadId?: string, returnPath?: string }
 * Devuelve { url } para redirigir al cliente a la pantalla de pago de Stripe.
 *
 * El importe SIEMPRE sale de src/lib/packs.ts, nunca del navegador: el cliente solo elige el identificador.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    if (!checkRateLimit(`pack-checkout:${ip}`, 10, 60 * 1000).allowed) {
      await reportSuspicious({ ip, kind: 'rate_limited', path: req.nextUrl?.pathname, userAgent: req.headers.get('user-agent') });
      return NextResponse.json({ error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const pack = typeof body.packId === 'string' ? getPurchasable(body.packId) : null;
    if (!pack) return NextResponse.json({ error: 'Ese pack no existe.' }, { status: 404 });

    const stripeCtx = await getAgencyStripe();
    if (!stripeCtx) {
      return NextResponse.json(
        { error: 'Los pagos online todavía no están activados. Escríbenos y lo resolvemos en un momento.' },
        { status: 503 }
      );
    }

    let leadId: string | undefined;
    if (pack.id === WELCOME_PACK.id) {
      if (welcomeSpots().soldOut) {
        return NextResponse.json({ error: 'Las plazas del Pack de Bienvenida se han agotado.' }, { status: 409 });
      }
      // El Pack de Bienvenida se compra tras rellenar el formulario corto: necesitamos esa solicitud
      leadId = typeof body.leadId === 'string' ? body.leadId : undefined;
      if (!leadId || !isValidUUID(leadId)) {
        return NextResponse.json({ error: 'Rellena primero el formulario del pack.' }, { status: 400 });
      }
      const { data: lead } = await supabaseAdmin
        .from('leads')
        .select('id, answers')
        .eq('id', leadId)
        .eq('owner_id', stripeCtx.ownerId)
        .maybeSingle();
      if (!lead || lead.answers?.pack?.id !== 'welcome') {
        return NextResponse.json({ error: 'No hemos encontrado tu formulario. Vuelve a rellenarlo.' }, { status: 404 });
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const returnPath = safeReturnPath(body.returnPath, pack.id === WELCOME_PACK.id ? '/landing#pack' : '/#precios');

    const session = await stripeCtx.stripe.checkout.sessions.create(
      buildCheckoutParams(pack, { siteUrl, returnPath, leadId, tracking: trackingFromCookies((n) => req.cookies.get(n)?.value) })
    );
    if (!session.url) throw new Error('Stripe did not return a checkout URL');

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Pack checkout error:', error?.message || error);
    return NextResponse.json({ error: 'No hemos podido abrir el pago. Inténtalo de nuevo en un momento.' }, { status: 502 });
  }
}
