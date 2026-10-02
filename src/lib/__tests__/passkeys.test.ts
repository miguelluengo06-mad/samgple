import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  let row: { challenge: string; user_id: string | null; created_at: string } | null = null;
  const deleted: string[] = [];
  const chain: any = new Proxy({}, {
    get(_t, prop: string) {
      if (prop === 'maybeSingle') return async () => ({ data: row, error: null });
      if (prop === 'then') return (res: (v: unknown) => void) => res({ data: null, error: null });
      if (prop === 'delete') return () => { deleted.push('x'); return chain; };
      return () => chain;
    },
  });
  return { admin: { from: vi.fn(() => chain) }, setRow: (r: typeof row) => { row = r; }, deleted };
});

vi.mock('@/lib/supabaseAdmin', () => ({ supabaseAdmin: h.admin }));

import { consumeChallenge, explainOrigin, relyingParty, sessionIdFromToken } from '../passkeys';

const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.s`;

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

describe('sessionIdFromToken', () => {
  it('reads the session_id claim from a bearer token', () => {
    expect(sessionIdFromToken(`Bearer ${jwt({ session_id: 'abc-123' })}`)).toBe('abc-123');
    expect(sessionIdFromToken(jwt({ session_id: 'x' }))).toBe('x');
  });

  it('returns null for anything that is not a token with a session', () => {
    expect(sessionIdFromToken(null)).toBeNull();
    expect(sessionIdFromToken('')).toBeNull();
    expect(sessionIdFromToken('Bearer nope')).toBeNull();
    expect(sessionIdFromToken(`Bearer ${jwt({ sub: 'u' })}`)).toBeNull();
    expect(sessionIdFromToken('Bearer a.%%%.c')).toBeNull();
  });
});

describe('relyingParty', () => {
  const headers = (origin?: string) => new Headers(origin ? { origin } : {});

  it('needs an origin', () => {
    expect(relyingParty(headers())).toBeNull();
  });

  it('only accepts the configured site (or its subdomains), never another website', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://samgple.com';
    expect(relyingParty(headers('https://samgple.com'))).toMatchObject({ rpID: 'samgple.com', origin: 'https://samgple.com' });
    expect(relyingParty(headers('https://www.samgple.com'))).toMatchObject({ rpID: 'samgple.com' });
    expect(relyingParty(headers('https://evil.com'))).toBeNull();
    expect(relyingParty(headers('https://samgple.com.evil.com'))).toBeNull();
    expect(relyingParty(headers('not a url'))).toBeNull();
  });

  it('works with and without «www» whichever one is configured', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://www.samgple.com';
    expect(relyingParty(headers('https://samgple.com'))).toMatchObject({ rpID: 'samgple.com', origin: 'https://samgple.com' });
    expect(relyingParty(headers('https://www.samgple.com'))).toMatchObject({ rpID: 'samgple.com' });
    expect(relyingParty(headers('https://other.com'))).toBeNull();
  });

  it('tells the person which address to use when the origin is wrong', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://samgple.com';
    const msg = explainOrigin(headers('https://samgple.vercel.app'));
    expect(msg).toContain('samgple.com');
    expect(msg).toContain('samgple.vercel.app');
    expect(explainOrigin(headers())).toContain('Recarga');
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(explainOrigin(headers('https://x.com'))).toContain('NEXT_PUBLIC_SITE_URL');
  });

  it('uses the received origin when no site is configured (local development)', () => {
    expect(relyingParty(headers('http://localhost:3001'))).toMatchObject({ rpID: 'localhost', origin: 'http://localhost:3001' });
  });
});

describe('consumeChallenge', () => {
  beforeEach(() => {
    h.deleted.length = 0;
  });

  it('returns a fresh challenge once and deletes it so it cannot be reused', async () => {
    h.setRow({ challenge: 'c1', user_id: 'u1', created_at: new Date().toISOString() });
    expect(await consumeChallenge('id', 'login')).toEqual({ challenge: 'c1', user_id: 'u1' });
    expect(h.deleted).toHaveLength(1);
  });

  it('rejects expired challenges (older than 5 minutes) and unknown ones', async () => {
    h.setRow({ challenge: 'c1', user_id: null, created_at: new Date(Date.now() - 6 * 60_000).toISOString() });
    expect(await consumeChallenge('id', 'login')).toBeNull();
    h.setRow(null);
    expect(await consumeChallenge('nope', 'login')).toBeNull();
  });
});
