import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { decryptApiKey } from '@/lib/encryption';
import { getSiteOwnerId } from '@/lib/agencyAccess';
import { resolveLeadMailer, sendLeadMail } from '@/lib/leadMailer';
import { purchaseEmail } from '@/lib/emailTemplates';
import { isValidUUID } from '@/lib/validation';
import { sendMetaPurchase } from '@/lib/metaCapi';
import { purchaseAlertText, sendTelegram } from '@/lib/telegram';
import { VAT_LABEL, type PurchasablePack } from '@/lib/packs';
import { cartLines, cartSummary, cartTotalCents, compactItems, parseCompactItems, type CartItem, type OrderItem } from '@/lib/cart';

/**
 * Cobro de los packs con Stripe Checkout.
 *
 *  - Se cobra en la cuenta de Stripe de la agencia: la clave que el propietario guarda en el panel
 *    (Ajustes → Conexiones → Stripe). Como alternativa, la variable STRIPE_PACKS_SECRET_KEY.
 *  - Los precios llevan IVA incluido (tax_behavior: 'inclusive'): el cliente paga exactamente la cifra de la web.
 *  - Pagos únicos → Checkout en modo "payment" con factura automática; planes mensuales → "subscription".
 *  - Cada compra se registra como una solicitud ganada en el panel (Solicitudes), sin tocar la base de datos.
 */

export interface AgencyStripe {
  stripe: Stripe;
  ownerId: string;
  livemode: boolean;
  source: 'panel' | 'env';
}

/** Stripe de la agencia, o null si todavía no hay ninguna clave configurada. */
export async function getAgencyStripe(): Promise<AgencyStripe | null> {
  const ownerId = await getSiteOwnerId(supabaseAdmin);
  if (!ownerId) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('agency_stripe_key_encrypted')
    .eq('id', ownerId)
    .maybeSingle();

  let key: string | null = null;
  let source: 'panel' | 'env' = 'panel';
  try {
    key = decryptApiKey(profile?.agency_stripe_key_encrypted) as string | null;
  } catch (err) {
    console.error('Pack checkout: could not decrypt the agency Stripe key:', err);
  }
  if (!key && process.env.STRIPE_PACKS_SECRET_KEY) {
    key = process.env.STRIPE_PACKS_SECRET_KEY;
    source = 'env';
  }
  if (!key) return null;

  return { stripe: new Stripe(key), ownerId, livemode: key.startsWith('sk_live_'), source };
}

/** Solo rutas internas ("/landing", "/#precios"): nunca una URL externa. */
export function safeReturnPath(input: unknown, fallback = '/'): string {
  if (typeof input !== 'string') return fallback;
  if (!input.startsWith('/') || input.startsWith('//') || input.includes('\\')) return fallback;
  return input.slice(0, 200);
}

export interface CheckoutContext {
  siteUrl: string;
  /** Ruta a la que vuelve el cliente si cancela */
  returnPath: string;
  /** Solicitud creada por el formulario del Pack de Bienvenida */
  leadId?: string;
  /** Consentimiento de publicidad y cookies de Meta del cliente (ver metaCapi.ts), para enviar la compra a Meta */
  tracking?: Record<string, string>;
}

/** Texto bajo el botón de pago: IVA incluido, compromiso (si lo hay) y enlaces a términos y privacidad. */
function checkoutNotes(siteUrl: string, commitment?: string): string {
  return [
    [VAT_LABEL, commitment].filter(Boolean).join(' · '),
    `Al pagar aceptas los [términos y condiciones](${siteUrl}/terminos) y la [política de privacidad](${siteUrl}/privacidad).`,
  ].join('\n\n');
}

