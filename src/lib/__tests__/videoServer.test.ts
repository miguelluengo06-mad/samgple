import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  let insertResult: { error: { code?: string; message?: string } | null } = { error: null };
  const inserts: Record<string, unknown>[] = [];
  const admin = {
    from: vi.fn(() => ({
      insert: vi.fn(async (row: Record<string, unknown>) => {
        inserts.push(row);
        return insertResult;
      }),
    })),
    auth: { admin: { generateLink: vi.fn() } },
  };
  return { admin, inserts, setInsert: (r: typeof insertResult) => { insertResult = r; } };
});

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: h.admin }));
vi.mock('@/lib/leadMailer', () => ({ resolveLeadMailer: vi.fn().mockResolvedValue(null), sendLeadMail: vi.fn() }));
vi.mock('@/lib/telegram', () => ({ sendTelegram: vi.fn().mockResolvedValue(true) }));

import { creditsForOrder, grantCredits, provisionCustomer } from '../videoServer';

const order = { session_id: 'cs_live_1', pack_id: 'ugc-escala', pack_name: 'UGC · Escala', items: [{ pack_id: 'ugc-escala', qty: 1 }] };

beforeEach(() => {
  vi.clearAllMocks();
  h.inserts.length = 0;
  h.setInsert({ error: null });
});

describe('creditsForOrder', () => {
  it('uses the purchased items, or the pack id when the order has none', () => {
    expect(creditsForOrder(order)).toBe(10);
    expect(creditsForOrder({ ...order, items: [{ pack_id: 'ugc-escala', qty: 2 }, { pack_id: 'video-suelto', qty: 1 }] })).toBe(21);
    expect(creditsForOrder({ ...order, items: [] })).toBe(10);
    expect(creditsForOrder({ session_id: 'x', pack_id: 'cart', pack_name: 'c', items: [] })).toBe(0);
  });
});

describe('grantCredits', () => {
  it('adds the videos of the pack to the ledger with the Stripe session as reference', async () => {
    const r = await grantCredits(order, 'Ana@Example.com');
    expect(r).toEqual({ credits: 10, isNew: true });
    expect(h.inserts[0]).toMatchObject({ customer_email: 'ana@example.com', delta: 10, reason: 'purchase', ref: 'cs_live_1' });
  });

  it('counts a purchase only once (webhook + thank-you page arriving together)', async () => {
    h.setInsert({ error: { code: '23505', message: 'duplicate key' } });
    expect(await grantCredits(order, 'ana@example.com')).toEqual({ credits: 10, isNew: false });
  });

  it('grants nothing for a pack that gives no videos, and survives a missing table', async () => {
    expect(await grantCredits({ session_id: 'x', pack_id: 'raro', pack_name: 'r', items: [] }, 'a@b.c')).toEqual({ credits: 0, isNew: false });
    expect(h.inserts).toHaveLength(0);
    h.setInsert({ error: { code: '42P01', message: 'relation does not exist' } });
    expect(await grantCredits(order, 'a@b.c')).toEqual({ credits: 0, isNew: false });
  });
});

describe('provisionCustomer', () => {
  it('does nothing without an email and never throws', async () => {
    await expect(provisionCustomer('owner', order, { email: '' })).resolves.toBeUndefined();
    expect(h.inserts).toHaveLength(0);
  });

  it('does not create the account twice when the purchase was already granted', async () => {
    h.setInsert({ error: { code: '23505', message: 'duplicate' } });
    await provisionCustomer('owner', order, { email: 'ana@example.com', name: 'Ana' });
    expect(h.admin.auth.admin.generateLink).not.toHaveBeenCalled();
  });

  it('creates the account with an invitation link for a new customer', async () => {
    h.admin.auth.admin.generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'abc' } }, error: null });
    await provisionCustomer('owner', order, { email: 'ana@example.com', name: 'Ana' });
    expect(h.admin.auth.admin.generateLink).toHaveBeenCalledWith(expect.objectContaining({ type: 'invite', email: 'ana@example.com' }));
  });

  it('keeps going when the customer already has an account', async () => {
    h.admin.auth.admin.generateLink.mockResolvedValue({ data: null, error: { message: 'User already registered' } });
    await expect(provisionCustomer('owner', order, { email: 'ana@example.com' })).resolves.toBeUndefined();
  });

  it('can grant credits silently (past purchases) without touching accounts', async () => {
    await provisionCustomer('owner', order, { email: 'ana@example.com' }, { notify: false });
    expect(h.inserts).toHaveLength(1);
    expect(h.admin.auth.admin.generateLink).not.toHaveBeenCalled();
  });
});
