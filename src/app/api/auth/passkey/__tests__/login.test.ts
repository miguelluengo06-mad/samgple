import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  verify: vi.fn(),
  consume: vi.fn(),
  find: vi.fn(),
  mark: vi.fn(),
  report: vi.fn(),
  trust: vi.fn(),
  alertIp: vi.fn(),
  isAgency: vi.fn(),
  generateLink: vi.fn(),
  verifyOtp: vi.fn(),
  getUserById: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@simplewebauthn/server', () => ({ verifyAuthenticationResponse: m.verify, generateAuthenticationOptions: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { verifyOtp: m.verifyOtp } }) }));
vi.mock('@/lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    auth: { admin: { generateLink: m.generateLink, getUserById: m.getUserById } },
    from: () => ({ update: (u: unknown) => { m.update(u); return { eq: async () => ({ error: null }) }; } }),
  },
}));
vi.mock('@/lib/agencyAccess', () => ({ isAgencyPrincipal: m.isAgency }));
vi.mock('@/lib/security', () => ({
  getClientIp: () => '203.0.113.7',
  isBlocked: vi.fn().mockResolvedValue(false),
  reportSuspicious: m.report,
  trustIp: m.trust,
  alertNewAdminIp: m.alertIp,
}));
vi.mock('@/lib/passkeys', () => ({
  consumeChallenge: m.consume,
  findPasskey: m.find,
  fromB64u: () => new Uint8Array([1]),
  markPasskeySession: m.mark,
  relyingParty: () => ({ rpID: 'samgple.com', origin: 'https://samgple.com', rpName: 'samgple' }),
  sessionIdFromToken: () => 'sess-1',
}));

import { POST } from '../login/verify/route';

const ROW = { id: 'p1', user_id: 'u1', credential_id: 'cred1', public_key: 'AA', counter: 4, transports: ['internal'] };
const call = (body: unknown) =>
  POST(new Request('http://localhost/api/auth/passkey/login/verify', { method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'https://samgple.com' }, body: JSON.stringify(body) }) as any);
const good = { challengeId: 'ch1', response: { id: 'cred1' } };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  m.report.mockResolvedValue(false);
  m.consume.mockResolvedValue({ challenge: 'c', user_id: null });
  m.find.mockResolvedValue(ROW);
  m.verify.mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 5 } });
  m.isAgency.mockResolvedValue(true);
  m.getUserById.mockResolvedValue({ data: { user: { email: 'staff@samgple.com' } } });
  m.generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'tok' } }, error: null });
  m.verifyOtp.mockResolvedValue({ data: { session: { access_token: 'at', refresh_token: 'rt' } }, error: null });
  m.trust.mockResolvedValue({ ok: true, isNew: false });
});

describe('POST /api/auth/passkey/login/verify', () => {
  it('opens a session, marks it as a passkey session and trusts the IP', async () => {
    const res = await call(good);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ access_token: 'at', refresh_token: 'rt' });
    expect(m.mark).toHaveBeenCalledWith('sess-1', 'u1');
    expect(m.trust).toHaveBeenCalledWith('203.0.113.7', expect.stringContaining('staff@samgple.com'), true);
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ counter: 5 }));
    expect(m.report).not.toHaveBeenCalled();
  });

  it('alerts by Telegram when the IP is new', async () => {
    m.trust.mockResolvedValue({ ok: true, isNew: true });
    await call(good);
    expect(m.alertIp).toHaveBeenCalledWith('203.0.113.7', 'staff@samgple.com', null);
  });

  it('refuses a missing, reused or expired challenge and counts it as a failed login', async () => {
    m.consume.mockResolvedValue(null);
    expect((await call(good)).status).toBe(401);
    expect(m.report).toHaveBeenCalledWith(expect.objectContaining({ kind: 'login_failed', detail: 'passkey' }));
    expect(m.verify).not.toHaveBeenCalled();
  });

  it('refuses an unknown credential', async () => {
    m.find.mockResolvedValue(null);
    expect((await call(good)).status).toBe(401);
    expect(m.generateLink).not.toHaveBeenCalled();
  });

  it('refuses a signature that does not verify (and never mints a session)', async () => {
    m.verify.mockResolvedValue({ verified: false, authenticationInfo: { newCounter: 0 } });
    expect((await call(good)).status).toBe(401);
    m.verify.mockRejectedValue(new Error('bad signature'));
    expect((await call(good)).status).toBe(401);
    expect(m.generateLink).not.toHaveBeenCalled();
    expect(m.mark).not.toHaveBeenCalled();
  });

  it('refuses someone who is no longer part of the team', async () => {
    m.isAgency.mockResolvedValue(false);
    expect((await call(good)).status).toBe(403);
    expect(m.generateLink).not.toHaveBeenCalled();
  });

  it('answers 403 when repeated failures get the IP blocked', async () => {
    m.consume.mockResolvedValue(null);
    m.report.mockResolvedValue(true);
    expect((await call(good)).status).toBe(403);
  });
});
