import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkRateLimit } from '@/lib/validation';
import { cartLines, cartSummary, cartTotalCents, sanitizeCart } from '@/lib/cart';
import { buildCartCheckoutParams, getAgencyStripe } from '@/lib/packCheckout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * POST /api/public/cart-checkout — crea una sesión de Stripe Checkout para un carrito (sin login).
 *   body: { items: [{ id, qty }], email, name?, phone? }
 * Devuelve { url } para redirigir al pago de Stripe.
 *
 * Los importes SIEMPRE salen de src/lib/packs.ts: el navegador solo manda identificadores y cantidades.
 * Con el email se guarda una «posible compra» en Solicitudes; si el cliente paga, el webhook la marca como ganada.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(`cart-checkout:${ip}`, 10, 60 * 1000).allowed) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera un momento.' }, { status: 429 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const items = sanitizeCart(body.items);
    if (items.length === 0) return NextResponse.json({ error: 'Tu carrito está vacío.' }, { status: 400 });

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : '';
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Escribe un email válido para enviarte la factura.' }, { status: 400 });
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : '';

    const stripeCtx = await getAgencyStripe();
    if (!stripeCtx) {
      return NextResponse.json(
        { error: 'Los pagos online todavía no están activados. Escríbenos y lo resolvemos en un momento.' },
        { status: 503 }
      );
    }

    // «Posible compra»: queda en Solicitudes aunque el cliente no llegue a pagar. Si falla, el pago sigue adelante.
    const lines = cartLines(items);
    const summary = cartSummary(lines);
    const totalEur = cartTotalCents(items) / 100;
    const cart = {
      items: lines.map((l) => ({ pack_id: l.pack.id, name: l.pack.name, qty: l.qty, unit_eur: l.pack.price, total_eur: l.totalCents / 100 })),
      total_eur: totalEur,
    };
    let leadId: string | undefined;
    try {
      const pattern = email.replace(/[\\%_]/g, (c) => `\\${c}`);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: open } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('owner_id', stripeCtx.ownerId)
        .eq('source', 'cart')
        .eq('status', 'new')
        .ilike('email', pattern)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const fields = {
        name: name || email,
        phone: phone || null,
        message: `Carrito sin pagar: ${summary} — ${totalEur.toLocaleString('es-ES')} € (IVA incluido)`.slice(0, 1000),
        answers: { cart },
        updated_at: new Date().toISOString(),
      };
      if (open) {
        await supabaseAdmin.from('leads').update(fields).eq('id', open.id);
        leadId = open.id;
      } else {
        const { data: created } = await supabaseAdmin
          .from('leads')
          .insert({ owner_id: stripeCtx.ownerId, email, company: null, source: 'cart', kind: 'proposal', status: 'new', ...fields })
          .select('id')
          .single();
        leadId = created?.id;
      }
    } catch (err) {
      console.error('Cart checkout: could not save the cart as a lead:', err);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const session = await stripeCtx.stripe.checkout.sessions.create(
      buildCartCheckoutParams(items, { siteUrl, returnPath: '/carrito', leadId, email })
    );
    if (!session.url) throw new Error('Stripe did not return a checkout URL');

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Cart checkout error:', error?.message || error);
    return NextResponse.json({ error: 'No hemos podido abrir el pago. Inténtalo de nuevo en un momento.' }, { status: 502 });
  }
}
