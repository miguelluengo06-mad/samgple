import type { Lead } from '@/app/portal/leads/context';
import { statusMeta } from '@/components/portal/leadMeta';

/** Descarga todas las solicitudes (y llamadas) como CSV compatible con Excel. */
export function exportLeadsCsv(leads: Lead[]) {
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
