import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSiteOwnerId } from '@/lib/agencyAccess';
import { confirmedCustomer } from '@/lib/routeAuth';
import { checkRateLimit } from '@/lib/validation';
import { sendTelegram } from '@/lib/telegram';
import { MAX_VIDEO_SECONDS, MAX_WORDS, validateVideoRequest } from '@/lib/videos';
import { getBalance, getGranted, missingTable } from '@/lib/videoServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REQUEST_COLUMNS =
  'id, avatar_id, avatar_name, avatar_image_url, script_notes, est_seconds, product, tone, cta, drive_url, status, script_text, client_feedback, delivery_url, created_at, updated_at';

// GET /api/account/videos → saldo, pedidos y catálogo de avatares del cliente
export async function GET(req: NextRequest) {
  const customer = await confirmedCustomer(req);
  if (!customer) return NextResponse.json({ balance: 0, granted: 0, requests: [], avatars: [], limits: { seconds: MAX_VIDEO_SECONDS, words: MAX_WORDS } });

  const ownerId = await getSiteOwnerId(supabaseAdmin);
  const [balance, granted, requests, avatars] = await Promise.all([
    getBalance(customer.email),
    getGranted(customer.email),
    supabaseAdmin.from('video_requests').select(REQUEST_COLUMNS).eq('customer_email', customer.email).order('created_at', { ascending: false }).limit(100),
    ownerId
      ? supabaseAdmin.from('avatars').select('id, name, style, gender, tags, image_url, preview_url').eq('owner_id', ownerId).eq('active', true).order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  return NextResponse.json({
    balance,
    granted: Math.max(granted, balance),
    requests: requests.data || [],
    avatars: avatars.data || [],
    unavailable: missingTable(requests.error) || missingTable(avatars.error),
    limits: { seconds: MAX_VIDEO_SECONDS, words: MAX_WORDS },
  });
}

// POST /api/account/videos → pedir un vídeo (gasta uno del saldo)
export async function POST(req: NextRequest) {
  const customer = await confirmedCustomer(req);
  if (!customer) return NextResponse.json({ error: 'Inicia sesión con tu email confirmado.' }, { status: 401 });
  if (!checkRateLimit(`video-request:${customer.id}`, 10, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'Has enviado muchos pedidos seguidos. Espera un poco.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = validateVideoRequest(body);
  if (parsed.ok === false) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.value;

  const ownerId = await getSiteOwnerId(supabaseAdmin);
  if (!ownerId) return NextResponse.json({ error: 'No disponible por ahora.' }, { status: 503 });

  const { data: avatar } = await supabaseAdmin
    .from('avatars')
    .select('id, name, image_url')
    .eq('id', v.avatarId)
    .eq('owner_id', ownerId)
    .eq('active', true)
    .maybeSingle();
  if (!avatar) return NextResponse.json({ error: 'Ese avatar ya no está disponible. Elige otro.' }, { status: 400 });

  const id = randomUUID();
  // Gastar el vídeo es atómico en la base de datos: dos pedidos a la vez no pueden pasarse del saldo
  const { data: spent, error: spendError } = await supabaseAdmin.rpc('consume_video_credit', { p_email: customer.email, p_ref: id });
  if (spendError) {
    if (!missingTable(spendError) && !/does not exist/i.test(spendError.message || '')) console.error('Video credit error:', spendError.message);
    return NextResponse.json({ error: 'No se pudo comprobar tu saldo. Inténtalo en un momento.' }, { status: 503 });
  }
  if (spent !== true) return NextResponse.json({ error: 'No te quedan vídeos disponibles.' }, { status: 402 });

  const { data: created, error: insertError } = await supabaseAdmin
    .from('video_requests')
    .insert({
      id,
      owner_id: ownerId,
      customer_email: customer.email,
      customer_name: customer.name || null,
      avatar_id: avatar.id,
      avatar_name: avatar.name,
      avatar_image_url: avatar.image_url,
      script_notes: v.scriptNotes,
      est_seconds: parsed.seconds,
      product: v.product || null,
      tone: v.tone || null,
      cta: v.cta || null,
      drive_url: v.driveUrl || null,
    })
    .select(REQUEST_COLUMNS)
    .single();

  if (insertError || !created) {
    // El pedido no se guardó: el vídeo vuelve al saldo
    await supabaseAdmin.from('video_credit_ledger').insert({ customer_email: customer.email, delta: 1, reason: 'refund', ref: id, note: 'Pedido no guardado' });
    console.error('Video request insert error:', insertError?.message);
    return NextResponse.json({ error: 'No se pudo guardar el pedido. No se ha gastado ningún vídeo.' }, { status: 500 });
  }

  const esc = (t: string) => t.replace(/[<>&]/g, '');
  const siteBase = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  await sendTelegram(
    `🎬 <b>Nuevo pedido de vídeo</b>\n👤 ${esc(customer.name || customer.email)}\n🧑 Avatar: ${esc(avatar.name)}\n⏱ ≈ ${parsed.seconds} s${v.tone ? ` · ${esc(v.tone)}` : ''}\n💬 ${esc(v.scriptNotes.slice(0, 200))}`,
    { label: 'Abrir pedidos', url: `${siteBase}/portal/videos` }
  );

  return NextResponse.json({ request: created, balance: await getBalance(customer.email) });
}
