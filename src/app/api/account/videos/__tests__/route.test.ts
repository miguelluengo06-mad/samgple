import { beforeEach, describe, expect, it, vi } from 'vitest';

type Res = { data: unknown; error: unknown };

// Supabase falso: cada tabla tiene una cola de respuestas que se consumen en orden (await / single / maybeSingle).
const h = vi.hoisted(() => {
  const queues: Record<string, Res[]> = {};
  const calls: { table: string; op: string; args: unknown[] }[] = [];
  const next = (t: string): Res => (queues[t] && queues[t].length ? queues[t].shift()! : { data: null, error: null });
  const chain = (table: string): any =>
    new Proxy(
      {},
      {
        get(_t, prop: string) {
          if (prop === 'then') return (res: (v: unknown) => void) => res(next(table));
          if (prop === 'single' || prop === 'maybeSingle') return async () => next(table);
          return (...args: unknown[]) => {
            calls.push({ table, op: prop, args });
            return chain(table);
          };
        },
      }
    );
  const admin = {
    auth: { getUser: vi.fn() },
    from: vi.fn((t: string) => chain(t)),
    rpc: vi.fn(),
  };
  return { admin, queues, calls };
});

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: h.admin }));
vi.mock('@/lib/agencyAccess', () => ({ getSiteOwnerId: vi.fn().mockResolvedValue('agency-1') }));
vi.mock('@/lib/telegram', () => ({ sendTelegram: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/videoServer', () => ({
  getBalance: vi.fn().mockResolvedValue(4),
  getGranted: vi.fn().mockResolvedValue(10),
  missingTable: (e: { code?: string } | null) => !!e && e.code === '42P01',
}));

import { GET, POST } from '../route';
import { PATCH } from '../[id]/route';

const AVATAR = '3f2b8c1e-6a4d-4e0b-9a41-2c8f0b7d5e11';
const REQ_ID = '9b1c2d3e-4f50-4a61-8b72-93c4d5e6f708';
const words = (n: number) => Array.from({ length: n }, () => 'hola').join(' ');

const asCustomer = (email = 'Ana@Example.com') =>
  h.admin.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email, email_confirmed_at: '2026-01-01', user_metadata: { full_name: 'Ana Pérez' } } }, error: null });
const noSession = () => h.admin.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });

