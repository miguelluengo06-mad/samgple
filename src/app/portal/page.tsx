'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePortalRoleContext } from './context';
import AdminDashboard from '@/components/portal/dashboard/AdminDashboard';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

/**
 * /portal — el panel de la agencia (Resumen). Los clientes tienen el suyo en /cuenta.
 */
export default function PortalHomePage() {
  const { role, passkeyRequired, loading } = usePortalRoleContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && role !== 'agency' && !passkeyRequired) router.replace('/cuenta');
  }, [loading, role, passkeyRequired, router]);

  if (loading || role !== 'agency') return null;

  return (
    <ErrorBoundary fallbackTitle="Error en el panel" fallbackMessage="Algo ha fallado al cargar el panel. Inténtalo de nuevo.">
      <AdminDashboard />
    </ErrorBoundary>
  );
}
