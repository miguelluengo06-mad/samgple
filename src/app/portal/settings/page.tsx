'use client';

import { useEffect } from 'react';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { AgencyBranding } from '@/components/settings/AgencyBranding';
import { AuthenticationSettings } from '@/components/settings/AuthenticationSettings';
import { TeamMembers } from '@/components/settings/TeamMembers';
import { PlatformSettings } from '@/components/settings/PlatformSettings';
import { useSettingsContext } from './context';

export default function PortalSettingsPage() {
  const { activeTab, loading } = useSettingsContext();

  // Scroll to hash target once loading finishes and content is rendered
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [loading, activeTab]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 md:px-8 pb-10 pt-2">
        {activeTab === 'account' && (
          <div className='space-y-8'>
            <section id='account-settings' className='scroll-mt-24'>
              <h2 className='pn-title mb-4'>Cuenta</h2>
              <AccountSettings />
            </section>
          </div>
        )}

        {activeTab === 'company' && (
          <>
            <section id="team-members" className='scroll-mt-24 mb-8'>
              <h2 className='pn-title mb-4'>Equipo</h2>
              <TeamMembers />
            </section>

            <div className='space-y-8'>
              <section id="branding" className='scroll-mt-24'>
                <h2 className='pn-title mb-4'>Nombre y logo</h2>
                <AgencyBranding />
              </section>
            </div>

            <section id="authentication" className='scroll-mt-24 mt-8'>
              <h2 className='pn-title mb-4'>Acceso y autenticación</h2>
              <AuthenticationSettings />
            </section>
          </>
        )}

        {activeTab === 'connections' && (
          <div className='space-y-8'>
            <PlatformSettings />
          </div>
        )}

      </div>
    </div>
  );
}
