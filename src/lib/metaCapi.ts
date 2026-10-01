import { createHash } from 'crypto';
import type Stripe from 'stripe';
import { META_PIXEL_ID } from '@/lib/metaPixel';

/**
 * Meta Conversions API: envía la compra (Purchase) desde el servidor, además del píxel del navegador.
 * Así la venta llega a Meta aunque el cliente cierre la pestaña antes de volver a /gracias o use un bloqueador.
 *
 *  - Necesita META_CAPI_TOKEN (Meta → Administrador de eventos → tu píxel → Configuración → API de conversiones →
 *    Generar token de acceso). Sin él no hace nada. META_CAPI_TEST_CODE es opcional (pestaña "Probar eventos").
 *  - Solo se envía si el cliente aceptó las cookies de publicidad al empezar el pago (metadata.ad_consent).
 *  - Usa como event_id el id de la sesión de Stripe, el mismo que el píxel: Meta junta ambos y no cuenta la venta doble.
 */

const GRAPH_VERSION = 'v21.0';

/** Cookie técnica que escribe el banner: dos dígitos «<analytics><marketing>», p. ej. «11». */
export function hasMarketingConsent(cookieValue: string | undefined): boolean {
  return /^[01]1$/.test(cookieValue ?? '');
}

/** Datos de seguimiento que se guardan en la sesión de Stripe: solo con consentimiento de publicidad. */
export function trackingFromCookies(get: (name: string) => string | undefined): Record<string, string> {
  if (!hasMarketingConsent(get('cookie_consent'))) return {};
  const out: Record<string, string> = { ad_consent: '1' };
  const fbp = get('_fbp');
  const fbc = get('_fbc');
  if (fbp) out.fbp = fbp.slice(0, 200);
  if (fbc) out.fbc = fbc.slice(0, 200);
  return out;
}

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const norm = (v: string | null | undefined) => (v || '').trim().toLowerCase();

/** Teléfono en dígitos con prefijo de país, como pide Meta antes de aplicar el hash. */
const phoneDigits = (v: string | null | undefined) => (v || '').replace(/\D/g, '');

export function buildPurchaseEvent(session: Stripe.Checkout.Session, siteUrl: string) {
  const d = session.customer_details;
  const user: Record<string, unknown> = {};
  const email = norm(d?.email);
  const phone = phoneDigits(d?.phone);
  const country = norm(d?.address?.country);
  if (email) user.em = [sha256(email)];
  if (phone) user.ph = [sha256(phone)];
  if (country) user.country = [sha256(country)];
  if (session.metadata?.fbp) user.fbp = session.metadata.fbp;
  if (session.metadata?.fbc) user.fbc = session.metadata.fbc;

  return {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: session.id,
    action_source: 'website',
    event_source_url: `${siteUrl}/gracias`,
    user_data: user,
    custom_data: {
      value: (session.amount_total ?? 0) / 100,
      currency: (session.currency || 'eur').toUpperCase(),
      content_name: session.metadata?.pack_name || '',
      content_type: 'product',
    },
  };
}

/** Best-effort: nunca lanza ni retrasa el registro del pedido. Devuelve true si Meta aceptó el evento. */
export async function sendMetaPurchase(session: Stripe.Checkout.Session): Promise<boolean> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token || !META_PIXEL_ID) return false;
  if (!session.livemode || session.metadata?.ad_consent !== '1') return false;
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [buildPurchaseEvent(session, siteUrl)],
        ...(process.env.META_CAPI_TEST_CODE ? { test_event_code: process.env.META_CAPI_TEST_CODE } : {}),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error('Meta CAPI: Purchase rejected:', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (err) {
    console.error('Meta CAPI: could not send Purchase:', err);
    return false;
  }
}
