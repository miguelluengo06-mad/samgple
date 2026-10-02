import { beforeEach, describe, expect, it, vi } from 'vitest';

type Res = { data: unknown; error: unknown };

const h = vi.hoisted(() => {
  const queues: Record<string, Res[]> = {};
  const calls: { table: string; op: string; args: unknown[] }[] = [];
  const next = (t: string): Res => (queues[t] && queues[t].length ? queues[t].shift()! : { data: null, error: null });
  const chain = (table: string): any =>
    new Proxy({}, {
      get(_t, prop: string) {
        if (prop === 'then') return (res: (v: unknown) => void) => res(next(table));
        if (prop === 'single' || prop === 'maybeSingle') return async () => next(table);
        return (...args: unknown[]) => {
          calls.push({ table, op: prop, args });
          return chain(table);
        };
      },
    });
  return { admin: { from: vi.fn((t: string) => chain(t)) }, queues, calls, agency: vi.fn(), announce: vi.fn() };
});

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: h.admin }));
vi.mock('@/lib/routeAuth', () => ({ agencyUser: h.agency }));
vi.mock('@/lib/videoServer', () => ({ announceVideoUpdate: h.announce, getBalance: vi.fn().mockResolvedValue(3), missingTable: () => false }));

import { PATCH } from '../[id]/route';
import { POST as credits } from '../credits/route';

const ID = '9b1c2d3e-4f50-4a61-8b72-93c4d5e6f708';
const base = { id: ID, owner_id: 'agency-1', customer_email: 'ana@example.com', status: 'requested', script_text: null, delivery_url: null };
const patch = (body: unknown) =>
  PATCH(new Request('http://localhost/x', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) as any, { params: Promise.resolve({ id: ID }) });

beforeEach(() => {
  vi.clearAllMocks();
  h.calls.length = 0;
  for (const k of Object.keys(h.queues)) delete h.queues[k];
  h.agency.mockResolvedValue({ ownerId: 'agency-1', role: 'owner', userId: 'u' });
});

describe('PATCH /api/videos/[id]', () => {
  it('stops anyone who is not agency staff', async () => {
    const { NextResponse } = await import('next/server');
    h.agency.mockResolvedValue({ error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) });
    expect((await patch({ status: 'production' })).status).toBe(403);
  });

  it('does not send a script to review without a script, nor deliver without a link', async () => {
    h.queues.video_requests = [{ data: base, error: null }];
    expect((await patch({ status: 'script_review' })).status).toBe(400);
    h.queues.video_requests = [{ data: { ...base, status: 'production' }, error: null }];
    expect((await patch({ status: 'delivered' })).status).toBe(400);
    h.queues.video_requests = [{ data: { ...base, status: 'production' }, error: null }];
    expect((await patch({ status: 'delivered', delivery_url: 'javascript:alert(1)' })).status).toBe(400);
  });

  it('sends the script for approval and tells the customer (by account and email)', async () => {
    h.queues.video_requests = [{ data: base, error: null }, { data: { ...base, status: 'script_review', script_text: 'Hola' }, error: null }];
    const res = await patch({ status: 'script_review', script_text: 'Hola' });
    expect(res.status).toBe(200);
    expect(h.announce).toHaveBeenCalledWith('agency-1', 'ana@example.com', expect.stringContaining('guion'), expect.any(String), { mail: true });
  });

  it('refunds the video when the request is cancelled, and only the first time', async () => {
    h.queues.video_requests = [{ data: base, error: null }, { data: { ...base, status: 'cancelled' }, error: null }];
    await patch({ status: 'cancelled' });
    const refund = h.calls.find((c) => c.table === 'video_credit_ledger' && c.op === 'insert');
    expect(refund?.args[0]).toMatchObject({ customer_email: 'ana@example.com', delta: 1, reason: 'refund', ref: ID });

    h.calls.length = 0;
    h.queues.video_requests = [{ data: { ...base, status: 'cancelled' }, error: null }, { data: { ...base, status: 'cancelled' }, error: null }];
    await patch({ status: 'cancelled' });
    expect(h.calls.some((c) => c.table === 'video_credit_ledger')).toBe(false);
  });

  it('rejects unknown statuses', async () => {
    h.queues.video_requests = [{ data: base, error: null }];
    expect((await patch({ status: 'hacked' })).status).toBe(400);
  });
});

describe('POST /api/videos/credits', () => {
  const post = (body: unknown) => credits(new Request('http://localhost/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) as any);

  it('validates the email and the amount', async () => {
    expect((await post({ email: 'no', delta: 1 })).status).toBe(400);
    expect((await post({ email: 'a@b.co', delta: 0 })).status).toBe(400);
    expect((await post({ email: 'a@b.co', delta: 500 })).status).toBe(400);
  });

  it('never leaves a negative balance', async () => {
    expect((await post({ email: 'a@b.co', delta: -5 })).status).toBe(400); // saldo simulado: 3
    expect(h.calls.some((c) => c.table === 'video_credit_ledger')).toBe(false);
  });

  it('adds a manual movement to the ledger', async () => {
    const res = await post({ email: 'A@B.co', delta: 2, note: 'Regalo' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ balance: 5 });
    expect(h.calls.find((c) => c.op === 'insert')?.args[0]).toMatchObject({ customer_email: 'a@b.co', delta: 2, reason: 'manual' });
  });
});
