import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  signIn: vi.fn(),
  profile: vi.fn(),
  isAgency: vi.fn(),
  mustPasskey: vi.fn(),
  report: vi.fn(),
  countByDetail: vi.fn(),
  trust: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { signInWithPassword: m.signIn } }) }));
vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: { from: () => ({ select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: m.profile() }) }) }) }) },
}));
vi.mock('@/lib/agencyAccess', () => ({ isAgencyPrincipal: m.isAgency }));
vi.mock('@/lib/passkeys', () => ({ mustUsePasskey: m.mustPasskey }));
vi.mock('@/lib/security', () => ({
  getClientIp: () => '203.0.113.7',
  isBlocked: vi.fn().mockResolvedValue(false),
  reportSuspicious: m.report,
  countRecentByDetail: m.countByDetail,
  trustIp: m.trust,
  alertNewAdminIp: vi.fn(),
}));

import { POST } from '../route';

const call = (body: unknown) => POST(new Request('http://localhost/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) as any);
const creds = { email: 'Staff@Samgple.com', password: 'secret-password' };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  m.profile.mockReturnValue(null);
  m.isAgency.mockResolvedValue(false);
  m.mustPasskey.mockResolvedValue(false);
  m.countByDetail.mockResolvedValue(0);
  m.report.mockResolvedValue(false);
  m.trust.mockResolvedValue({ ok: true, isNew: false });
  m.signIn.mockResolvedValue({ data: { session: { access_token: 'at', refresh_token: 'rt' }, user: { id: 'u1' } }, error: null });
});

describe('POST /api/auth/login (password)', () => {
  it('lets a customer in with email and password', async () => {
    const res = await call(creds);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ access_token: 'at', refresh_token: 'rt' });
  });

  it('does not even try the password of a staff account that must use passkeys', async () => {
    m.profile.mockReturnValue({ id: 'staff-1' });
    m.isAgency.mockResolvedValue(true);
    m.mustPasskey.mockResolvedValue(true);
    const res = await call(creds);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'passkey_required' });
    expect(m.signIn).not.toHaveBeenCalled();
  });

  it('still accepts the password of staff who have not registered enough passkeys yet', async () => {
    m.profile.mockReturnValue({ id: 'staff-1' });
    m.isAgency.mockResolvedValue(true);
    m.mustPasskey.mockResolvedValue(false);
    expect((await call(creds)).status).toBe(200);
  });

  it('counts a wrong password and keeps the same message whether or not the account exists', async () => {
    m.signIn.mockResolvedValue({ data: { session: null, user: null }, error: { message: 'Invalid login credentials' } });
    const res = await call(creds);
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Email o contraseña incorrectos');
    expect(m.report).toHaveBeenCalledWith(expect.objectContaining({ kind: 'login_failed', detail: 'staff@samgple.com' }));
  });

  it('pauses an account that is being attacked from many IPs', async () => {
    m.countByDetail.mockResolvedValue(10);
    expect((await call(creds)).status).toBe(429);
    expect(m.signIn).not.toHaveBeenCalled();
  });
});
