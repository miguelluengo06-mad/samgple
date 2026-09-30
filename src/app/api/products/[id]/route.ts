import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getEffectiveOwnerId, canWrite } from '@/lib/teamUtils';
import { isValidUUID, sanitizeString, isValidImageUrl } from '@/lib/validation';

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// PATCH /api/products/[id] - update a product
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });

  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ownerId, role } = await getEffectiveOwnerId(supabaseAdmin, user.id);
  if (!canWrite(role)) {
    return NextResponse.json({ error: 'You do not have permission to manage products' }, { status: 403 });
  }

  const { data: existing } = await supabaseAdmin
    .from('products')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing || existing.owner_id !== ownerId) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const updates: Record<string, any> = {};

  if (body.name !== undefined) {
    const name = sanitizeString(body.name || '', 200);
    if (!name) return NextResponse.json({ error: 'Product name cannot be empty' }, { status: 400 });
    updates.name = name;
  }

  if (body.description !== undefined) {
    updates.description = body.description ? sanitizeString(body.description, 2000) : null;
  }

  if (body.priceCents !== undefined) {
    const priceCents = Number(body.priceCents);
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      return NextResponse.json({ error: 'priceCents must be a non-negative integer' }, { status: 400 });
    }
    updates.price_cents = priceCents;
  }

  if (body.currency !== undefined) {
    updates.currency = String(body.currency).toLowerCase().slice(0, 10);
  }

  if (body.imageUrl !== undefined) {
    if (!body.imageUrl) {
      updates.image_url = null;
    } else if (typeof body.imageUrl === 'string' && body.imageUrl.startsWith('data:image/')) {
      updates.image_url = body.imageUrl;
    } else {
      const check = isValidImageUrl(body.imageUrl);
      if (!check.valid) return NextResponse.json({ error: check.error || 'Invalid image URL' }, { status: 400 });
      updates.image_url = body.imageUrl;
    }
  }

  if (body.active !== undefined) updates.active = !!body.active;
  if (body.displayOrder !== undefined) updates.display_order = Number(body.displayOrder) || 0;

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('products')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Product update error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

// DELETE /api/products/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });

  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ownerId, role } = await getEffectiveOwnerId(supabaseAdmin, user.id);
  if (!canWrite(role)) {
    return NextResponse.json({ error: 'You do not have permission to manage products' }, { status: 403 });
  }

  const { data: existing } = await supabaseAdmin
    .from('products')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing || existing.owner_id !== ownerId) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from('products').delete().eq('id', id);
  if (error) {
    console.error('Product delete error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
