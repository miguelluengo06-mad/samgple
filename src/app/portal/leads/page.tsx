'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Inbox, Building2, Mail, Phone, Search, PhoneCall } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useLeadsContext } from './context';
import type { Lead } from './context';
import { cn } from '@/lib/utils';
import LeadDetailModal from '@/components/portal/LeadDetailModal';
import { statusMeta, timeAgo } from '@/components/portal/leadMeta';
import { formatCallDate, formatCallTime } from '@/lib/booking';

type StatusFilter = 'all' | Lead['status'];
type KindFilter = 'all' | Lead['kind'];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'new', label: 'Nuevas' },
  { value: 'contacted', label: 'Contactadas' },
  { value: 'won', label: 'Ganadas' },
  { value: 'lost', label: 'Perdidas' },
];

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: 'proposal', label: 'Propuestas' },
  { value: 'call', label: 'Llamadas' },
];

export default function LeadsPage() {
  const { session } = useAuth();
  const { leads, loading, refetch } = useLeadsContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [kind, setKind] = useState<KindFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // /portal/leads?open=<id> — deep link from the dashboard
  const openParam = searchParams?.get('open');
  useEffect(() => {
    if (openParam) setSelectedId(openParam);
  }, [openParam]);

  const closeModal = () => {
    setSelectedId(null);
    if (openParam) router.replace('/portal/leads');
  };

  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (kind !== 'all' && l.kind !== kind) return false;
      if (!q) return true;
      return [l.name, l.email, l.company, l.phone, l.message].some((v) => v?.toLowerCase().includes(q));
    });
  }, [leads, kind, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: scoped.length, new: 0, contacted: 0, won: 0, lost: 0 };
    for (const l of scoped) c[l.status] = (c[l.status] || 0) + 1;
    return c;
  }, [scoped]);

  const filtered = status === 'all' ? scoped : scoped.filter((l) => l.status === status);
  const selected = selectedId ? leads.find((l) => l.id === selectedId) || null : null;

  if (loading) return null;

  if (leads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="icon-badge icon-badge-neutral w-16 h-16 rounded-2xl mx-auto mb-4">
            <Inbox className="w-8 h-8 text-white/90" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Sin solicitudes todavía</h3>
          <p className="text-white/60 text-base">
            Cuando alguien agende una llamada o pida una propuesta desde tu web pública, aparecerá aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                aria-pressed={status === f.value}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer',
                  status === f.value ? 'bg-[var(--signal)] text-black' : 'card-liquid text-white/60 hover:text-white'
                )}
              >
                {f.label}
                <span className={cn('ml-1.5', status === f.value ? 'text-black/60' : 'text-white/30')}>{counts[f.value] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-white/10 p-0.5" role="group" aria-label="Tipo">
              {KIND_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setKind(f.value)}
                  aria-pressed={kind === f.value}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer',
                    kind === f.value ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 lg:flex-none">
              <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                aria-label="Buscar solicitudes"
                className="w-full lg:w-56 pl-9 pr-3 py-2 card-liquid rounded-full text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-[var(--signal)]"
              />
            </div>
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-white/40 py-16">Ninguna solicitud coincide con los filtros.</p>
        ) : (
          <div className="card-liquid rounded-2xl overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[11px] uppercase tracking-widest text-white/30 border-b border-white/10">
              <div className="col-span-4">Contacto</div>
              <div className="col-span-2">Tipo</div>
              <div className="col-span-3">Mensaje</div>
              <div className="col-span-2">Estado</div>
              <div className="col-span-1 text-right">Recibida</div>
            </div>
            <ul className="divide-y divide-white/10">
              {filtered.map((lead) => {
                const meta = statusMeta(lead.status, lead.kind);
                const isCall = lead.kind === 'call' && !!lead.call_at;
                return (
                  <li key={lead.id}>
                    <button
                      onClick={() => setSelectedId(lead.id)}
                      className="w-full text-left grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-1.5 px-5 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer items-center"
                    >
                      <div className="md:col-span-4 min-w-0">
                        <div className="flex items-center gap-2 justify-between md:justify-start">
                          <span className="text-sm font-semibold text-white truncate">{lead.name}</span>
                          <span className={cn('md:hidden px-2 py-0.5 text-[11px] rounded-full inline-flex items-center gap-1.5 shrink-0', meta.badgeClass)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotColor)} />
                            {meta.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5 min-w-0">
                          {lead.email ? (
                            <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" />{lead.email}</span>
                          ) : lead.phone ? (
                            <span className="flex items-center gap-1 truncate"><Phone className="w-3 h-3 shrink-0" />{lead.phone}</span>
                          ) : null}
                          {lead.company && <span className="hidden xl:flex items-center gap-1 truncate"><Building2 className="w-3 h-3 shrink-0" />{lead.company}</span>}
                        </div>
                      </div>
                      <div className="md:col-span-2 text-xs">
                        {isCall ? (
                          <span className="inline-flex items-center gap-1.5 text-olive-600 dark:text-[var(--signal)]">
                            <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                            <span>{formatCallDate(lead.call_at!).split(',')[0]} {formatCallTime(lead.call_at!)}</span>
                          </span>
                        ) : (
                          <span className="text-white/50">{lead.answers?.order ? `Compra · ${lead.answers.order.amount_eur.toLocaleString('es-ES')} €` : lead.answers?.pack?.id === 'welcome' ? 'Pack Bienvenida' : lead.source === 'landing' ? 'Landing' : 'Propuesta'}</span>
                        )}
                      </div>
                      <p className="md:col-span-3 text-sm text-white/50 line-clamp-1">{lead.message}</p>
                      <div className="hidden md:block md:col-span-2">
                        <span className={cn('px-2.5 py-0.5 text-xs rounded-full inline-flex items-center gap-1.5', meta.badgeClass)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotColor)} />
                          {meta.label}
                        </span>
                      </div>
                      <div className="md:col-span-1 text-xs text-white/30 md:text-right">{timeAgo(lead.created_at)}</div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <LeadDetailModal lead={selected} onClose={closeModal} accessToken={session?.access_token} onChange={refetch} />
    </div>
  );
}
