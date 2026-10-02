import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  agency: vi.fn(),
  verify: vi.fn(),
  consume: vi.fn(),
  mark: vi.fn(),
  insert: vi.fn(),
  count: vi.fn(),
}));

vi.mock('@simplewebauthn/server', () => ({ verifyRegistrationResponse: m.verify, generateRegistrationOptions: vi.fn() }));
vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: { from: () => ({ insert: async (r: unknown) => m.insert(r) }) } }));
vi.mock('@/lib/routeAuth', () => ({ agencyUser: m.agency }));
vi.mock('@/lib/passkeys', () => ({
  consumeChallenge: m.consume,
  countPasskeys: m.count,
  forgetPasskeyCount: vi.fn(),
  markPasskeySession: m.mark,
  relyingParty: () => ({ rpID: 'samgple.com', origin: 'https://samgple.com', rpName: 'samgple' }),
  sessionIdFromToken: () => 'sess-9',
  toB64u: () => 'pk',
}));

import { POST } from '../register/verify/route';

const call = (body: unknown) =>
  POST(new Request('http://localhost/x', { method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'https://samgple.com', Authorization: 'Bearer t' }, body: JSON.stringify(body) }) as any);
const body = { challengeId: 'c1', response: { response: {} }, name: ' iPhone de Miguel ' };

beforeEach(() => {
  vi.clearAllMocks();
  m.agency.mockResolvedValue({ ownerId: 'o', role: 'owner', userId: 'u1' });
  m.consume.mockResolvedValue({ challenge: 'ch', user_id: 'u1' });
  m.verify.mockResolvedValue({ verified: true, registrationInfo: { credential: { id: 'cred', publicKey: new Uint8Array([1]), counter: 0, transports: ['internal'] }, credentialBackedUp: true } });
  m.insert.mockResolvedValue({ error: null });
  m.count.mockResolvedValue(2);
});

describe('POST /api/auth/passkey/register/verify', () => {
  it('stores the device, trusts the current session and reports how many devices there are', async () => {
    const res = await call(body);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 2 });
    expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', credential_id: 'cred', device_name: 'iPhone de Miguel', backed_up: true }));
    expect(m.mark).toHaveBeenCalledWith('sess-9', 'u1');
  });

  it('refuses a challenge that belongs to someone else or was already used', async () => {
    m.consume.mockResolvedValue({ challenge: 'ch', user_id: 'someone-else' });
    expect((await call(body)).status).toBe(400);
    m.consume.mockResolvedValue(null);
    expect((await call(body)).status).toBe(400);
    expect(m.insert).not.toHaveBeenCalled();
  });

  it('refuses an attestation that does not verify', async () => {
    m.verify.mockResolvedValue({ verified: false });
    expect((await call(body)).status).toBe(400);
    m.verify.mockRejectedValue(new Error('nope'));
    expect((await call(body)).status).toBe(400);
    expect(m.mark).not.toHaveBeenCalled();
  });

  it('does not register the same device twice', async () => {
    m.insert.mockResolvedValue({ error: { code: '23505' } });
    expect((await call(body)).status).toBe(409);
  });

  it('stops anyone who is not staff', async () => {
    const { NextResponse } = await import('next/server');
    m.agency.mockResolvedValue({ error: NextResponse.json({ error: 'forbidden' }, { status: 403 }) });
    expect((await call(body)).status).toBe(403);
    expect(m.verify).not.toHaveBeenCalled();
  });
});
