'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { BrandedLoadingSpinner } from '@/components/ui/loading-logo';
import { useAgencyLogo } from '@/hooks/useAgencyLogo';
import { usePortalRole } from '@/components/portal/usePortalRole';
import PortalSidebar, { PortalBottomNav } from '@/components/portal/PortalSidebar';
import LeadsProvider from '@/components/portal/LeadsProvider';
import CommandPalette from '@/components/portal/CommandPalette';
import { PortalRoleContext } from './context';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { logoUrl } = useAgencyLogo();
  const router = useRouter();
  const pathname = usePathname();
  const { role, agencyId, allowFullAccess, loading: roleLoading } = usePortalRole();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
    // Redirect back to a pending invite if one was saved before login
    if (!authLoading && user) {
      try {
        const raw = localStorage.getItem('pending_invite');
        if (raw) {
          localStorage.removeItem('pending_invite');
          const { url, expires } = JSON.parse(raw);
          if (url && expires && Date.now() < expires) {
            router.replace(url);
          }
        }
      } catch { /* ignore malformed entries */ }
    }
  }, [authLoading, user, router]);

  // Role-based routing: customers only get their account page and account settings —
  // the rest of the admin is for the agency.
  useEffect(() => {
    if (authLoading || roleLoading || !user) return;
    if (role !== 'agency' && pathname !== '/portal' && !pathname?.startsWith('/portal/settings')) router.replace('/portal');
  }, [authLoading, roleLoading, user, role, pathname, router]);

  if (authLoading || !user || roleLoading) {
    return <BrandedLoadingSpinner logoUrl={logoUrl} />;
  }

  return (
    <PortalRoleContext.Provider value={{ role, agencyId, allowFullAccess, loading: roleLoading }}>
      <LeadsProvider enabled={role === 'agency'}>
        <div className="portal-neon h-[100dvh] flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col md:flex-row">
            <PortalSidebar role={role} />
            {/* Content area (each page renders its own header) */}
            <main className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col md:flex-row">
              {children}
            </main>
            <PortalBottomNav role={role} />
            {role === 'agency' && <CommandPalette />}
          </div>
        </div>
      </LeadsProvider>
    </PortalRoleContext.Provider>
  );
}
