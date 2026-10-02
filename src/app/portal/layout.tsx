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
  const { role, passkeyRequired, loading: roleLoading } = usePortalRole();
  const { signOut } = useAuth();

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

  // Los clientes tienen su propio panel (/cuenta); /portal es solo para la agencia.
  // (Si es del equipo pero entró sin passkey, se queda aquí para ver el aviso.)
  useEffect(() => {
    if (authLoading || roleLoading || !user) return;
    if (role !== 'agency' && !passkeyRequired) router.replace('/cuenta');
  }, [authLoading, roleLoading, user, role, passkeyRequired, pathname, router]);

  if (authLoading || !user || roleLoading || (role !== 'agency' && !passkeyRequired)) {
    return <BrandedLoadingSpinner logoUrl={logoUrl} />;
  }

  // Persona del equipo con la sesión abierta sin passkey: solo se le pide que vuelva a entrar con él
  if (passkeyRequired) {
    return (
      <div className="portal-ui min-h-[100dvh] flex items-center justify-center px-4">
        <div className="card-liquid rounded-3xl p-8 max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Entra con tu passkey</h1>
          <p className="text-sm text-white/65">Tu cuenta de administración se protege con huella, cara o PIN del móvil. Cierra esta sesión y entra con «Entrar con huella o passkey».</p>
          <button
            onClick={async () => {
              await signOut();
              window.location.href = '/auth';
            }}
            className="px-6 h-11 rounded-full portal-cta text-sm cursor-pointer"
          >
            Cerrar sesión y entrar con passkey
          </button>
        </div>
      </div>
    );
  }

  return (
    <PortalRoleContext.Provider value={{ role, passkeyRequired, loading: roleLoading }}>
      <LeadsProvider enabled={role === 'agency'}>
        <div className="portal-ui h-[100dvh] flex flex-col">
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
