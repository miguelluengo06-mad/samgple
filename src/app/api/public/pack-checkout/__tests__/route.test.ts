import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { state, createSession } = vi.hoisted(() => ({
  state: { stripe: true as boolean, lead: { id: '', answers: { pack: { id: 'welcome' } } } as any, soldOut: false },
  createSession: vi.fn(),
}));

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: () => {
      const chain: any = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: state.lead }) };
      return chain;
    },
  },
}));

vi.mock('@/lib/packCheckout', async (orig) => {
  const actual: any = await orig();
  return {
    ...actual,
    getAgencyStripe: vi.fn(async () =>
      state.stripe ? { stripe: { checkout: { sessions: { create: createSession } } }, ownerId: 'owner-1', livemode: false, source: 'panel' } : null
    ),
  };
});

vi.mock('@/lib/packs', async (orig) => {
  const actual: any = await orig();
  return { ...actual, welcomeSpots: () => ({ ...actual.welcomeSpots(), soldOut: state.soldOut }) };
});

import { POST } from '../route';

let ip = 0;
function post(body: any) {
  ip += 1;
  // NextRequest (not a plain Request): the route reads req.nextUrl to build the return URLs
  return POST(
    new NextRequest('http://localhost:3001/api/public/pack-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.1.0.${ip}` },
      body: JSON.stringify(body),
    })
  ) as Promise<Response>;
}

const LEAD = '11111111-1111-4111-8111-111111111111';

beforeEach(() => {
  state.stripe = true;
  state.soldOut = false;
  state.lead = { id: LEAD, answers: { pack: { id: 'welcome' } } };
  createSession.mockReset();
  createSession.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
});

describe('POST /api/public/pack-checkout', () => {
  it('opens a Stripe Checkout session and returns its URL', async () => {
    const res = await post({ packId: 'ugc-escala' });
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe('https://checkout.stripe.com/c/pay/cs_test_1');
    const params = createSession.mock.calls[0][0];
    expect(params.mode).toBe('payment');
    expect(params.line_items[0].price_data.unit_amount).toBe(25000);
  });

  it('takes the price from the catalog, never from the browser', async () => {
    await post({ packId: 'ugc-starter', price: 1, amount: 1, unit_amount: 1, cents: 1 });
    expect(createSession.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(13000);
  });

  it('404 for a pack that does not exist', async () => {
    expect((await post({ packId: 'nope' })).status).toBe(404);
    expect((await post({})).status).toBe(404);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('503 with a friendly message while Stripe is not connected', async () => {
    state.stripe = false;
    const res = await post({ packId: 'ugc-escala' });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('todavía no están activados');
  });

  it('welcome pack needs the short form first', async () => {
    expect((await post({ packId: 'bienvenida' })).status).toBe(400);
    expect((await post({ packId: 'bienvenida', leadId: 'not-a-uuid' })).status).toBe(400);
    state.lead = null;
    expect((await post({ packId: 'bienvenida', leadId: LEAD })).status).toBe(404);
    state.lead = { id: LEAD, answers: { pack: { id: 'other' } } };
    expect((await post({ packId: 'bienvenida', leadId: LEAD })).status).toBe(404);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('welcome pack with its form: charges 20 € and links the payment to that lead', async () => {
    const res = await post({ packId: 'bienvenida', leadId: LEAD });
    expect(res.status).toBe(200);
    const params = createSession.mock.calls[0][0];
    expect(params.line_items[0].price_data.unit_amount).toBe(2000);
    expect(params.metadata.lead_id).toBe(LEAD);
    expect(params.cancel_url).toContain('/landing?pago=cancelado#pack');
  });

  it('welcome pack sold out: 409, no session', async () => {
    state.soldOut = true;
    expect((await post({ packId: 'bienvenida', leadId: LEAD })).status).toBe(409);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('does not allow an external returnPath (open redirect)', async () => {
    await post({ packId: 'ugc-escala', returnPath: 'https://evil.example/phish' });
    const cancel = createSession.mock.calls[0][0].cancel_url as string;
    expect(cancel.startsWith('http://localhost:3001/')).toBe(true);
    expect(cancel).not.toContain('evil.example');
  });

  it('502 with a generic message if Stripe fails (no internals leaked)', async () => {
    createSession.mockRejectedValue(new Error('Invalid API Key provided: sk_test_secret'));
    const res = await post({ packId: 'ugc-escala' });
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('sk_test');
  });
});
