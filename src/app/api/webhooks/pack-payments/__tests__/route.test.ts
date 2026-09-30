import { describe, it, expect, vi, beforeEach } from 'vitest';
import Stripe from 'stripe';

const { recordOrder, state } = vi.hoisted(() => ({ recordOrder: vi.fn(), state: { stripe: true } }));

vi.mock('@/lib/packCheckout', async (orig) => {
  const actual: any = await orig();
  return {
    ...actual,
    recordOrder,
    getAgencyStripe: vi.fn(async () => (state.stripe ? { stripe: new Stripe('sk_test_unit'), ownerId: 'owner-1', livemode: false, source: 'panel' } : null)),
  };
});

import { POST } from '../route';

const SECRET = 'whsec_unit_test_secret';
const stripe = new Stripe('sk_test_unit');

function signed(event: any, secret = SECRET) {
  const payload = JSON.stringify(event);
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request('http://localhost:3001/api/webhooks/pack-payments', {
    method: 'POST',
    headers: { 'stripe-signature': header, 'Content-Type': 'application/json' },
    body: payload,
  }) as any;
}

const completed = (over: any = {}) => ({
  id: 'evt_1',
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_1',
      object: 'checkout.session',
      status: 'complete',
      payment_status: 'paid',
      metadata: { pack_id: 'ugc-pro', pack_name: 'Anuncios UGC con IA · Pro' },
      ...over,
    },
  },
});

beforeEach(() => {
  process.env.STRIPE_PACKS_WEBHOOK_SECRET = SECRET;
  state.stripe = true;
  recordOrder.mockReset();
  recordOrder.mockResolvedValue({ leadId: 'l1', created: true, duplicate: false });
});

describe('POST /api/webhooks/pack-payments', () => {
  it('records the order when a pack payment completes', async () => {
    const res = await POST(signed(completed()));
    expect(res.status).toBe(200);
    expect(recordOrder).toHaveBeenCalledTimes(1);
    expect(recordOrder.mock.calls[0][0]).toBe('owner-1');
    expect((await res.json()).recorded).toBe(true);
  });

  it('rejects a bad signature without recording anything', async () => {
    const res = await POST(signed(completed(), 'whsec_wrong'));
    expect(res.status).toBe(400);
    expect(recordOrder).not.toHaveBeenCalled();
  });

  it('rejects requests with no signature header', async () => {
    const res = await POST(new Request('http://localhost:3001/api/webhooks/pack-payments', { method: 'POST', body: '{}' }) as any);
    expect(res.status).toBe(400);
  });

  it('503 when the webhook secret is not configured', async () => {
    delete process.env.STRIPE_PACKS_WEBHOOK_SECRET;
    expect((await POST(signed(completed()))).status).toBe(503);
  });

  it('ignores other event types and sessions that are not from a pack purchase', async () => {
    expect((await POST(signed({ ...completed(), type: 'customer.created' }))).status).toBe(200);
    expect((await POST(signed(completed({ metadata: {} })))).status).toBe(200);
    expect(recordOrder).not.toHaveBeenCalled();
  });

  it('does not record sessions that are not paid yet', async () => {
    await POST(signed(completed({ payment_status: 'unpaid' })));
    expect(recordOrder).not.toHaveBeenCalled();
  });

  it('answers 500 (so Stripe retries) if saving the order fails', async () => {
    recordOrder.mockRejectedValue(new Error('db down'));
    expect((await POST(signed(completed()))).status).toBe(500);
  });
});
