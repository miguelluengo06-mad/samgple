import { beforeEach, describe, expect, it, vi } from 'vitest';

const { admin, setResults, calls } = vi.hoisted(() => {
  let queue: { data: unknown; error: unknown }[] = [];
  const calls: { op: string; args: unknown[] }[] = [];
  const next = () => queue.shift() ?? { data: null, error: null };
  const chain: any = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (prop === 'single' || prop === 'maybeSingle') return async () => next();
        return (...args: unknown[]) => {
          calls.push({ op: prop, args });
          return chain;
        };
      },
    }
  );
  return {
    admin: { auth: { getUser: vi.fn() }, from: vi.fn(() => chain) },
    setResults: (r: { data: unknown; error: unknown }[]) => { queue = r.slice(); },
    calls,
  };
});

const { requireAgency } = vi.hoisted(() => ({ requireAgency: vi.fn() }));
const { ownerCtx } = vi.hoisted(() => ({ ownerCtx: vi.fn() }));

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: admin }));
vi.mock('@/lib/agencyAccess', () => ({ requireAgencyPrincipal: requireAgency }));
vi.mock('@/lib/teamUtils', () => ({
  getEffectiveOwnerId: ownerCtx,
  canWrite: (role: string) => role !== 'member',
}));

import { POST } from '../[id]/notices/route';

const LEAD_ID = '3f2b8c1e-6a4d-4e0b-9a41-2c8f0b7d5e11';
const post = (body: unknown, token: string | null = 'tok') =>
  new Request('http://localhost/api/leads/x/notices', {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
const params = (id = LEAD_ID) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  admin.auth.getUser.mockResolvedValue({ data: { user: { id: 'agency-1' } }, error: null });
  requireAgency.mockResolvedValue(null);
  ownerCtx.mockResolvedValue({ ownerId: 'agency-1', role: 'owner', isTeamMember: false });
});

describe('POST /api/leads/[id]/notices', () => {
  it('needs a session and the agency role', async () => {
    expect((await POST(post({ title: 't', body: 'b' }, null), params())).status).toBe(401);
    const { NextResponse } = await import('next/server');
    requireAgency.mockResolvedValue(NextResponse.json({ error: 'forbidden' }, { status: 403 }));
    expect((await POST(post({ title: 't', body: 'b' }), params())).status).toBe(403);
  });

  it('rejects an invalid id and read-only team members', async () => {
    expect((await POST(post({ title: 't', body: 'b' }), params('nope'))).status).toBe(400);
    ownerCtx.mockResolvedValue({ ownerId: 'agency-1', role: 'member', isTeamMember: true });
    expect((await POST(post({ title: 't', body: 'b' }), params())).status).toBe(403);
  });

  it('does not touch leads of another agency', async () => {
    setResults([{ data: { id: LEAD_ID, owner_id: 'someone-else', answers: null }, error: null }]);
    expect((await POST(post({ title: 't', body: 'b' }), params())).status).toBe(404);
    expect(calls.some((c) => c.op === 'update')).toBe(false);
  });

  it('requires a title and a message', async () => {
    setResults([{ data: { id: LEAD_ID, owner_id: 'agency-1', answers: null }, error: null }]);
    expect((await POST(post({ title: '  ', body: 'b' }), params())).status).toBe(400);
  });

  it('saves the notice inside the lead and keeps its other answers', async () => {
    setResults([
      { data: { id: LEAD_ID, owner_id: 'agency-1', answers: { budget: '1.000' } }, error: null },
      { data: { id: LEAD_ID, answers: { budget: '1.000', notices: [{ id: 'x' }] } }, error: null },
    ]);
    const res = await POST(post({ title: 'Tu guion está listo', body: 'Revísalo' }), params());
    expect(res.status).toBe(200);
    const update = calls.find((c) => c.op === 'update');
    const answers = (update?.args[0] as any).answers;
    expect(answers.budget).toBe('1.000');
    expect(answers.notices[0]).toMatchObject({ title: 'Tu guion está listo', body: 'Revísalo', read_at: null });
  });
});
