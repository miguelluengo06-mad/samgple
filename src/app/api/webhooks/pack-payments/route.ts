import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAgencyStripe, isPaidSession, noteOrderEvent, recordOrder } from '@/lib/packCheckout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/pack-payments — webhook de la cuenta de Stripe de la agencia (cobro de los packs).
 *
 * Es la red de seguridad: si el cliente cierra la ventana antes de volver a /gracias, la compra se registra igual.
 * En Stripe → Developers → Webhooks, apunta un endpoint a  https://TU-DOMINIO/api/webhooks/pack-payments
 * con los eventos checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, charge.refunded e invoice.payment_failed, y guarda su
 * "Signing secret" (whsec_…) en la variable STRIPE_PACKS_WEBHOOK_SECRET.
 * (No es el mismo webhook que /api/webhooks/stripe, que es el de la plataforma.)
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_PACKS_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Pack payments webhook: STRIPE_PACKS_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  const payload = await req.text(); // raw body: needed to verify the signature

  const ctx = await getAgencyStripe();
  // constructEvent only checks the signature (no API call), so any Stripe instance works
  const verifier = ctx?.stripe ?? new Stripe('sk_test_signature_check_only');

  let event: Stripe.Event;
  try {
    event = verifier.webhooks.constructEvent(payload, signature, secret);
  } catch (err: any) {
    console.error('Pack payments webhook: invalid signature:', err?.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const handled = [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
    'charge.refunded',
    'invoice.payment_failed',
  ];
  if (!handled.includes(event.type)) {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  if (!ctx) {
    // Signature was valid but there is no agency Stripe key to work with: let Stripe retry later
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  try {
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
      if (!pi) return NextResponse.json({ received: true, ignored: 'no payment intent' });
      const total = charge.amount_refunded / 100;
      const noted = await noteOrderEvent(ctx.ownerId, 'payment_intent_id', pi, event.id, `Reembolsado ${total.toLocaleString('es-ES')} € en Stripe`, { refunded_eur: total });
      return NextResponse.json({ received: true, noted });
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = invoice.parent?.subscription_details?.subscription;
      const subId = typeof sub === 'string' ? sub : sub?.id;
      if (!subId) return NextResponse.json({ received: true, ignored: 'not a subscription invoice' });
      const noted = await noteOrderEvent(ctx.ownerId, 'subscription_id', subId, event.id, 'Cobro de la suscripción fallido en Stripe');
      return NextResponse.json({ received: true, noted });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    // Only handle payments started by this feature (pack_id is set in the session metadata)
    if (!session.metadata?.pack_id) return NextResponse.json({ received: true, ignored: 'not a pack purchase' });
    if (event.type === 'checkout.session.async_payment_failed') {
      console.error(`Pack payments webhook: async payment failed for session ${session.id}`);
      return NextResponse.json({ received: true, ignored: 'async payment failed' });
    }
    if (!isPaidSession(session)) return NextResponse.json({ received: true, ignored: 'not paid yet' });

    const result = await recordOrder(ctx.ownerId, session);
    return NextResponse.json({ received: true, recorded: !!result && !result.duplicate });
  } catch (err: any) {
    console.error('Pack payments webhook: could not record the order:', err?.message);
    return NextResponse.json({ error: 'Could not record the order' }, { status: 500 }); // Stripe retries
  }
}
