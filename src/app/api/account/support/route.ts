import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getSiteOwnerId } from '@/lib/agencyAccess';
import { resolveLeadMailer, sendLeadMail } from '@/lib/leadMailer';
import { esc } from '@/lib/emailTemplates';
import { checkRateLimit } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/account/support - a signed-in customer writes to customer support.
// The message is emailed to the agency (reply-to = the customer) and noted on the customer's latest request.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.email_confirmed_at) return NextResponse.json({ error: 'Confirma tu email antes de escribirnos.' }, { status: 403 });

  const limit = checkRateLimit(`account-support:${user.id}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: 'Has enviado muchos mensajes. Inténtalo más tarde.' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const subject = String(body.subject || '').trim().slice(0, 150);
  const message = String(body.message || '').trim().slice(0, 4000);
  if (subject.length < 3 || message.length < 10) {
    return NextResponse.json({ error: 'Escribe un asunto y un mensaje.' }, { status: 400 });
  }

  const ownerId = await getSiteOwnerId(supabaseAdmin);
  if (!ownerId) return NextResponse.json({ error: 'Soporte no disponible' }, { status: 503 });
  const mailer = await resolveLeadMailer(supabaseAdmin, ownerId);
  if (!mailer) return NextResponse.json({ error: 'El correo de atención al cliente no está configurado.' }, { status: 503 });

  const name = (user.user_metadata?.full_name as string | undefined) || user.email;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';

  // Latest request of this customer, so the message lands in their file in the panel
  const pattern = user.email.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, notes')
    .eq('owner_id', ownerId)
    .ilike('email', pattern)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  try {
    await sendLeadMail(mailer, {
      subject: `Soporte — ${subject} · ${name}`,
      replyTo: user.email,
      text: `${name} <${user.email}>\n\n${message}\n${lead ? `\nPanel: ${siteUrl}/portal/leads?open=${lead.id}` : ''}`,
      html: `<p><strong>${esc(name)}</strong> &lt;${esc(user.email)}&gt;</p><p style="white-space:pre-wrap">${esc(message)}</p>${
        lead ? `<p><a href="${esc(`${siteUrl}/portal/leads?open=${lead.id}`)}">Abrir su ficha en el panel</a></p>` : ''
      }<p style="color:#888;font-size:12px">Responde a este correo para contestar al cliente.</p>`,
    });
  } catch (err) {
    console.error('Account support: email failed:', err);
    return NextResponse.json({ error: 'No hemos podido enviar el mensaje. Inténtalo de nuevo.' }, { status: 502 });
  }

  if (lead) {
    const line = `[${new Date().toLocaleDateString('es-ES')}] Mensaje a soporte: ${subject}`;
    await supabaseAdmin
      .from('leads')
      .update({ notes: [lead.notes, line].filter(Boolean).join('\n'), updated_at: new Date().toISOString() })
      .eq('id', lead.id);
  }

  return NextResponse.json({ sent: true });
}
