import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/teamUtils', () => ({
  getEffectiveOwnerId: vi.fn(),
}));

import { getEffectiveOwnerId } from '@/lib/teamUtils';
import { getSiteOwnerId, isAgencyPrincipal, requireAgencyPrincipal, resetAgencyAccessCache } from '../agencyAccess';

const OWNER = 'owner-id';

/** Minimal supabase stub: profiles ordered by created_at, first row is the owner. */
function stub(ownerId: string | null) {
  const chain: any = {
    select: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data: ownerId ? { id: ownerId } : null }),
  };
  return { from: vi.fn(() => chain) } as any;
}

describe('agencyAccess', () => {
  beforeEach(() => {
    resetAgencyAccessCache();
    vi.mocked(getEffectiveOwnerId).mockReset();
  });

  it('treats the earliest profile as the site owner', async () => {
    expect(await getSiteOwnerId(stub(OWNER))).toBe(OWNER);
    resetAgencyAccessCache(); // the owner lookup is cached
    expect(await getSiteOwnerId(stub(null))).toBeNull();
  });

  it('lets the owner through without a team lookup', async () => {
    expect(await isAgencyPrincipal(stub(OWNER), OWNER)).toBe(true);
    expect(getEffectiveOwnerId).not.toHaveBeenCalled();
  });

  it('lets accepted team members of the owner through', async () => {
    vi.mocked(getEffectiveOwnerId).mockResolvedValue({ ownerId: OWNER, isTeamMember: true, role: 'manager' });
    expect(await isAgencyPrincipal(stub(OWNER), 'member-id')).toBe(true);
  });

  it('refuses a plain registered account (getEffectiveOwnerId calls them their own "owner")', async () => {
    vi.mocked(getEffectiveOwnerId).mockResolvedValue({ ownerId: 'visitor-id', isTeamMember: false, role: 'owner' });
    expect(await isAgencyPrincipal(stub(OWNER), 'visitor-id')).toBe(false);
  });

  it('refuses members of some other team', async () => {
    vi.mocked(getEffectiveOwnerId).mockResolvedValue({ ownerId: 'someone-else', isTeamMember: true, role: 'admin' });
    expect(await isAgencyPrincipal(stub(OWNER), 'member-id')).toBe(false);
  });

  it('requireAgencyPrincipal returns a 403 for outsiders and null for the agency', async () => {
    vi.mocked(getEffectiveOwnerId).mockResolvedValue({ ownerId: 'visitor-id', isTeamMember: false, role: 'owner' });
    const denied = await requireAgencyPrincipal(stub(OWNER), 'visitor-id');
    expect(denied?.status).toBe(403);
    expect(await requireAgencyPrincipal(stub(OWNER), OWNER)).toBeNull();
  });
});
