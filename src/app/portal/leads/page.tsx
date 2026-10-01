'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Inbox, Building2, Mail, Phone, Search, PhoneCall, BadgeCheck, Hourglass, MessageCircle, BellRing } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useLeadsContext } from './context';
import type { Lead } from './context';
import { isPendingCall, upcomingCalls } from './context';
import { cn } from '@/lib/utils';
import LeadDetailModal from '@/components/portal/LeadDetailModal';
import { contactKeys, statusMeta, timeAgo, whatsappUrl } from '@/components/portal/leadMeta';
import { addDays, callDayKey, formatCallDate, formatCallTime, todayInBookingTz } from '@/lib/booking';

type StatusFilter = 'all' | Lead['status'];
type ViewFilter = 'all' | 'todo' | 'call' | 'paid' | 'possible';

/** Pagado = hay una compra real registrada; posible compra = aún sin pagar y sin descartar. */
const isPaid = (l: Lead) => !!l.answers?.order && l.answers.order.livemode !== false;
const isPossible = (l: Lead) => !l.answers?.order && (l.status === 'new' || l.status === 'contacted');

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'new', label: 'Nuevas' },
  { value: 'contacted', label: 'Contactadas' },
  { value: 'won', label: 'Ganadas' },
  { value: 'lost', label: 'Perdidas' },
];

/** «Hoy 17:00», «Mañana 10:00» o «mar 14 oct 17:00». */
function callWhen(iso: string): string {
  const today = todayInBookingTz();
  const key = callDayKey(iso);
  const day = key === today ? 'Hoy' : key === addDays(today, 1) ? 'Mañana' : formatCallDate(iso).split(',')[0];
  return `${day} ${formatCallTime(iso)}`;
}

