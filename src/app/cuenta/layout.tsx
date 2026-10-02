'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { usePortalRole } from '@/components/portal/usePortalRole';
import { BrandedLoadingSpinner } from '@/components/ui/loading-logo';
import { ClientProvider } from '@/components/client/ClientProvider';
import { ClientShell } from '@/components/client/ClientShell';
import { isClientPage, type ClientPage } from '@/components/client/types';

/** Panel del cliente (/cuenta): requiere sesión; el equipo de la agencia va a su propio panel. */
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { role, passkeyRequired, loading: roleLoading } = usePortalRole();
  const router = useRouter();
  const params = useParams<{ page?: string[] }>();
  const slug = params?.page?.[0];
  const active: ClientPage = isClientPage(slug) ? slug : 'inicio';

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading && !roleLoading && user && (role === 'agency' || passkeyRequired)) router.replace('/portal');
  }, [authLoading, roleLoading, user, role, passkeyRequired, router]);

  if (authLoading || roleLoading || !user || role === 'agency' || passkeyRequired) return <BrandedLoadingSpinner />;

  return (
    <ClientProvider>
      <ClientShell active={active} hrefFor={(p) => (p === 'inicio' ? '/cuenta' : `/cuenta/${p}`)}>
        {children}
      </ClientShell>
    </ClientProvider>
  );
}
