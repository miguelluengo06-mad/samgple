import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAgencyStripe, isPaidSession, recordOrder } from '@/lib/packCheckout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/pack-payments — webhook de la cuenta de Stripe de la agencia (cobro de los packs).
 *
 * Es la red de seguridad: si el cliente cierra la ventana antes de volver a /gracias, la compra se registra igual.
 * En Stripe → Developers → Webhooks, apunta un endpoint a  https://TU-DOMINIO/api/webhooks/pack-payments
 * con los eventos checkout.session.completed y checkout.session.async_payment_succeeded, y guarda su
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

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  if (!ctx) {
    // Signature was valid but there is no agency Stripe key to work with: let Stripe retry later
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  try {
    const session = event.data.object as Stripe.Checkout.Session;
    // Only handle payments started by this feature (pack_id is set in the session metadata)
    if (!session.metadata?.pack_id) return NextResponse.json({ received: true, ignored: 'not a pack purchase' });
    if (!isPaidSession(session)) return NextResponse.json({ received: true, ignored: 'not paid yet' });

    const result = await recordOrder(ctx.ownerId, session);
    return NextResponse.json({ received: true, recorded: !!result && !result.duplicate });
  } catch (err: any) {
    console.error('Pack payments webhook: could not record the order:', err?.message);
    return NextResponse.json({ error: 'Could not record the order' }, { status: 500 }); // Stripe retries
  }
}
