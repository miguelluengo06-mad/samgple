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
    if (hash === 'branding' || hash === 'team-members' || hash === 'authentication') {
      if (activeTab !== 'company') router.replace('/portal/settings?tab=company#' + hash);
    } else if (hash === 'flowengine' || hash === 'ai' || hash === 'stripe' || hash === 'smtp') {
      if (activeTab !== 'connections') router.replace('/portal/settings?tab=connections#' + hash);
    } else if (hash === 'google' || hash === 'microsoft' || hash === 'slack' || hash === 'linkedin' || hash === 'reddit' || hash === 'twitter') {
      if (activeTab !== 'oauth') router.replace('/portal/settings?tab=oauth#' + hash);
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
    { id: 'authentication', label: 'Autenticación' },
  ];

  const connectionsSubItems = [
    { id: 'flowengine', label: 'FlowEngine API' },
    { id: 'ai', label: 'AI Provider' },
    { id: 'stripe', label: 'Stripe' },
    { id: 'smtp', label: 'Email SMTP (avisos)' },
  ];

  const oauthSubItems = [
    { id: 'google', label: 'Google' },
    { id: 'microsoft', label: 'Microsoft' },
    { id: 'slack', label: 'Slack' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'reddit', label: 'Reddit' },
    { id: 'twitter', label: 'Twitter/X' },
  ];

  const tabs: { id: SettingsTab; label: string; subItems: { id: string; label: string }[] }[] = [
    { id: 'account', label: 'Cuenta', subItems: accountSubItems },
    { id: 'company', label: 'Empresa', subItems: companySubItems },
    { id: 'connections', label: 'Conexiones', subItems: connectionsSubItems },
    { id: 'oauth', label: 'OAuth', subItems: oauthSubItems },
  ];

  // Only the agency sees company/connection settings; clients and registered visitors just get their own account
  const visibleTabs = role !== 'agency' ? tabs.filter(t => t.id === 'account') : tabs;
  const activeSubItems = visibleTabs.find(t => t.id === activeTab)?.subItems || [];

  return (
    <SettingsContext.Provider value={{ activeTab, isTeams, loading }}>
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header + Apple-style two-tier tab nav */}
        <div className="flex-shrink-0 border-b border-gray-800 px-6 pt-6">
          <h1 className="text-lg font-semibold text-white uppercase tracking-wide mb-5">Ajustes</h1>
          {visibleTabs.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide -mb-px">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => goToAnchor(tab.id)}
                  className={cn(
                    'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                    activeTab === tab.id
                      ? 'border-[var(--signal)] text-white'
                      : 'border-transparent text-white/50 hover:text-white'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sub-item chip row for the active tab */}
        {activeSubItems.length > 1 && (
          <div className="flex-shrink-0 px-6 py-3 border-b border-gray-800 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {activeSubItems.map((sub) => (
              <button
                key={sub.id}
                onClick={() => goToAnchor(activeTab, sub.id)}
                className="px-3 py-1.5 rounded-full text-xs card-liquid text-white/60 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

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
