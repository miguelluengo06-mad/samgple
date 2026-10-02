'use client';

import { useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SettingsContext, type SettingsTab } from './context';
import { usePortalRole } from '@/components/portal/usePortalRole';

function SettingsLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = usePortalRole();
  const loading = false;
  // Self-hosted: all features unlocked, everyone has Teams-level access
  const isTeams = true;

  const rawTab = (searchParams?.get('tab') as SettingsTab) || 'account';
  // Clients and registered visitors can only access the account tab — redirect if they somehow land elsewhere
  const activeTab: SettingsTab = (role !== 'agency' && rawTab !== 'account') ? 'account' : rawTab;

  // Handle URL hash for deep linking
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'branding' || hash === 'team-members') {
      if (activeTab !== 'company') router.replace('/portal/settings?tab=company#' + hash);
    } else if (hash === 'stripe' || hash === 'smtp') {
      if (activeTab !== 'connections') router.replace('/portal/settings?tab=connections#' + hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToAnchor = useCallback((tabId: SettingsTab, anchor?: string) => {
    if (anchor && tabId === activeTab) {
      setTimeout(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      return;
    }
    const url = `/portal/settings?tab=${tabId}` + (anchor ? `#${anchor}` : '');
    router.replace(url);
    if (anchor) {
      setTimeout(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [activeTab, router]);

  const accountSubItems = [
    { id: 'account-settings', label: 'Cuenta' },
  ];

  const companySubItems = [
    { id: 'team-members', label: 'Equipo' },
    { id: 'branding', label: 'Nombre y logo' },
  ];

  const connectionsSubItems = [
    { id: 'stripe', label: 'Stripe' },
    { id: 'smtp', label: 'Email (avisos)' },
  ];

  const tabs: { id: SettingsTab; label: string; subItems: { id: string; label: string }[] }[] = [
    { id: 'account', label: 'Cuenta', subItems: accountSubItems },
    { id: 'company', label: 'Empresa', subItems: companySubItems },
    { id: 'connections', label: 'Pagos y email', subItems: connectionsSubItems },
  ];

  // Only the agency sees company/connection settings; clients and registered visitors just get their own account
  const visibleTabs = role !== 'agency' ? tabs.filter(t => t.id === 'account') : tabs;
  const activeSubItems = visibleTabs.find(t => t.id === activeTab)?.subItems || [];

  return (
    <SettingsContext.Provider value={{ activeTab, isTeams, loading }}>
      <div className="flex-1 overflow-hidden flex flex-col">
        <header className="flex-shrink-0 px-4 md:px-8 pt-4 md:pt-6 pb-3">
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Ajustes</h1>
          <p className="text-xs md:text-sm text-white/45 mt-0.5">Tu cuenta, tu equipo, los cobros y los avisos.</p>
          {visibleTabs.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mt-4 -mx-1 px-1" role="tablist">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => goToAnchor(tab.id)}
                  className="pn-chip"
                  style={{ fontSize: 13, padding: '6px 14px' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
          {activeSubItems.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide mt-3 -mx-1 px-1">
              {activeSubItems.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => goToAnchor(activeTab, sub.id)}
                  className="text-xs text-white/50 hover:text-[var(--signal)] px-2.5 py-1 rounded-lg hover:bg-white/[0.04] transition-colors whitespace-nowrap cursor-pointer"
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Content */}
        {children}
      </div>
    </SettingsContext.Provider>
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SettingsLayoutInner>{children}</SettingsLayoutInner>
    </Suspense>
  );
}
