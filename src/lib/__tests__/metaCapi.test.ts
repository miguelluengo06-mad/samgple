import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { buildPurchaseEvent, hasMarketingConsent, sendMetaPurchase, trackingFromCookies } from '../metaCapi';

const sha = (v: string) => createHash('sha256').update(v).digest('hex');

const session = {
  id: 'cs_live_abc',
  amount_total: 25000,
  currency: 'eur',
  livemode: true,
  metadata: { pack_name: 'Anuncios UGC con IA · Escala', ad_consent: '1', fbp: 'fb.1.1.2', fbc: 'fb.1.1.3' },
  customer_details: { email: ' Ana@Example.com ', phone: '+34 600 000 000', address: { country: 'ES' } },
} as unknown as Stripe.Checkout.Session;

describe('metaCapi', () => {
  it('only counts marketing consent from the cookie', () => {
    expect(hasMarketingConsent('11')).toBe(true);
    expect(hasMarketingConsent('01')).toBe(true);
    expect(hasMarketingConsent('10')).toBe(false);
    expect(hasMarketingConsent(undefined)).toBe(false);
  });

  it('stores tracking data only with consent', () => {
    const cookies: Record<string, string> = { cookie_consent: '11', _fbp: 'fb.1.1.2', _fbc: 'fb.1.1.3' };
    expect(trackingFromCookies((n) => cookies[n])).toEqual({ ad_consent: '1', fbp: 'fb.1.1.2', fbc: 'fb.1.1.3' });
    expect(trackingFromCookies((n) => ({ ...cookies, cookie_consent: '10' })[n])).toEqual({});
    expect(trackingFromCookies(() => undefined)).toEqual({});
  });

  it('builds a Purchase with the Stripe session as event_id and hashed customer data', () => {
    const e = buildPurchaseEvent(session, 'https://example.com');
    expect(e).toMatchObject({ event_name: 'Purchase', event_id: 'cs_live_abc', action_source: 'website', event_source_url: 'https://example.com/gracias' });
    expect(e.custom_data).toEqual({ value: 250, currency: 'EUR', content_name: 'Anuncios UGC con IA · Escala', content_type: 'product' });
    expect(e.user_data).toEqual({ em: [sha('ana@example.com')], ph: [sha('34600000000')], country: [sha('es')], fbp: 'fb.1.1.2', fbc: 'fb.1.1.3' });
  });

  it('sends nothing without token, in test mode or without consent', async () => {
    delete process.env.META_CAPI_TOKEN;
    expect(await sendMetaPurchase(session)).toBe(false);
    process.env.META_CAPI_TOKEN = 'x';
    expect(await sendMetaPurchase({ ...session, livemode: false } as Stripe.Checkout.Session)).toBe(false);
    expect(await sendMetaPurchase({ ...session, metadata: {} } as unknown as Stripe.Checkout.Session)).toBe(false);
    delete process.env.META_CAPI_TOKEN;
  });
});
