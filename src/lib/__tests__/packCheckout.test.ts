import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Fake supabase: a tiny in-memory "leads" table with the query shapes recordOrder uses ──────────────

const { db, mockSupabaseAdmin, sendMail } = vi.hoisted(() => {
  const db = {
    leads: [] as any[],
    updates: [] as any[],
    inserts: [] as any[],
  };

  const mockSupabaseAdmin = {
    from: vi.fn((table: string) => {
      if (table !== 'leads') {
        const chain: any = { select: () => chain, eq: () => chain, order: () => chain, limit: () => chain, maybeSingle: async () => ({ data: null }) };
        return chain;
      }
      const filters: Record<string, any> = {};
      const chain: any = {
        select: () => chain,
        eq: (col: string, val: any) => {
          filters[col] = val;
          return chain;
        },
        maybeSingle: async () => {
          const row = db.leads.find((l) =>
            Object.entries(filters).every(([col, val]) =>
              col === 'answers->order->>session_id' ? l.answers?.order?.session_id === val : l[col] === val
            )
          );
          return { data: row ?? null };
        },
        update: (patch: any) => {
          const upd: any = {
            eq: (col: string, val: any) => {
              db.updates.push({ col, val, patch });
              const row = db.leads.find((l) => l[col] === val);
              if (row) Object.assign(row, patch);
              return Promise.resolve({ error: null });
            },
          };
          return upd;
        },
        insert: (row: any) => {
          const created = { id: '99999999-9999-4999-8999-999999999999', ...row };
          db.inserts.push(created);
          db.leads.push(created);
          return { select: () => ({ single: async () => ({ data: { id: created.id }, error: null }) }) };
        },
      };
      return chain;
    }),
  };
  return { db, mockSupabaseAdmin, sendMail: vi.fn().mockResolvedValue({}) };
});

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: mockSupabaseAdmin }));
vi.mock('@/lib/leadMailer', () => ({
  resolveLeadMailer: vi.fn(async () => ({ provider: 'smtp', transport: {}, from: 'a@b.es', to: 'owner@b.es', origin: 'panel' })),
  sendLeadMail: vi.fn(async (_mailer: unknown, msg: unknown) => sendMail(msg)),
}));
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }));

import {
  buildCheckoutParams,
  isPaidSession,
  orderFromSession,
  recordOrder,
  safeReturnPath,
} from '../packCheckout';
import { SINGLE_VIDEO, getPurchasable, toPurchasable } from '../packs';

const LEAD = '11111111-1111-4111-8111-111111111111';
const OWNER = 'owner-1';
const ctx = { siteUrl: 'https://agencia.es', returnPath: '/landing#pack' };

beforeEach(() => {
  db.leads = [];
  db.updates = [];
  db.inserts = [];
  sendMail.mockClear();
  delete process.env.STRIPE_AUTOMATIC_TAX;
});

afterEach(() => vi.restoreAllMocks());

describe('buildCheckoutParams', () => {
  it('one-off pack: charges the exact price with VAT included, in euros, with invoice', () => {
    const p = buildCheckoutParams(getPurchasable('ugc-escala')!, ctx);
    expect(p.mode).toBe('payment');
    expect(p.locale).toBe('es');
    const price = (p.line_items![0] as any).price_data;
    expect(price.currency).toBe('eur');
    expect(price.unit_amount).toBe(49000);
    expect(price.tax_behavior).toBe('inclusive');
    expect(price.recurring).toBeUndefined();
    expect(price.product_data.name).toBe('Anuncios UGC con IA · Escala');
    expect(p.invoice_creation?.enabled).toBe(true);
    expect(p.customer_creation).toBe('always');
    expect(p.tax_id_collection?.enabled).toBe(true);
    expect(p.billing_address_collection).toBe('required');
    expect(p.subscription_data).toBeUndefined();
    expect(p.metadata).toMatchObject({ pack_id: 'ugc-escala', price_eur_incl_vat: '490' });
  });

  it('monthly plan: subscription with a monthly recurring price', () => {
    const p = buildCheckoutParams(toPurchasable({ ...SINGLE_VIDEO, id: 'plan-mensual', name: 'Plan mensual', price: 690, unit: 'month' }, 'Plan mensual'), ctx);
    expect(p.mode).toBe('subscription');
    const price = (p.line_items![0] as any).price_data;
    expect(price.unit_amount).toBe(69000);
    expect(price.recurring).toEqual({ interval: 'month' });
    expect(price.tax_behavior).toBe('inclusive');
    expect(p.subscription_data?.metadata?.pack_id).toBe('plan-mensual');
    expect(p.invoice_creation).toBeUndefined(); // subscriptions invoice on their own
    expect(p.custom_text?.submit?.message).toContain('IVA incluido');
  });

  it('welcome pack: 30 €, keeps the lead id, comes back to the landing when cancelled', () => {
    const p = buildCheckoutParams(getPurchasable('bienvenida')!, { ...ctx, leadId: LEAD });
    expect((p.line_items![0] as any).price_data.unit_amount).toBe(3000);
    expect(p.metadata?.lead_id).toBe(LEAD);
    expect(p.client_reference_id).toBe(LEAD);
    expect(p.success_url).toBe('https://agencia.es/gracias?session_id={CHECKOUT_SESSION_ID}');
    expect(p.cancel_url).toBe('https://agencia.es/landing?pago=cancelado#pack'); // query goes before the hash
  });

  it('every purchasable pack is charged exactly its listed price (cents)', () => {
    for (const id of ['bienvenida', 'ugc-starter', 'ugc-volumen', 'influencer-dominio', 'replica-escala-total', 'video-suelto']) {
      const pack = getPurchasable(id)!;
      const p = buildCheckoutParams(pack, ctx);
      expect((p.line_items![0] as any).price_data.unit_amount).toBe(pack.price * 100);
    }
  });

  it('Stripe Tax is off unless STRIPE_AUTOMATIC_TAX=true', () => {
    expect(buildCheckoutParams(getPurchasable('ugc-starter')!, ctx).automatic_tax).toBeUndefined();
    process.env.STRIPE_AUTOMATIC_TAX = 'true';
    expect(buildCheckoutParams(getPurchasable('ugc-starter')!, ctx).automatic_tax).toEqual({ enabled: true });
  });
});

