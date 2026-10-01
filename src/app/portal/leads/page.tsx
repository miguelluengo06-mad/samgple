'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Building2,
  Check,
  Download,
  Hourglass,
  Inbox,
  KanbanSquare,
  List,
  Mail,
  MessageCircle,
  Phone,
  PhoneCall,
  Search,
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { useLeadsContext } from './context';
import type { Lead } from './context';
import { isPendingCall, upcomingCalls } from './context';
import { cn } from '@/lib/utils';
import LeadDetailModal from '@/components/portal/LeadDetailModal';
import { contactKeys, statusMeta, timeAgo, whatsappUrl } from '@/components/portal/leadMeta';
import { EmptyState, Page, Skeleton } from '@/components/portal/ui';
import { addDays, callDayKey, formatCallDate, formatCallTime, todayInBookingTz } from '@/lib/booking';
import { exportLeadsCsv } from '@/lib/leadsCsv';

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

const BOARD: { status: Lead['status']; title: string; next: Lead['status'] | null; nextLabel: string }[] = [
  { status: 'new', title: 'Nuevas', next: 'contacted', nextLabel: 'Contactada' },
  { status: 'contacted', title: 'Contactadas', next: 'won', nextLabel: 'Ganada' },
  { status: 'won', title: 'Ganadas', next: null, nextLabel: '' },
  { status: 'lost', title: 'Perdidas', next: null, nextLabel: '' },
];

/** «Hoy 17:00», «Mañana 10:00» o «mar 14 oct 17:00». */
function callWhen(iso: string): string {
  const today = todayInBookingTz();
  const key = callDayKey(iso);
  const day = key === today ? 'Hoy' : key === addDays(today, 1) ? 'Mañana' : formatCallDate(iso).split(',')[0];
  return `${day} ${formatCallTime(iso)}`;
}

const originOf = (l: Lead) => {
  const order = l.answers?.order;
  if (order) return `Pagado · ${order.amount_eur.toLocaleString('es-ES')} €${order.livemode === false ? ' (prueba)' : ''}`;
  if (l.answers?.pack?.id === 'welcome') return 'Pack Bienvenida';
  if (l.source === 'cart') return 'Carrito sin pagar';
  if (l.source === 'landing') return 'Landing';
  return l.kind === 'call' ? 'Llamada' : 'Propuesta';
};

