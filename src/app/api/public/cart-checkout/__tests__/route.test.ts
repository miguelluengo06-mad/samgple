import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { state, createSession, db } = vi.hoisted(() => ({
  state: { stripe: true as boolean, openLead: null as any },
  createSession: vi.fn(),
  db: { inserts: [] as any[], updates: [] as any[] },
}));

vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        ilike: () => chain,
        gte: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => ({ data: state.openLead }),
        insert: (row: any) => {
          db.inserts.push(row);
          return { select: () => ({ single: async () => ({ data: { id: 'new-lead' } }) }) };
        },
        update: (patch: any) => ({
          eq: async (_c: string, id: string) => {
            db.updates.push({ id, patch });
            return { error: null };
          },
        }),
      };
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

import { POST } from '../route';

let ip = 0;
function post(body: any) {
  ip += 1;
  return POST(
    new NextRequest('http://localhost:3001/api/public/cart-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `10.2.0.${ip}` },
      body: JSON.stringify(body),
    })
  ) as Promise<Response>;
}

const CART = [{ id: 'ugc-escala', qty: 2 }, { id: 'video-suelto', qty: 1 }];

beforeEach(() => {
  state.stripe = true;
  state.openLead = null;
  db.inserts = [];
  db.updates = [];
  createSession.mockReset();
  createSession.mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_test_cart' });
});

describe('POST /api/public/cart-checkout', () => {
  it('opens one Stripe session with a line per pack and its quantity', async () => {
    const res = await post({ items: CART, email: 'Ana@Tienda.es' });
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe('https://checkout.stripe.com/c/pay/cs_test_cart');
    const params = createSession.mock.calls[0][0];
    expect(params.mode).toBe('payment');
    expect(params.customer_email).toBe('ana@tienda.es');
    expect(params.line_items.map((l: any) => [l.quantity, l.price_data.unit_amount, l.price_data.tax_behavior])).toEqual([
      [2, 39900, 'inclusive'],
      [1, 6000, 'inclusive'],
    ]);
    expect(params.metadata.pack_id).toBe('cart');
    expect(JSON.parse(params.metadata.cart_items)).toEqual([['ugc-escala', 2, 39900], ['video-suelto', 1, 6000]]);
    expect(params.cancel_url).toBe('http://localhost:3001/carrito?pago=cancelado');
    expect(params.invoice_creation.enabled).toBe(true);
  });

  it('takes prices from the catalog, never from the browser', async () => {
    await post({ items: [{ id: 'ugc-starter', qty: 1, price: 1, unit_amount: 1, cents: 1 }], email: 'a@b.es' });
    expect(createSession.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(24900);
  });

  it('saves the unpaid cart as a possible purchase and links the session to it', async () => {
    await post({ items: CART, email: 'ana@tienda.es', name: 'Ana', phone: '+34 600 000 000' });
    expect(db.inserts).toHaveLength(1);
    expect(db.inserts[0]).toMatchObject({ owner_id: 'owner-1', email: 'ana@tienda.es', name: 'Ana', source: 'cart', status: 'new' });
    expect(db.inserts[0].answers.cart.total_eur).toBe(858);
    expect(db.inserts[0].answers.cart.items[0]).toMatchObject({ pack_id: 'ugc-escala', qty: 2, total_eur: 798 });
    expect(createSession.mock.calls[0][0].metadata.lead_id).toBe('new-lead');
  });

  it('reuses the open cart of the same email instead of piling up duplicates', async () => {
    state.openLead = { id: 'open-lead' };
    await post({ items: CART, email: 'ana@tienda.es' });
    expect(db.inserts).toHaveLength(0);
    expect(db.updates[0].id).toBe('open-lead');
    expect(createSession.mock.calls[0][0].metadata.lead_id).toBe('open-lead');
  });

  it('400 for an empty or invalid cart and for a bad email', async () => {
    expect((await post({ items: [], email: 'a@b.es' })).status).toBe(400);
    expect((await post({ items: [{ id: 'bienvenida', qty: 1 }], email: 'a@b.es' })).status).toBe(400);
    expect((await post({ items: CART, email: 'no-es-un-email' })).status).toBe(400);
    expect((await post({ items: CART })).status).toBe(400);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('503 while Stripe is not connected', async () => {
    state.stripe = false;
    const res = await post({ items: CART, email: 'a@b.es' });
    expect(res.status).toBe(503);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('the payment still opens if saving the possible purchase fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    state.openLead = undefined;
    const original = db.inserts.push;
    db.inserts.push = () => { throw new Error('db down'); };
    const res = await post({ items: CART, email: 'a@b.es' });
    db.inserts.push = original;
    expect(res.status).toBe(200);
    expect(createSession.mock.calls[0][0].metadata.lead_id).toBeUndefined();
    spy.mockRestore();
  });
});