describe('safeReturnPath', () => {
  it('only allows internal paths', () => {
    expect(safeReturnPath('/landing#pack')).toBe('/landing#pack');
    expect(safeReturnPath('/#precios')).toBe('/#precios');
    expect(safeReturnPath('https://evil.example')).toBe('/');
    expect(safeReturnPath('//evil.example')).toBe('/');
    expect(safeReturnPath('/\\evil.example')).toBe('/');
    expect(safeReturnPath(undefined, '/landing')).toBe('/landing');
  });
});

const session = (over: any = {}): any => ({
  id: 'cs_test_abc123',
  status: 'complete',
  payment_status: 'paid',
  mode: 'payment',
  currency: 'eur',
  amount_total: 3000,
  livemode: false,
  customer: 'cus_1',
  subscription: null,
  payment_intent: 'pi_1',
  invoice: 'in_1',
  metadata: { pack_id: 'bienvenida', pack_name: 'Pack de Bienvenida', lead_id: LEAD },
  customer_details: { name: 'Ana Pérez', email: 'ana@tienda.es', phone: '+34600000000' },
  ...over,
});

describe('isPaidSession / orderFromSession', () => {
  it('needs a completed, paid session', () => {
    expect(isPaidSession(session())).toBe(true);
    expect(isPaidSession(session({ payment_status: 'unpaid' }))).toBe(false);
    expect(isPaidSession(session({ status: 'open' }))).toBe(false);
    expect(isPaidSession(session({ payment_status: 'no_payment_required' }))).toBe(true); // 100 % promo code
  });

  it('turns the session into an order with euros, ids and the pack', () => {
    expect(orderFromSession(session({ subscription: { id: 'sub_9' }, mode: 'subscription' }))).toMatchObject({
      session_id: 'cs_test_abc123',
      pack_id: 'bienvenida',
      amount_eur: 30,
      currency: 'eur',
      mode: 'subscription',
      customer_id: 'cus_1',
      subscription_id: 'sub_9',
      invoice_id: 'in_1',
      livemode: false,
    });
  });
});

describe('recordOrder', () => {
  it('ignores sessions that are not paid', async () => {
    expect(await recordOrder(OWNER, session({ payment_status: 'unpaid' }))).toBeNull();
    expect(db.updates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
  });

  it('marks the pack form lead as won, stores the order and adds a note', async () => {
    db.leads.push({ id: LEAD, owner_id: OWNER, status: 'new', email: '', notes: null, answers: { pack: { id: 'welcome', website: 'a.es', product: 'x', runs_ads: 'No' } } });
    const res = await recordOrder(OWNER, session());
    expect(res).toEqual({ leadId: LEAD, created: false, duplicate: false });
    const lead = db.leads[0];
    expect(lead.status).toBe('won');
    expect(lead.email).toBe('ana@tienda.es'); // Stripe filled the missing email
    expect(lead.answers.pack.product).toBe('x'); // the form answers are kept
    expect(lead.answers.order).toMatchObject({ session_id: 'cs_test_abc123', amount_eur: 30, pack_id: 'bienvenida' });
    expect(lead.notes).toContain('Pagado 30 € (IVA incluido)');
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0].subject).toContain('Nueva compra');
  });

  it('is idempotent: the same payment arriving twice (webhook + thank-you page) is recorded once', async () => {
    db.leads.push({ id: LEAD, owner_id: OWNER, status: 'new', email: '', notes: null, answers: {} });
    await recordOrder(OWNER, session());
    const again = await recordOrder(OWNER, session());
    expect(again).toEqual({ leadId: LEAD, created: false, duplicate: true });
    expect(db.updates).toHaveLength(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it("never touches a lead of another owner", async () => {
    db.leads.push({ id: LEAD, owner_id: 'someone-else', status: 'new', email: '', notes: null, answers: {} });
    const res = await recordOrder(OWNER, session());
    expect(res?.created).toBe(true); // falls back to creating a fresh lead for the real owner
    expect(db.leads.find((l) => l.id === LEAD)!.status).toBe('new');
  });

  it('direct purchase without a form: creates a won lead from the Stripe customer data', async () => {
    const res = await recordOrder(OWNER, session({ metadata: { pack_id: 'ugc-escala', pack_name: 'Anuncios UGC con IA · Escala' }, amount_total: 49000 }));
    expect(res).toMatchObject({ created: true, duplicate: false });
    expect(db.inserts[0]).toMatchObject({
      owner_id: OWNER,
      name: 'Ana Pérez',
      email: 'ana@tienda.es',
      phone: '+34600000000',
      source: 'stripe',
      status: 'won',
    });
    expect(db.inserts[0].message).toContain('Anuncios UGC con IA · Escala');
    expect(db.inserts[0].answers.order.amount_eur).toBe(490);
  });
});