export default function LeadsPage() {
  const { session } = useAuth();
  const { leads, loading, refetch } = useLeadsContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [view, setView] = useState<ViewFilter>('all');
  const [mode, setMode] = useState<'list' | 'board'>('list');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // La vista (lista o tablero) se recuerda en este navegador
  useEffect(() => {
    try {
      if (localStorage.getItem('leads-mode') === 'board') setMode('board');
    } catch { /* sin almacenamiento */ }
  }, []);
  const changeMode = (m: 'list' | 'board') => {
    setMode(m);
    try { localStorage.setItem('leads-mode', m); } catch { /* ignore */ }
  };

  // /portal/leads?open=<id> — deep link from the dashboard
  const openParam = searchParams?.get('open');
  useEffect(() => {
    if (openParam) setSelectedId(openParam);
  }, [openParam]);

  const closeModal = () => {
    setSelectedId(null);
    if (openParam) router.replace('/portal/leads');
  };

  const move = async (lead: Lead, next: Lead['status']) => {
    if (!session?.access_token) return;
    setBusyId(lead.id);
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status: next }),
      });
      await refetch();
    } finally {
      setBusyId(null);
    }
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

  const sorted = (rows: Lead[]) =>
    rows.slice().sort((a, b) => {
      // Con llamada próxima primero (por fecha); el resto, lo más reciente arriba
      const ca = callOf(a);
      const cb = callOf(b);
      if (ca && cb) return new Date(ca.call_at!).getTime() - new Date(cb.call_at!).getTime();
      if (ca) return -1;
      if (cb) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const filtered = sorted(status === 'all' ? scoped : scoped.filter((l) => l.status === status));
  const selected = selectedId ? leads.find((l) => l.id === selectedId) || null : null;

  const actions = (
    <>
      <div className="hidden sm:flex rounded-full border border-white/12 p-0.5 bg-white/[0.03]" role="group" aria-label="Vista">
        {([['list', List, 'Lista'], ['board', KanbanSquare, 'Tablero']] as const).map(([m, Icon, label]) => (
          <button
            key={m}
            onClick={() => changeMode(m)}
            aria-pressed={mode === m}
            className={cn('flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium cursor-pointer transition-colors', mode === m ? 'bg-[var(--signal)] text-black font-semibold' : 'text-white/55 hover:text-white')}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>
      {leads.length > 0 && (
        <button
          onClick={() => exportLeadsCsv(leads)}
          className="flex items-center gap-1.5 px-3 h-9 border border-white/15 hover:border-[var(--portal-line-strong)] text-white/70 hover:text-white rounded-full text-xs font-medium transition-colors cursor-pointer"
          aria-label="Exportar CSV"
        >
          <Download className="w-4 h-4" />
          <span className="hidden md:inline">Exportar CSV</span>
        </button>
      )}
    </>
  );

  if (loading) {
    return (
      <Page title="Solicitudes">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </Page>
    );
  }

  if (leads.length === 0) {
    return (
      <Page title="Solicitudes">
        <EmptyState
          icon={<Inbox className="w-6 h-6" />}
          title="Sin solicitudes todavía"
          text="Cuando alguien agende una llamada o pida una propuesta desde tu web pública, aparecerá aquí."
        />
      </Page>
    );
  }

  const Card = ({ lead, compact }: { lead: Lead; compact?: boolean }) => {
    const meta = statusMeta(lead.status, lead.kind);
    const call = callOf(lead);
    const wa = whatsappUrl(lead.phone);
    const order = lead.answers?.order;
    const step = BOARD.find((b) => b.status === lead.status);
    return (
      <div className={cn('card-liquid rounded-3xl overflow-hidden', compact && 'rounded-2xl')}>
        <div className="flex items-stretch">
          <button onClick={() => setSelectedId(lead.id)} className="flex-1 min-w-0 text-left px-4 py-3.5 hover:bg-white/[0.03] transition-colors cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold truncate">{lead.name}</span>
                  {!compact && (
                    <span className={cn('px-2 py-0.5 text-[11px] rounded-full inline-flex items-center gap-1.5 shrink-0', meta.badgeClass)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotColor)} />
                      {meta.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-x-3 gap-y-0.5 text-xs text-white/50 mt-1 flex-wrap">
                  {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{lead.phone}</span>}
                  {!compact && lead.email && <span className="flex items-center gap-1 truncate max-w-[220px]"><Mail className="w-3 h-3 shrink-0" />{lead.email}</span>}
                  {!compact && lead.company && <span className="flex items-center gap-1 truncate"><Building2 className="w-3 h-3 shrink-0" />{lead.company}</span>}
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
              ) : !compact ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-white/40 border border-white/12 rounded-full px-2.5 py-0.5">
                  <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                  Sin llamada agendada
                </span>
              ) : null}
              <span className={cn('text-xs', order ? 'text-green-400 font-semibold' : 'text-white/50')}>{originOf(lead)}</span>
            </div>
            {!compact && lead.message && lead.kind !== 'call' && <p className="text-sm text-white/50 line-clamp-1 mt-2">{lead.message}</p>}
          </button>

          {!compact && (lead.phone || lead.email || (step?.next && lead.kind !== 'call')) && (
            <div className="flex flex-col border-l border-white/10 divide-y divide-white/10 shrink-0 w-12">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} aria-label={`Llamar a ${lead.name}`} className="flex-1 min-h-10 flex items-center justify-center hover:bg-white/[0.06] text-white/70">
                  <Phone className="w-4 h-4" />
                </a>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp a ${lead.name}`} className="flex-1 min-h-10 flex items-center justify-center hover:bg-white/[0.06] text-green-400">
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} aria-label={`Email a ${lead.name}`} className="flex-1 min-h-10 flex items-center justify-center hover:bg-white/[0.06] text-white/70">
                  <Mail className="w-4 h-4" />
                </a>
              )}
              {lead.status === 'new' && lead.kind !== 'call' && (
                <button
                  onClick={() => move(lead, 'contacted')}
                  disabled={busyId === lead.id}
                  aria-label="Marcar como contactada"
                  title="Marcar como contactada"
                  className="flex-1 min-h-10 flex items-center justify-center hover:bg-[var(--signal)]/15 text-[var(--signal)] disabled:opacity-40 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
        {compact && step?.next && lead.kind !== 'call' && (
          <button
            onClick={() => move(lead, step.next!)}
            disabled={busyId === lead.id}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-[var(--signal)] border-t border-white/10 hover:bg-[var(--signal)]/10 disabled:opacity-40 cursor-pointer"
          >
            Pasar a {step.nextLabel} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <Page title="Solicitudes" subtitle={`${leads.length} en total`} actions={actions}>
      {/* Resumen: cada tarjeta filtra la lista */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          { v: 'todo', label: 'Por contactar', value: String(totals.todo), icon: BellRing, tone: 'text-yellow-400', hint: 'Nuevas sin atender' },
          { v: 'call', label: 'Llamada agendada', value: String(totals.withCall), icon: PhoneCall, tone: 'text-blue-400', hint: 'Próximas llamadas' },
          { v: 'paid', label: 'Han comprado', value: String(totals.paid), icon: BadgeCheck, tone: 'text-green-400', hint: `${totals.revenue.toLocaleString('es-ES')} € cobrados` },
          { v: 'possible', label: 'Posibles compras', value: String(totals.possible), icon: Hourglass, tone: 'text-yellow-400', hint: 'Sin pagar aún' },
        ] as const).map((k, i) => (
          <button
            key={k.v}
            onClick={() => setView(view === k.v ? 'all' : k.v)}
            aria-pressed={view === k.v}
            className={cn('card-liquid rounded-3xl p-4 text-left cursor-pointer pn-in', view === k.v && 'shadow-[0_0_0_2px_var(--signal),0_0_30px_-8px_var(--signal)]')}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="pn-title mb-1.5 flex items-center gap-1.5"><k.icon className={cn('w-3.5 h-3.5', k.tone)} /> {k.label}</div>
            <div className="text-2xl md:text-3xl font-semibold tabular-nums">{k.value}</div>
            <div className="text-xs text-white/45 mt-0.5 truncate">{k.hint}</div>
          </button>
        ))}
      </div>

      {/* Barra de filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          {mode === 'list' ? (
            STATUS_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setStatus(f.value)} aria-pressed={status === f.value} className="pn-chip">
                {f.label}
                <span className={cn('tabular-nums', status === f.value ? 'text-black/60' : 'text-white/35')}>{counts[f.value] ?? 0}</span>
              </button>
            ))
          ) : (
            <span className="text-xs text-white/45">Arrastra el trabajo de izquierda a derecha con «Pasar a…».</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="sm:hidden flex rounded-full border border-white/12 p-0.5 bg-white/[0.03]" role="group" aria-label="Vista">
            {([['list', List], ['board', KanbanSquare]] as const).map(([m, Icon]) => (
              <button key={m} onClick={() => changeMode(m)} aria-pressed={mode === m} aria-label={m === 'list' ? 'Lista' : 'Tablero'} className={cn('w-9 h-8 flex items-center justify-center rounded-full cursor-pointer', mode === m ? 'bg-[var(--signal)] text-black' : 'text-white/55')}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <div className="relative flex-1 lg:flex-none">
            <Search className="w-4 h-4 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nombre, email, teléfono…"
              aria-label="Buscar solicitudes"
              className="w-full lg:w-72 pl-10 pr-3 py-2.5 border border-[var(--portal-line-strong)] rounded-full text-sm outline-none placeholder:text-white/30"
            />
          </div>
        </div>
      </div>

      {mode === 'list' ? (
        filtered.length === 0 ? (
          <EmptyState icon={<Search className="w-6 h-6" />} title="Nada coincide" text="Prueba con otros filtros o borra la búsqueda." />
        ) : (
          <ul className="space-y-3">
            {filtered.map((lead, i) => (
              <li key={lead.id} className="pn-in" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                <Card lead={lead} />
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
          {BOARD.map((col) => {
            const rows = sorted(scoped.filter((l) => l.status === col.status));
            return (
              <section key={col.status} className="snap-start shrink-0 w-[82%] sm:w-[48%] md:w-auto min-w-0 flex flex-col gap-2.5">
                <h2 className="pn-title flex items-center justify-between px-1">
                  <span className="flex items-center gap-2"><span className={cn('w-1.5 h-1.5 rounded-full', statusMeta(col.status).dotColor)} />{col.title}</span>
                  <span className="tabular-nums text-white/60">{rows.length}</span>
                </h2>
                {rows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/12 py-8 text-center text-xs text-white/35">Vacío</div>
                ) : (
                  rows.map((lead) => <Card key={lead.id} lead={lead} compact />)
                )}
              </section>
            );
          })}
        </div>
      )}

      <LeadDetailModal lead={selected} onClose={closeModal} accessToken={session?.access_token} onChange={refetch} allLeads={leads} onOpenLead={setSelectedId} />
    </Page>
  );
}
