'use client';

import { createContext, useContext } from 'react';
import type { PortalRole } from '@/components/portal/usePortalRole';

// Shared role context so child pages can access role without re-querying
interface PortalRoleContextValue {
  role: PortalRole;
  passkeyRequired: boolean;
  loading: boolean;
}

export const PortalRoleContext = createContext<PortalRoleContextValue>({
  role: 'free',
  passkeyRequired: false,
  loading: true,
});

export function usePortalRoleContext() {
  return useContext(PortalRoleContext);
}
