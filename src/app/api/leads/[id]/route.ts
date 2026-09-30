import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getEffectiveOwnerId, canWrite } from '@/lib/teamUtils';
import { isValidUUID, sanitizeString } from '@/lib/validation';

const VALID_STATUSES = ['new', 'contacted', 'won', 'lost'];

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// PATCH /api/leads/[id] - update status/notes
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });

  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ownerId, role } = await getEffectiveOwnerId(supabaseAdmin, user.id);
  if (!canWrite(role)) {
    return NextResponse.json({ error: 'You do not have permission to manage leads' }, { status: 403 });
  }

  const { data: existing } = await supabaseAdmin
    .from('leads')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing || existing.owner_id !== ownerId) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const updates: Record<string, any> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (body.notes !== undefined) {
    updates.notes = body.notes ? sanitizeString(body.notes, 4000) : null;
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Lead update error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}

// DELETE /api/leads/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 });

  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ownerId, role } = await getEffectiveOwnerId(supabaseAdmin, user.id);
  if (!canWrite(role)) {
    return NextResponse.json({ error: 'You do not have permission to manage leads' }, { status: 403 });
  }

  const { data: existing } = await supabaseAdmin
    .from('leads')
    .select('id, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing || existing.owner_id !== ownerId) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  const { error } = await supabaseAdmin.from('leads').delete().eq('id', id);
  if (error) {
    console.error('Lead delete error:', error);
    return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
