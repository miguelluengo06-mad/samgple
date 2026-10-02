import { getClientIp, reportSuspicious } from '@/lib/security';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/validation';
import { getAgencyStripe, isPaidSession, orderFromSession, recordOrder } from '@/lib/packCheckout';
import { VAT_LABEL } from '@/lib/packs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/public/pack-checkout/confirm?session_id=cs_…
 * La página /gracias la llama al volver de Stripe: comprueba el pago con Stripe (no se fía del navegador),
 * registra la compra en el panel y devuelve un resumen mínimo para enseñárselo al cliente.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!checkRateLimit(`pack-confirm:${ip}`, 30, 60 * 1000).allowed) {
      await reportSuspicious({ ip, kind: 'rate_limited', path: req.nextUrl?.pathname, userAgent: req.headers.get('user-agent') });
    return NextResponse.json({ error: 'Demasiadas peticiones' }, { status: 429 });
  }

  const sessionId = req.nextUrl.searchParams.get('session_id') || '';
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) {
    return NextResponse.json({ error: 'Sesión no válida' }, { status: 400 });
  }

  const ctx = await getAgencyStripe();
  if (!ctx) return NextResponse.json({ error: 'Pagos no disponibles' }, { status: 503 });

  try {
    const session = await ctx.stripe.checkout.sessions.retrieve(sessionId);
    const paid = isPaidSession(session);
    if (paid) await recordOrder(ctx.ownerId, session);

    const order = orderFromSession(session);
    return NextResponse.json({
      paid,
      pack: order.pack_name,
      amount: order.amount_eur,
      monthly: order.mode === 'subscription',
      vat: VAT_LABEL,
      testMode: !session.livemode,
    });
  } catch (error: any) {
    console.error('Pack checkout confirm error:', error?.message || error);
    return NextResponse.json({ error: 'No hemos podido comprobar el pago' }, { status: 502 });
  }
}
