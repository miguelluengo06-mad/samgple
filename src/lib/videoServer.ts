import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { resolveLeadMailer, sendLeadMail } from '@/lib/leadMailer';
import { customerUpdateEmail, customerWelcomeEmail } from '@/lib/emailTemplates';
import { addNotice } from '@/lib/notices';
import { sendTelegram } from '@/lib/telegram';
import { creditsForItems, creditsForPackId } from '@/lib/videos';

/** Funciones del estudio de vídeos que solo corren en el servidor (usan la clave de servicio). */

export const missingTable = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message || ''));

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';

export async function getBalance(email: string): Promise<number> {
  const { data, error } = await supabaseAdmin.from('video_credit_ledger').select('delta').eq('customer_email', email.toLowerCase());
  if (error || !data) return 0;
  return data.reduce((a: number, r: { delta: number }) => a + r.delta, 0);
}

/** Total de vídeos que ha recibido el cliente (compras + ajustes a favor), para «te quedan N de M». */
export async function getGranted(email: string): Promise<number> {
  const { data } = await supabaseAdmin.from('video_credit_ledger').select('delta, reason').eq('customer_email', email.toLowerCase()).in('reason', ['purchase', 'manual']);
  return (data || []).filter((r: { delta: number }) => r.delta > 0).reduce((a: number, r: { delta: number }) => a + r.delta, 0);
}

export interface OrderLike {
  session_id: string;
  pack_id: string;
  pack_name: string;
  items?: { pack_id: string; qty: number }[];
}

export function creditsForOrder(order: OrderLike): number {
  const fromItems = order.items && order.items.length > 0 ? creditsForItems(order.items) : 0;
  return fromItems > 0 ? fromItems : creditsForPackId(order.pack_id);
}

/** Apunta los vídeos de una compra en el saldo. Idempotente: la misma compra solo cuenta una vez. */
export async function grantCredits(order: OrderLike, email: string): Promise<{ credits: number; isNew: boolean }> {
  const credits = creditsForOrder(order);
  if (credits <= 0) return { credits: 0, isNew: false };
  const { error } = await supabaseAdmin.from('video_credit_ledger').insert({
    customer_email: email.toLowerCase(),
    delta: credits,
    reason: 'purchase',
    ref: order.session_id,
    note: order.pack_name?.slice(0, 200) || null,
  });
  if (error?.code === '23505') return { credits, isNew: false }; // ya estaba apuntada
  if (error) {
    if (!missingTable(error)) console.error('Video credits: could not grant:', error.message);
    return { credits: 0, isNew: false };
  }
  return { credits, isNew: true };
}

/** Añade un aviso a la cuenta del cliente (el de su solicitud más reciente). Nunca lanza. */
export async function notifyCustomer(ownerId: string, email: string, title: string, body: string): Promise<void> {
  try {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, answers')
      .eq('owner_id', ownerId)
      .ilike('email', email.replace(/[\\%_]/g, (c) => `\\${c}`))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lead) return;
    const added = addNotice(lead.answers, { title, body });
    if (!added) return;
    await supabaseAdmin.from('leads').update({ answers: added.answers, updated_at: new Date().toISOString() }).eq('id', lead.id);
  } catch (err) {
    console.error('Video notice failed:', err);
  }
}

/** Correo al cliente con el mismo remitente que los avisos. Devuelve false si no hay correo configurado o falla. */
export async function emailCustomer(ownerId: string, to: string, mail: { subject: string; html: string; text: string }, key?: string): Promise<boolean> {
  try {
    const mailer = await resolveLeadMailer(supabaseAdmin, ownerId);
    if (!mailer) return false;
    await sendLeadMail({ ...mailer, to }, { ...mail, idempotencyKey: key });
    return true;
  } catch (err) {
    console.error('Customer email failed:', err);
    return false;
  }
}

/**
 * Tras un pago: apunta los vídeos, crea la cuenta del cliente si no existe y le manda el correo para crear su
 * contraseña (sin contraseñas por correo: el enlace lo lleva a elegir la suya). Nunca lanza.
 */
export async function provisionCustomer(
  ownerId: string,
  order: OrderLike,
  customer: { email?: string | null; name?: string | null },
  opts: { notify?: boolean } = {}
): Promise<void> {
  try {
    const email = (customer.email || '').trim().toLowerCase();
    if (!email) return;
    const { credits, isNew } = await grantCredits(order, email);
    if (!isNew || credits <= 0 || opts.notify === false) return;

    let isNewAccount = false;
    let url = `${siteUrl()}/auth`;
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: customer.name ? { data: { full_name: customer.name } } : undefined,
    });
    const hashed = (data as { properties?: { hashed_token?: string } } | null)?.properties?.hashed_token;
    if (!error && hashed) {
      isNewAccount = true;
      url = `${siteUrl()}/auth/confirm?token_hash=${encodeURIComponent(hashed)}&type=invite&next=${encodeURIComponent('/auth/set-password')}`;
    } else if (error && !/already (been )?registered|already exists/i.test(error.message)) {
      console.error('Video account: could not create the account:', error.message);
    }

    const sent = await emailCustomer(
      ownerId,
      email,
      customerWelcomeEmail({ name: customer.name, credits, packName: order.pack_name, url, isNew: isNewAccount }),
      `welcome-${order.session_id}`
    );

    await sendTelegram(
      `🎬 <b>${credits} ${credits === 1 ? 'vídeo asignado' : 'vídeos asignados'}</b>\n👤 ${(customer.name || email).replace(/[<>&]/g, '')}\n${isNewAccount ? '🔑 Cuenta creada' : '🔑 Ya tenía cuenta'}${sent ? ' · correo enviado' : ' · ⚠️ no se pudo enviar el correo (envíale el acceso desde su ficha)'}`
    );
  } catch (err) {
    console.error('provisionCustomer failed:', err);
  }
}

/** Aviso por cambio de estado de un pedido: a su cuenta y, si hace falta que actúe, también por correo. */
export async function announceVideoUpdate(ownerId: string, email: string, title: string, body: string, opts: { mail?: boolean } = {}): Promise<void> {
  await notifyCustomer(ownerId, email, title, body);
  if (opts.mail) {
    await emailCustomer(ownerId, email, customerUpdateEmail({ title, body, ctaLabel: 'Ver mi pedido', ctaUrl: `${siteUrl()}/portal` }));
  }
}
