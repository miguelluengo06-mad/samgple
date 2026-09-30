import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET /api/public/products - list active products for the public store (no auth)
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name, description, price_cents, currency, image_url, display_order')
    .eq('active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Public products fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }

  return NextResponse.json({ products: data || [] });
}