const post = (body: unknown) =>
  new Request('http://localhost/api/account/videos', { method: 'POST', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) as any;
const validBody = { avatarId: AVATAR, scriptNotes: 'Quiero que hable de mi crema hidratante y de por qué es distinta.', tone: 'Cercano' };

beforeEach(() => {
  vi.clearAllMocks();
  h.calls.length = 0;
  for (const k of Object.keys(h.queues)) delete h.queues[k];
  asCustomer();
});

describe('GET /api/account/videos', () => {
  it('returns an empty panel without a confirmed session', async () => {
    noSession();
    const body = await (await GET(new Request('http://localhost/api/account/videos') as any)).json();
    expect(body).toMatchObject({ balance: 0, requests: [], avatars: [] });
  });

  it('returns balance, own requests and the active avatars', async () => {
    h.queues.video_requests = [{ data: [{ id: REQ_ID, status: 'requested' }], error: null }];
    h.queues.avatars = [{ data: [{ id: AVATAR, name: 'Lucía' }], error: null }];
    const body = await (await GET(new Request('http://localhost/api/account/videos', { headers: { Authorization: 'Bearer t' } }) as any)).json();
    expect(body.balance).toBe(4);
    expect(body.granted).toBe(10);
    expect(body.requests).toHaveLength(1);
    expect(body.avatars[0].name).toBe('Lucía');
    expect(body.limits.seconds).toBe(45);
    // los pedidos se piden solo por el email de quien pregunta, en minúsculas
    expect(h.calls.find((c) => c.table === 'video_requests' && c.op === 'eq')?.args).toEqual(['customer_email', 'ana@example.com']);
  });
});

describe('POST /api/account/videos', () => {
  it('requires a session', async () => {
    noSession();
    expect((await POST(post(validBody))).status).toBe(401);
  });

  it('rejects a missing avatar and notes longer than 45 seconds before touching the balance', async () => {
    expect((await POST(post({ ...validBody, avatarId: 'x' }))).status).toBe(400);
    expect((await POST(post({ ...validBody, scriptNotes: words(130) }))).status).toBe(400);
    expect(h.admin.rpc).not.toHaveBeenCalled();
  });

  it('rejects an avatar that is not active', async () => {
    h.queues.avatars = [{ data: null, error: null }];
    expect((await POST(post(validBody))).status).toBe(400);
    expect(h.admin.rpc).not.toHaveBeenCalled();
  });

  it('answers 402 when there are no videos left and creates nothing', async () => {
    h.queues.avatars = [{ data: { id: AVATAR, name: 'Lucía', image_url: 'https://x.com/a.jpg' }, error: null }];
    h.admin.rpc.mockResolvedValue({ data: false, error: null });
    const res = await POST(post(validBody));
    expect(res.status).toBe(402);
    expect(h.calls.some((c) => c.table === 'video_requests' && c.op === 'insert')).toBe(false);
  });

  it('spends one video atomically and saves the request with a snapshot of the avatar', async () => {
    h.queues.avatars = [{ data: { id: AVATAR, name: 'Lucía', image_url: 'https://x.com/a.jpg' }, error: null }];
    h.queues.video_requests = [{ data: { id: 'new', status: 'requested' }, error: null }];
    h.admin.rpc.mockResolvedValue({ data: true, error: null });
    const res = await POST(post(validBody));
    expect(res.status).toBe(200);
    expect(h.admin.rpc).toHaveBeenCalledWith('consume_video_credit', { p_email: 'ana@example.com', p_ref: expect.any(String) });
    const insert = h.calls.find((c) => c.table === 'video_requests' && c.op === 'insert');
    expect(insert?.args[0]).toMatchObject({ customer_email: 'ana@example.com', avatar_name: 'Lucía', tone: 'Cercano', owner_id: 'agency-1' });
    expect(h.calls.some((c) => c.table === 'video_credit_ledger' && c.op === 'insert')).toBe(false); // sin devolución
  });

  it('gives the video back if the request could not be saved', async () => {
    h.queues.avatars = [{ data: { id: AVATAR, name: 'Lucía', image_url: 'https://x.com/a.jpg' }, error: null }];
    h.queues.video_requests = [{ data: null, error: { message: 'boom' } }];
    h.admin.rpc.mockResolvedValue({ data: true, error: null });
    const res = await POST(post(validBody));
    expect(res.status).toBe(500);
    const refund = h.calls.find((c) => c.table === 'video_credit_ledger' && c.op === 'insert');
    expect(refund?.args[0]).toMatchObject({ customer_email: 'ana@example.com', delta: 1, reason: 'refund' });
  });
});

describe('PATCH /api/account/videos/[id]', () => {
  const patch = (body: unknown, id = REQ_ID) =>
    PATCH(new Request('http://localhost/x', { method: 'PATCH', headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) as any, { params: Promise.resolve({ id }) });

  it('cannot touch requests of another customer', async () => {
    h.queues.video_requests = [{ data: null, error: null }];
    expect((await patch({ action: 'cancel' })).status).toBe(404);
  });

  it('only allows approving a script that is waiting for review', async () => {
    h.queues.video_requests = [{ data: { id: REQ_ID, status: 'production', customer_name: 'Ana', avatar_name: 'Lucía' }, error: null }];
    expect((await patch({ action: 'approve' })).status).toBe(409);
  });

  it('asks for the change when requesting script changes', async () => {
    h.queues.video_requests = [{ data: { id: REQ_ID, status: 'script_review', customer_name: 'Ana', avatar_name: 'Lucía' }, error: null }];
    expect((await patch({ action: 'changes', feedback: '' })).status).toBe(400);
  });

  it('cancelling before work starts refunds the video once', async () => {
    h.queues.video_requests = [
      { data: { id: REQ_ID, status: 'requested', customer_name: 'Ana', avatar_name: 'Lucía' }, error: null },
      { data: { id: REQ_ID, status: 'cancelled' }, error: null },
    ];
    const res = await patch({ action: 'cancel' });
    expect(res.status).toBe(200);
    const refund = h.calls.find((c) => c.table === 'video_credit_ledger' && c.op === 'insert');
    expect(refund?.args[0]).toMatchObject({ customer_email: 'ana@example.com', delta: 1, reason: 'refund', ref: REQ_ID });
  });

  it('a double click does not apply the change twice', async () => {
    h.queues.video_requests = [
      { data: { id: REQ_ID, status: 'requested', customer_name: 'Ana', avatar_name: 'Lucía' }, error: null },
      { data: null, error: null }, // el segundo clic ya no encuentra el pedido en ese estado
    ];
    expect((await patch({ action: 'cancel' })).status).toBe(409);
    expect(h.calls.some((c) => c.table === 'video_credit_ledger')).toBe(false);
  });
});
