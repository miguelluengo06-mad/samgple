import { beforeEach, describe, expect, it, vi } from 'vitest';

// Cadena de Supabase falsa: cualquier método devuelve la misma cadena; await / single / maybeSingle dan el resultado.
const { admin, setResult, calls } = vi.hoisted(() => {
  let result: { data: unknown; error: unknown } = { data: null, error: null };
  const calls: { op: string; args: unknown[] }[] = [];
  const chain: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'then') return (res: (v: unknown) => void) => res(result);
        if (prop === 'single' || prop === 'maybeSingle') return async () => result;
        return (...args: unknown[]) => {
          calls.push({ op: prop, args });
          return chain;
        };
      },
    }
  );
  return {
    admin: { auth: { getUser: vi.fn() }, from: vi.fn(() => chain) },
    setResult: (r: { data: unknown; error: unknown }) => { result = r; },
    calls,
  };
});

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: admin }));

import { GET, POST } from '../notices/route';

const LEAD_ID = '3f2b8c1e-6a4d-4e0b-9a41-2c8f0b7d5e11';
const req = (method: 'GET' | 'POST', body?: unknown, token: string | null = 'tok') =>
  new Request('http://localhost/api/account/notices', {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }) as any;

const asUser = (user: unknown) => admin.auth.getUser.mockResolvedValue({ data: { user }, error: user ? null : { message: 'bad' } });
const confirmed = { id: 'u1', email: 'Ana@Example.com', email_confirmed_at: '2026-01-01' };

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  setResult({ data: null, error: null });
});

describe('GET /api/account/notices', () => {
  it('shows nothing without a session or with an unconfirmed email (nobody reads notices by registering with someone else\'s address)', async () => {
    expect(await (await GET(req('GET', undefined, null))).json()).toEqual({ notices: [] });
    asUser({ id: 'u2', email: 'ana@example.com', email_confirmed_at: null });
    expect(await (await GET(req('GET'))).json()).toEqual({ notices: [] });
  });

  it('returns the notices of the customer\'s own leads, newest first', async () => {
    asUser(confirmed);
    setResult({
      error: null,
      data: [
        { id: 'l1', answers: { notices: [{ id: 'n1', title: 'Viejo', body: 'a', created_at: '2026-01-01T10:00:00Z', read_at: null }] } },
        { id: 'l2', answers: { notices: [{ id: 'n2', title: 'Nuevo', body: 'b', created_at: '2026-02-01T10:00:00Z', read_at: '2026-02-02T00:00:00Z' }] } },
      ],
    });
    const body = await (await GET(req('GET'))).json();
    expect(body.notices.map((n: any) => n.title)).toEqual(['Nuevo', 'Viejo']);
    expect(body.notices[0]).toMatchObject({ lead_id: 'l2', read_at: '2026-02-02T00:00:00Z' });
    // la consulta filtra por el email de quien pregunta, sin comodines
    expect(calls.find((c) => c.op === 'ilike')?.args).toEqual(['email', 'Ana@Example.com']);
  });
});

describe('POST /api/account/notices', () => {
  it('requires a confirmed session and valid ids', async () => {
    expect((await POST(req('POST', { leadId: LEAD_ID, noticeId: 'n1' }, null))).status).toBe(401);
    asUser(confirmed);
    expect((await POST(req('POST', { leadId: 'no-uuid', noticeId: 'n1' }))).status).toBe(400);
  });

  it('cannot mark notices of a lead that belongs to someone else', async () => {
    asUser(confirmed);
    setResult({ data: null, error: null }); // la solicitud no es de este email
    expect((await POST(req('POST', { leadId: LEAD_ID, noticeId: 'n1' }))).status).toBe(404);
    expect(calls.some((c) => c.op === 'update')).toBe(false);
  });

  it('marks a notice as read on the customer\'s own lead', async () => {
    asUser(confirmed);
    setResult({ error: null, data: { id: LEAD_ID, answers: { notices: [{ id: 'n1', title: 't', body: 'b', created_at: '2026-01-01T00:00:00Z', read_at: null }] } } });
    const res = await POST(req('POST', { leadId: LEAD_ID, noticeId: 'n1' }));
    expect(res.status).toBe(200);
    const update = calls.find((c) => c.op === 'update');
    expect((update?.args[0] as any).answers.notices[0].read_at).toBeTruthy();
  });
});
