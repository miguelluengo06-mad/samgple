import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET } from '../route';

/**
 * Cadena falsa para:
 *   .from('profiles').select('business_name').or(...).limit(1).maybeSingle() → { data }
 *   .from('profiles').select('id', { count: 'exact', head: true })           → { count }
 */
function mockQueries(profile: { business_name: string } | null, profileCount: number) {
  let call = 0;
  mockFrom.mockImplementation(() => {
    call++;
    if (call === 1) {
      const maybeSingle = vi.fn().mockResolvedValue({ data: profile });
      const limit = vi.fn().mockReturnValue({ maybeSingle });
      const or = vi.fn().mockReturnValue({ limit });
      const select = vi.fn().mockReturnValue({ or });
      return { select };
    }
    const select = vi.fn().mockResolvedValue({ count: profileCount });
    return { select };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/auth-config', () => {
  it('keeps registration closed once an account exists and shows the company name', async () => {
    mockQueries({ business_name: 'samgple' }, 5);
    const body = await (await GET()).json();
    expect(body).toEqual({ allow_signup: false, agency_name: 'samgple', first_run: false });
  });

  it('opens registration only on the very first run (to create the administrator)', async () => {
    mockQueries(null, 0);
    const body = await (await GET()).json();
    expect(body).toEqual({ allow_signup: true, agency_name: null, first_run: true });
  });

  it('never exposes the personal name when there is no company name', async () => {
    mockQueries(null, 3);
    const body = await (await GET()).json();
    expect(body.agency_name).toBeNull();
  });

  it('fails closed when the database is unreachable', async () => {
    mockFrom.mockImplementation(() => {
      throw new Error('db down');
    });
    const body = await (await GET()).json();
    expect(body).toEqual({ allow_signup: false, agency_name: null, first_run: false });
  });
});
