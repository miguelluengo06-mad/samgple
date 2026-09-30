'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download } from 'lucide-react';
import { usePortalRoleContext } from '@/app/portal/context';
import { useLeadsContext } from './context';
import type { Lead } from './context';
import PageHeader from '@/components/portal/PageHeader';
import { statusMeta } from '@/components/portal/leadMeta';

function exportLeadsCsv(leads: Lead[]) {
  const headers = ['Tipo', 'Nombre', 'Email', 'Teléfono', 'Empresa', 'Estado', 'Llamada', 'Necesita', 'Presupuesto', 'Cuándo empezar', 'Mensaje', 'Notas', 'Recibida'];
  const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
  const rows = leads.map((l) =>
    [
      l.kind === 'call' ? 'Llamada' : 'Solicitud',
      l.name,
      l.email,
      l.phone || '',
      l.company || '',
      statusMeta(l.status, l.kind).label,
      l.call_at ? new Date(l.call_at).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }) : '',
      l.answers?.needs?.join(', ') || '',
      l.answers?.budget || '',
      l.answers?.timeline || '',
      l.message,
      l.notes || '',
      new Date(l.created_at).toLocaleString('es-ES'),
    ].map(escape).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');

  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `solicitudes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function LeadsLayout({ children }: { children: React.ReactNode }) {
  const { role, loading: roleLoading } = usePortalRoleContext();
  const { leads } = useLeadsContext();
  const router = useRouter();

  // Leads are loaded once for the whole admin by LeadsProvider (see portal/layout.tsx)
  useEffect(() => {
    if (!roleLoading && role !== 'agency') router.replace('/portal');
  }, [role, roleLoading, router]);

  if (role !== 'agency') return null;

  return (
    <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
      <PageHeader
        title="Solicitudes"
        subtitle={leads.length > 0 ? `${leads.length} en total` : undefined}
        actions={
          leads.length > 0 && (
            <button
              onClick={() => exportLeadsCsv(leads)}
              className="flex items-center gap-1.5 px-3 py-2 border border-white/15 hover:bg-white/5 text-white/60 hover:text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
          )
        }
      />
      {children}
    </div>
  );
}