/** Parámetros de la sesión de Stripe Checkout para un pack (precio con IVA incluido). */
export function buildCheckoutParams(pack: PurchasablePack, ctx: CheckoutContext): Stripe.Checkout.SessionCreateParams {
  const metadata: Record<string, string> = {
    pack_id: pack.id,
    pack_name: pack.name.slice(0, 200),
    price_eur_incl_vat: String(pack.price),
  };
  if (ctx.leadId) metadata.lead_id = ctx.leadId;
  Object.assign(metadata, ctx.tracking);

  const cancelSep = ctx.returnPath.includes('?') ? '&' : '?';
  const hashIndex = ctx.returnPath.indexOf('#');
  const cancelUrl =
    hashIndex === -1
      ? `${ctx.siteUrl}${ctx.returnPath}${cancelSep}pago=cancelado`
      : `${ctx.siteUrl}${ctx.returnPath.slice(0, hashIndex)}${cancelSep}pago=cancelado${ctx.returnPath.slice(hashIndex)}`;

  const notes = checkoutNotes(ctx.siteUrl, pack.commitment);

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: pack.mode,
    locale: 'es',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: pack.cents,
          tax_behavior: 'inclusive', // el precio de la web ya lleva el IVA dentro
          product_data: { name: pack.name, description: pack.description },
          ...(pack.mode === 'subscription' ? { recurring: { interval: 'month' as const } } : {}),
        },
      },
    ],
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true }, // el cliente puede añadir el NIF de su empresa para la factura
    phone_number_collection: { enabled: true },
    allow_promotion_codes: true, // p. ej. el descuento del Pack de Bienvenida al contratar otro pack
    client_reference_id: ctx.leadId && isValidUUID(ctx.leadId) ? ctx.leadId : undefined,
    metadata,
    custom_text: { submit: { message: notes } },
    success_url: `${ctx.siteUrl}/gracias?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
  };

  if (pack.mode === 'payment') {
    params.customer_creation = 'always';
    params.invoice_creation = {
      enabled: true, // factura con el IVA desglosado en cada pago único
      invoice_data: { description: pack.name, metadata },
    };
  } else {
    params.subscription_data = { description: pack.name, metadata };
  }

  // Stripe Tax (opcional): solo si está activado y configurado en la cuenta de Stripe
  if (process.env.STRIPE_AUTOMATIC_TAX === 'true') {
    params.automatic_tax = { enabled: true };
  }

  return params;
}

export interface CartCheckoutContext extends CheckoutContext {
  /** Email que dejó en /carrito: Stripe lo rellena en el pago */
  email?: string;
}

/**
 * Sesión de Stripe Checkout para un carrito: una línea por pack con su cantidad, todo con IVA incluido.
 * Lo que se compró queda guardado en metadata.cart_items para registrarlo después en el pedido.
 * Lanza si el carrito queda vacío (hay que validarlo antes con sanitizeCart).
 */
export function buildCartCheckoutParams(items: CartItem[], ctx: CartCheckoutContext): Stripe.Checkout.SessionCreateParams {
  const lines = cartLines(items);
  if (lines.length === 0) throw new Error('Empty cart');

  const summary = cartSummary(lines);
  const metadata: Record<string, string> = {
    pack_id: lines.length === 1 ? lines[0].pack.id : 'cart',
    pack_name: summary.slice(0, 200),
    price_eur_incl_vat: String(cartTotalCents(items) / 100),
    cart_items: compactItems(lines),
  };
  if (ctx.leadId) metadata.lead_id = ctx.leadId;
  Object.assign(metadata, ctx.tracking);

  // Parte común (idioma, facturación, NIF, teléfono, urls…): la misma que un pack suelto
  const base = buildCheckoutParams(lines[0].pack, ctx);

  return {
    ...base,
    line_items: lines.map(({ pack, qty }) => ({
      quantity: qty,
      price_data: {
        currency: 'eur',
        unit_amount: pack.cents,
        tax_behavior: 'inclusive' as const,
        product_data: { name: pack.name, description: pack.description, metadata: { pack_id: pack.id } },
      },
    })),
    metadata,
    custom_text: { submit: { message: checkoutNotes(ctx.siteUrl) } },
    invoice_creation: { enabled: true, invoice_data: { description: summary.slice(0, 300), metadata } },
    ...(ctx.email ? { customer_email: ctx.email } : {}),
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Registro del pedido
 * ────────────────────────────────────────────────────────────────────────── */

export interface OrderRecord {
  session_id: string;
  pack_id: string;
  pack_name: string;
  amount_eur: number;
  currency: string;
  mode: string;
  paid_at: string;
  livemode: boolean;
  customer_id?: string | null;
  subscription_id?: string | null;
  payment_intent_id?: string | null;
  invoice_id?: string | null;
  /** Qué se compró: un elemento por pack, con cantidad y precio cobrado */
  items: OrderItem[];
}

/** ¿La sesión está pagada? (suscripciones: la primera factura pagada) */
export function isPaidSession(session: Stripe.Checkout.Session): boolean {
  return session.status === 'complete' && (session.payment_status === 'paid' || session.payment_status === 'no_payment_required');
}

const idOf = (v: unknown): string | null => (typeof v === 'string' ? v : v && typeof v === 'object' && 'id' in v ? String((v as { id: string }).id) : null);

/** Packs comprados: los de metadata.cart_items; si falta (compra de un solo pack), uno con el importe de la sesión. */
function itemsFromSession(session: Stripe.Checkout.Session): OrderItem[] {
  const fromCart = parseCompactItems(session.metadata?.cart_items);
  if (fromCart.length > 0) return fromCart;
  const amount = (session.amount_total ?? 0) / 100;
  return [{ pack_id: session.metadata?.pack_id || '', name: session.metadata?.pack_name || '', qty: 1, unit_eur: amount, total_eur: amount }];
}

export function orderFromSession(session: Stripe.Checkout.Session): OrderRecord {
  return {
    session_id: session.id,
    pack_id: session.metadata?.pack_id || '',
    pack_name: session.metadata?.pack_name || '',
    amount_eur: (session.amount_total ?? 0) / 100,
    currency: session.currency || 'eur',
    mode: session.mode,
    paid_at: new Date().toISOString(),
    livemode: session.livemode,
    customer_id: idOf(session.customer),
    subscription_id: idOf(session.subscription),
    payment_intent_id: idOf(session.payment_intent),
    invoice_id: idOf(session.invoice),
    items: itemsFromSession(session),
  };
}

export interface RecordResult {
  leadId: string;
  created: boolean;
  /** true si ya estaba registrado (webhook + página de gracias pueden llegar los dos) */
  duplicate: boolean;
}

/**
 * Guarda una compra pagada como solicitud ganada en el panel. Es idempotente: el mismo pago
 * (session_id) no se registra dos veces aunque llegue por el webhook y por la página de gracias.
 */
export async function recordOrder(ownerId: string, session: Stripe.Checkout.Session): Promise<RecordResult | null> {
  if (!isPaidSession(session)) return null;

  const { data: existing } = await supabaseAdmin
    .from('leads')
    .select('id')
    .eq('owner_id', ownerId)
    .eq('answers->order->>session_id', session.id)
    .maybeSingle();
  if (existing) return { leadId: existing.id, created: false, duplicate: true };

  const order = orderFromSession(session);
  const paidNote = `Pagado ${order.amount_eur.toLocaleString('es-ES', { minimumFractionDigits: 0 })} € (${VAT_LABEL}) · ${order.pack_name} · Stripe ${session.id}`;
  const details = session.customer_details;

  const leadId = session.metadata?.lead_id;
  if (leadId && isValidUUID(leadId)) {
    const { data: lead } = await supabaseAdmin
      .from('leads')
      .select('id, answers, notes, email')
      .eq('id', leadId)
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (lead) {
      const { error } = await supabaseAdmin
        .from('leads')
        .update({
          status: 'won',
          email: lead.email || details?.email || '',
          answers: { ...(lead.answers || {}), order },
          notes: [lead.notes, paidNote].filter(Boolean).join('\n'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', lead.id);
      if (error) throw new Error(`Could not update lead: ${error.message}`);
      await notifyPurchase(ownerId, order, details, lead.id);
      await sendMetaPurchase(session);
      return { leadId: lead.id, created: false, duplicate: false };
    }
  }

  // Compra directa desde la web (sin formulario previo): la solicitud se crea con los datos de Stripe.
  const { data: created, error } = await supabaseAdmin
    .from('leads')
    .insert({
      owner_id: ownerId,
      name: details?.name || details?.email || 'Cliente Stripe',
      email: details?.email || '',
      phone: details?.phone || null,
      company: null,
      message: `Compra: ${order.pack_name} (${order.amount_eur} € ${VAT_LABEL})`,
      source: 'stripe',
      kind: 'proposal',
      status: 'won',
      notes: paidNote,
      answers: { order },
    })
    .select('id')
    .single();
  if (error || !created) throw new Error(`Could not create lead: ${error?.message}`);

  await notifyPurchase(ownerId, order, details, created.id);
  await sendMetaPurchase(session);
  return { leadId: created.id, created: true, duplicate: false };
}

export type OrderEventKey = 'payment_intent_id' | 'subscription_id';

/**
 * Anota en la solicitud de una compra un evento posterior (reembolso, cobro fallido…).
 * Se localiza por el id de Stripe guardado en el pedido; si no es una compra de packs, no hace nada.
 * Idempotente: la misma nota (con su id de evento) no se añade dos veces.
 */
export async function noteOrderEvent(
  ownerId: string,
  key: OrderEventKey,
  stripeId: string,
  eventId: string,
  note: string,
  orderPatch?: Record<string, unknown>
): Promise<boolean> {
  const { data: lead } = await supabaseAdmin
    .from('leads')
    .select('id, notes, answers')
    .eq('owner_id', ownerId)
    .eq(`answers->order->>${key}`, stripeId)
    .maybeSingle();
  if (!lead) return false;

  const line = `${note} · ${eventId}`;
  if ((lead.notes || '').includes(eventId)) return false;

  const { error } = await supabaseAdmin
    .from('leads')
    .update({
      notes: [lead.notes, line].filter(Boolean).join('\n'),
      ...(orderPatch ? { answers: { ...(lead.answers || {}), order: { ...(lead.answers?.order || {}), ...orderPatch } } } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', lead.id);
  if (error) throw new Error(`Could not update lead: ${error.message}`);
  return true;
}

/** Aviso por email de una compra (best-effort: la compra ya está guardada). */
async function notifyPurchase(
  ownerId: string,
  order: OrderRecord,
  details: Stripe.Checkout.Session.CustomerDetails | null | undefined,
  leadId: string
) {
  await sendTelegram(
    purchaseAlertText({ packName: order.pack_name, amountEur: order.amount_eur, customer: details?.name, email: details?.email, phone: details?.phone, livemode: order.livemode }),
    { label: 'Abrir en el panel', url: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ''}/portal/leads?open=${leadId}` }
  );
  try {
    const mailer = await resolveLeadMailer(supabaseAdmin, ownerId);
    if (!mailer) return;
    const { data: owner } = await supabaseAdmin.from('profiles').select('business_name').eq('id', ownerId).maybeSingle();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    const stripeRef = order.payment_intent_id || order.subscription_id || order.invoice_id;
    const stripePath = order.payment_intent_id ? 'payments' : order.subscription_id ? 'subscriptions' : 'invoices';
    const mail = purchaseEmail(
      {
        packName: order.pack_name,
        amountEur: order.amount_eur,
        monthly: order.mode === 'subscription',
        livemode: order.livemode,
        customerName: details?.name || null,
        customerEmail: details?.email || null,
        customerPhone: details?.phone || null,
        stripeUrl: stripeRef ? `https://dashboard.stripe.com/${order.livemode ? '' : 'test/'}${stripePath}/${stripeRef}` : null,
      },
      { brand: owner?.business_name || undefined, panelUrl: `${siteUrl}/portal/leads?open=${leadId}` }
    );
    await sendLeadMail(mailer, { ...mail, replyTo: details?.email || undefined, idempotencyKey: `order-${order.session_id}` });
  } catch (err) {
    console.error('Pack checkout: purchase saved but the email notification failed:', err);
  }
}
