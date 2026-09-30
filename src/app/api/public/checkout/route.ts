import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { decryptApiKey } from '@/lib/encryption';
import { isValidUUID, checkRateLimit } from '@/lib/validation';

// POST /api/public/checkout - create a Stripe Checkout Session for a store product (no auth)
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(`store-checkout:${ip}`, 10, 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { productId } = body;
    if (!productId || !isValidUUID(productId)) {
      return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, owner_id, name, description, price_cents, currency, image_url, active')
      .eq('id', productId)
      .maybeSingle();

    if (productError || !product || !product.active) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('agency_stripe_key_encrypted')
      .eq('id', product.owner_id)
      .maybeSingle();

    const apiKey = decryptApiKey(profile?.agency_stripe_key_encrypted);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'This store is not accepting payments yet. Please contact the agency directly.' },
        { status: 503 }
      );
    }

    const stripe = new Stripe(apiKey);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: product.currency || 'usd',
            unit_amount: product.price_cents,
            product_data: {
              name: product.name,
              description: product.description || undefined,
              images: product.image_url && product.image_url.startsWith('http') ? [product.image_url] : undefined,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/store?success=1`,
      cancel_url: `${siteUrl}/store?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Store checkout error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start checkout' }, { status: 500 });
  }
}
