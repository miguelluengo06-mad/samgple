import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getEffectiveOwnerId, canWrite } from '@/lib/teamUtils';
import { sanitizeString, isValidImageUrl } from '@/lib/validation';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// GET /api/products - list the agency's own products (agency dashboard)
export async function GET(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ownerId } = await getEffectiveOwnerId(supabaseAdmin, user.id);

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('owner_id', ownerId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }

  return NextResponse.json({ products: data || [] });
}

// POST /api/products - create a new product
export async function POST(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ownerId, role } = await getEffectiveOwnerId(supabaseAdmin, user.id);
  if (!canWrite(role)) {
    return NextResponse.json({ error: 'You do not have permission to manage products' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const name = sanitizeString(body.name || '', 200);
  if (!name) {
    return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
  }

  const priceCents = Number(body.priceCents);
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    return NextResponse.json({ error: 'priceCents must be a non-negative integer' }, { status: 400 });
  }

  const description = body.description ? sanitizeString(body.description, 2000) : null;
  const currency = (body.currency ? String(body.currency) : 'usd').toLowerCase().slice(0, 10);

  let imageUrl: string | null = null;
  if (body.imageUrl) {
    // Allow data: URLs (client-side compressed uploads) as well as external https URLs
    if (typeof body.imageUrl === 'string' && body.imageUrl.startsWith('data:image/')) {
      imageUrl = body.imageUrl;
    } else {
      const check = isValidImageUrl(body.imageUrl);
      if (!check.valid) {
        return NextResponse.json({ error: check.error || 'Invalid image URL' }, { status: 400 });
      }
      imageUrl = body.imageUrl;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
      owner_id: ownerId,
      name,
      description,
      price_cents: priceCents,
      currency,
      image_url: imageUrl,
      active: body.active !== false,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Product create error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}
