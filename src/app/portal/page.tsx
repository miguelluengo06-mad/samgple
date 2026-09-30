'use client';

import { usePortalRoleContext } from './context';
import AdminDashboard from '@/components/portal/dashboard/AdminDashboard';
import AccountHome from '@/components/portal/dashboard/AccountHome';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

/**
 * /portal — what you land on after signing in, by role:
 *   agency → Resumen dashboard
 *   client → redirected to /portal/manage by the layout
 *   anyone else (registered visitor) → their own account page
 */
export default function PortalHomePage() {
  const { role, loading } = usePortalRoleContext();

  if (loading || role === 'client') return null;

  return (
    <ErrorBoundary fallbackTitle="Error en el panel" fallbackMessage="Algo ha fallado al cargar el panel. Inténtalo de nuevo.">
      {role === 'agency' ? <AdminDashboard /> : <AccountHome />}
    </ErrorBoundary>
  );
}