export default function LeadsPage() {
  const { session } = useAuth();
  const { leads, loading, refetch } = useLeadsContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [view, setView] = useState<ViewFilter>('all');
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

  // Llamada próxima de cada persona: la suya propia o la de otra solicitud con el mismo email / teléfono
  const callOf = useMemo(() => {
    const byKey = new Map<string, Lead>();
    for (const c of upcomingCalls(leads.filter((l) => l.kind === 'call'))) {
      for (const k of contactKeys(c)) if (!byKey.has(k)) byKey.set(k, c);
    }
    return (l: Lead): Lead | null => {
      if (isPendingCall(l)) return l;
      for (const k of contactKeys(l)) {
        const c = byKey.get(k);
        if (c) return c;
      }
      return null;
    };
  }, [leads]);

  const matchesView = (l: Lead, v: ViewFilter) => {
    if (v === 'todo') return l.status === 'new' && !isPaid(l) && l.source !== 'cart';
    if (v === 'call') return !!callOf(l);
    if (v === 'paid') return isPaid(l);
    if (v === 'possible') return isPossible(l);
    return true;
  };

  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (!matchesView(l, view)) return false;
      if (!q) return true;
      return [l.name, l.email, l.company, l.phone, l.message].some((v) => v?.toLowerCase().includes(q));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, view, query, callOf]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: scoped.length, new: 0, contacted: 0, won: 0, lost: 0 };
    for (const l of scoped) c[l.status] = (c[l.status] || 0) + 1;
    return c;
  }, [scoped]);

  const totals = useMemo(() => {
    let paid = 0;
    let revenue = 0;
    let possible = 0;
    let todo = 0;
    let withCall = 0;
    for (const l of leads) {
      if (isPaid(l)) {
        paid += 1;
        revenue += Math.max(0, (l.answers!.order!.amount_eur || 0) - (l.answers!.order!.refunded_eur || 0));
      } else if (isPossible(l)) possible += 1;
      if (l.status === 'new' && !isPaid(l) && l.source !== 'cart') todo += 1;
      if (callOf(l)) withCall += 1;
    }
    return { paid, revenue, possible, todo, withCall };
  }, [leads, callOf]);

  const filtered = (status === 'all' ? scoped : scoped.filter((l) => l.status === status)).slice().sort((a, b) => {
    // Con llamada próxima primero (por fecha); el resto, lo más reciente arriba
    const ca = callOf(a);
    const cb = callOf(b);
    if (ca && cb) return new Date(ca.call_at!).getTime() - new Date(cb.call_at!).getTime();
    if (ca) return -1;
    if (cb) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
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
        {/* Resumen: cada tarjeta filtra la lista */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { v: 'todo', label: 'Por contactar', value: String(totals.todo), icon: BellRing, tone: 'text-yellow-400', hint: 'Nuevas sin atender' },
            { v: 'call', label: 'Llamada agendada', value: String(totals.withCall), icon: PhoneCall, tone: 'text-blue-400', hint: 'Próximas llamadas' },
            { v: 'paid', label: 'Han comprado', value: String(totals.paid), icon: BadgeCheck, tone: 'text-green-400', hint: `${totals.revenue.toLocaleString('es-ES')} € cobrados` },
            { v: 'possible', label: 'Posibles compras', value: String(totals.possible), icon: Hourglass, tone: 'text-yellow-400', hint: 'Sin pagar aún' },
          ] as const).map((k) => (
            <button
              key={k.v}
              onClick={() => setView(view === k.v ? 'all' : k.v)}
              aria-pressed={view === k.v}
              className={cn(
                'card-liquid rounded-2xl p-4 text-left cursor-pointer transition-shadow',
                view === k.v && 'ring-2 ring-[var(--signal)] ring-offset-2 ring-offset-transparent'
              )}
            >
              <div className="text-[11px] uppercase tracking-widest text-white/40 mb-1 flex items-center gap-1.5">
                <k.icon className={cn('w-3.5 h-3.5', k.tone)} /> {k.label}
              </div>
              <div className="text-2xl font-semibold tabular-nums">{k.value}</div>
              <div className="text-xs text-white/40 mt-0.5 truncate">{k.hint}</div>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                aria-pressed={status === f.value}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer whitespace-nowrap border',
                  status === f.value ? 'bg-[var(--signal)] text-black border-[var(--portal-line-strong)]' : 'bg-white/[0.04] text-white/60 hover:text-white border-[var(--portal-line)]'
                )}
              >
                {f.label}
                <span className={cn('ml-1.5', status === f.value ? 'text-black/60' : 'text-white/30')}>{counts[f.value] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nombre, email, teléfono…"
              aria-label="Buscar solicitudes"
              className="w-full lg:w-72 pl-9 pr-3 py-2 bg-white/[0.04] border border-[var(--portal-line-strong)] rounded-full text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-[var(--signal)]"
            />
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-white/40 py-16">Ninguna solicitud coincide con los filtros.</p>
        ) : (
          <ul className="space-y-3">
            {filtered.map((lead) => {
              const meta = statusMeta(lead.status, lead.kind);
              const call = callOf(lead);
              const wa = whatsappUrl(lead.phone);
              const order = lead.answers?.order;
              const origin = order
                ? `Pagado · ${order.amount_eur.toLocaleString('es-ES')} €${order.livemode === false ? ' (prueba)' : ''}`
                : lead.answers?.pack?.id === 'welcome'
                  ? 'Pack Bienvenida'
                  : lead.source === 'cart'
                    ? 'Carrito sin pagar'
                    : lead.source === 'landing'
                      ? 'Landing'
                      : lead.kind === 'call'
                        ? 'Llamada'
                        : 'Propuesta';
              return (
                <li key={lead.id} className="card-liquid rounded-2xl overflow-hidden">
                  <div className="flex items-stretch">
                    <button
                      onClick={() => setSelectedId(lead.id)}
                      className="flex-1 min-w-0 text-left px-4 py-3.5 hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-white truncate">{lead.name}</span>
                            <span className={cn('px-2 py-0.5 text-[11px] rounded-full inline-flex items-center gap-1.5 shrink-0', meta.badgeClass)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotColor)} />
                              {meta.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-x-3 gap-y-0.5 text-xs text-white/50 mt-1 flex-wrap">
                            {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{lead.phone}</span>}
                            {lead.email && <span className="flex items-center gap-1 truncate max-w-[220px]"><Mail className="w-3 h-3 shrink-0" />{lead.email}</span>}
                            {lead.company && <span className="flex items-center gap-1 truncate"><Building2 className="w-3 h-3 shrink-0" />{lead.company}</span>}
                          </div>
                        </div>
                        <span className="text-[11px] text-white/40 shrink-0 pt-0.5">{timeAgo(lead.created_at)}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        {call ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-full px-2.5 py-0.5">
                            <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                            Llamada · {callWhen(call.call_at!)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-white/40 border border-[var(--portal-line)] rounded-full px-2.5 py-0.5">
                            <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                            Sin llamada agendada
                          </span>
                        )}
                        <span className={cn('text-xs', order ? 'text-green-400 font-semibold' : 'text-white/50')}>{origin}</span>
                      </div>
                      {lead.message && lead.kind !== 'call' && <p className="text-sm text-white/50 line-clamp-1 mt-2">{lead.message}</p>}
                    </button>

                    {(lead.phone || lead.email) && (
                      <div className="flex flex-col border-l border-[var(--portal-line)] divide-y divide-[var(--portal-line)] shrink-0 w-12">
                        {lead.phone && (
                          <a href={`tel:${lead.phone}`} aria-label={`Llamar a ${lead.name}`} className="flex-1 flex items-center justify-center hover:bg-white/[0.06] text-white/70">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        {wa && (
                          <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp a ${lead.name}`} className="flex-1 flex items-center justify-center hover:bg-white/[0.06] text-green-400">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} aria-label={`Email a ${lead.name}`} className="flex-1 flex items-center justify-center hover:bg-white/[0.06] text-white/70">
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <LeadDetailModal lead={selected} onClose={closeModal} accessToken={session?.access_token} onChange={refetch} allLeads={leads} onOpenLead={setSelectedId} />
    </div>
  );
}
