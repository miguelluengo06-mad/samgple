import type { Lead } from '@/app/portal/leads/context';

export type LeadStatus = Lead['status'];

interface StatusMeta {
  label: string;
  badgeClass: string;
  dotColor: string;
}

const BASE: Record<LeadStatus, Omit<StatusMeta, 'label'>> = {
  new: { badgeClass: 'bg-[var(--signal)]/15 text-[var(--signal)] border border-[var(--signal)]/30', dotColor: 'bg-[var(--signal)]' },
  contacted: { badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', dotColor: 'bg-blue-400' },
  won: { badgeClass: 'bg-olive-500/10 text-olive-400 border border-olive-500/20', dotColor: 'bg-olive-400' },
  lost: { badgeClass: 'bg-gray-800/30 text-gray-400 border border-gray-700', dotColor: 'bg-gray-500' },
};

const REQUEST_LABELS: Record<LeadStatus, string> = { new: 'Nuevo', contacted: 'Contactado', won: 'Ganado', lost: 'Perdido' };
// Same pipeline, worded for a scheduled call
const CALL_LABELS: Record<LeadStatus, string> = { new: 'Agendada', contacted: 'Realizada', won: 'Ganada', lost: 'Cancelada' };

export function statusMeta(status: LeadStatus, kind: Lead['kind'] = 'proposal'): StatusMeta {
  return { ...BASE[status], label: (kind === 'call' ? CALL_LABELS : REQUEST_LABELS)[status] };
}

export function statusOptions(kind: Lead['kind']): { value: LeadStatus; label: string }[] {
  const labels = kind === 'call' ? CALL_LABELS : REQUEST_LABELS;
  return (Object.keys(labels) as LeadStatus[]).map((value) => ({ value, label: labels[value] }));
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora mismo';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Date(dateStr).toLocaleDateString('es-ES');
}
