'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarX, Check, Mail, MessageCircle, Phone, PhoneCall, X } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { usePortalRoleContext } from '@/app/portal/context';
import { useLeadsContext, upcomingCalls } from '@/app/portal/leads/context';
import type { Lead } from '@/app/portal/leads/context';
import LeadDetailModal from '@/components/portal/LeadDetailModal';
import { statusMeta, whatsappUrl } from '@/components/portal/leadMeta';
import { EmptyState, Page, Skeleton, untilLabel } from '@/components/portal/ui';
import { addDays, callDayKey, formatCallDate, formatCallTime, todayInBookingTz } from '@/lib/booking';
import { cn } from '@/lib/utils';

type Tab = 'upcoming' | 'unmarked' | 'done' | 'cancelled';

const TABS: { value: Tab; label: string }[] = [
  { value: 'upcoming', label: 'Próximas' },
  { value: 'unmarked', label: 'Sin marcar' },
  { value: 'done', label: 'Realizadas' },
  { value: 'cancelled', label: 'Canceladas' },
];

function dayHeading(key: string, today: string): string {
  if (key === today) return 'Hoy';
  if (key === addDays(today, 1)) return 'Mañana';
  return formatCallDate(new Date(`${key}T12:00:00Z`), { withYear: key.slice(0, 4) !== today.slice(0, 4) });
}

const weekday = (key: string) => new Intl.DateTimeFormat('es-ES', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${key}T12:00:00Z`)).replace('.', '');
const dayNum = (key: string) => key.slice(8).replace(/^0/, '');

export default function CallsPage() {
  const { session } = useAuth();
  const { role, loading: roleLoading } = usePortalRoleContext();
  const { leads, loading, refetch } = useLeadsContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [day, setDay] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!roleLoading && role !== 'agency') router.replace('/portal');
  }, [role, roleLoading, router]);

  const openParam = searchParams?.get('open');
  useEffect(() => {
    if (openParam) setSelectedId(openParam);
  }, [openParam]);

  const today = todayInBookingTz();

  const groups = useMemo(() => {
    const calls = leads.filter((l) => l.kind === 'call' && l.call_at);
    const upcoming = upcomingCalls(calls, now);
    const upcomingIds = new Set(upcoming.map((l) => l.id));
    const byTime = (asc: boolean) => (a: Lead, b: Lead) =>
      (new Date(a.call_at!).getTime() - new Date(b.call_at!).getTime()) * (asc ? 1 : -1);
    return {
      upcoming,
      unmarked: calls.filter((l) => l.status === 'new' && !upcomingIds.has(l.id)).sort(byTime(false)),
      done: calls.filter((l) => l.status === 'contacted' || l.status === 'won').sort(byTime(false)),
      cancelled: calls.filter((l) => l.status === 'lost').sort(byTime(false)),
    };
  }, [leads, now]);

  // Tira de 7 días con el número de llamadas de cada uno
  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const key = addDays(today, i);
        return { key, count: groups.upcoming.filter((l) => callDayKey(l.call_at!) === key).length };
      }),
    [groups.upcoming, today]
  );

  const list = tab === 'upcoming' && day ? groups.upcoming.filter((l) => callDayKey(l.call_at!) === day) : groups[tab];
  const byDay = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const l of list) {
      const k = callDayKey(l.call_at!);
      map.set(k, [...(map.get(k) || []), l]);
    }
    return Array.from(map.entries());
  }, [list]);

  const setStatus = async (lead: Lead, status: Lead['status']) => {
    if (!session?.access_token) return;
    setBusyId(lead.id);
    try {
      await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status }),
      });
      await refetch();
    } finally {
      setBusyId(null);
    }
  };

  const closeModal = () => {
    setSelectedId(null);
    if (openParam) router.replace('/portal/calls');
  };

  if (role !== 'agency') return null;
  if (loading) {
    return (
      <Page title="Llamadas" width="max-w-4xl">
        <Skeleton className="h-20" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </Page>
    );
  }

  const selected = selectedId ? leads.find((l) => l.id === selectedId) || null : null;
  const totalCalls = leads.filter((l) => l.kind === 'call').length;
  const nextId = groups.upcoming[0]?.id;

  return (
    <Page title="Llamadas" subtitle={totalCalls > 0 ? 'Agenda de llamadas reservadas desde la web' : undefined} width="max-w-4xl">
      {/* Semana */}
      <div className="card-liquid rounded-3xl p-2.5 md:p-3 pn-in">
        <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Filtrar por día">
          {week.map((d) => {
            const active = tab === 'upcoming' && day === d.key;
            return (
              <button
                key={d.key}
                onClick={() => { setTab('upcoming'); setDay(active ? null : d.key); }}
                aria-pressed={active}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 rounded-2xl py-2 md:py-2.5 transition-all cursor-pointer border',
                  active ? 'bg-[var(--signal)] text-black border-transparent shadow-[0_0_20px_-4px_var(--signal)]' : 'bg-white/[0.03] border-transparent hover:border-[var(--portal-line-strong)]'
                )}
              >
                <span className={cn('text-[10px] uppercase tracking-wider font-mono', active ? 'text-black/70' : 'text-white/45')}>{d.key === today ? 'Hoy' : weekday(d.key)}</span>
                <span className="font-kinetic text-lg leading-none">{dayNum(d.key)}</span>
                <span className={cn('h-1.5 w-1.5 rounded-full mt-0.5', d.count > 0 ? (active ? 'bg-black' : 'bg-[var(--signal)] shadow-[0_0_8px_var(--signal)]') : 'bg-transparent')} aria-hidden="true" />
                {d.count > 0 && <span className="sr-only">{d.count} llamadas</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1" role="tablist" aria-label="Filtro de llamadas">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => { setTab(t.value); setDay(null); }}
            className="pn-chip"
          >
            {t.label}
            <span className={cn('tabular-nums', tab === t.value ? 'text-black/60' : t.value === 'unmarked' && groups.unmarked.length > 0 ? 'text-[var(--signal)]' : 'text-white/35')}>{groups[t.value].length}</span>
          </button>
        ))}
      </div>

      {tab === 'unmarked' && groups.unmarked.length > 0 && (
        <p className="text-xs text-white/45">Llamadas cuya hora ya pasó y siguen sin marcar como realizadas o canceladas.</p>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={tab === 'cancelled' ? <CalendarX className="w-6 h-6" /> : <PhoneCall className="w-6 h-6" />}
          title={totalCalls === 0 ? 'Aún no hay llamadas' : 'Nada por aquí'}
          text={
            totalCalls === 0
              ? 'Cuando alguien agende una llamada desde tu web, la verás en esta agenda.'
              : tab === 'upcoming'
                ? day ? 'No hay llamadas ese día.' : 'No tienes llamadas próximas.'
                : 'No hay llamadas en esta categoría.'
          }
        />
      ) : (
        byDay.map(([d, items]) => (
          <section key={d}>
            <h2 className="pn-title mb-2.5 px-1">{dayHeading(d, today)}</h2>
            <ul className="space-y-2.5">
              {items.map((l, idx) => {
                const meta = statusMeta(l.status, 'call');
                const actionable = l.status === 'new';
                const wa = whatsappUrl(l.phone);
                const isNext = l.id === nextId;
                return (
                  <li
                    key={l.id}
                    className={cn('card-liquid rounded-3xl pn-in overflow-hidden', isNext && 'shadow-[0_0_0_1px_var(--portal-line-strong),0_20px_60px_-30px_var(--portal-glow)]')}
                    style={{ animationDelay: `${Math.min(idx, 6) * 40}ms` }}
                  >
                    <div className="flex items-stretch">
                      <button onClick={() => setSelectedId(l.id)} className="flex-1 min-w-0 flex items-center gap-3 md:gap-5 p-4 md:p-5 text-left cursor-pointer">
                        <div className="w-[62px] shrink-0">
                          <div className="font-kinetic text-xl text-[var(--signal)] leading-none">{formatCallTime(l.call_at!)}</div>
                          {actionable && tab === 'upcoming' && <div className={cn('text-[11px] mt-1.5', isNext ? 'text-[var(--signal)] font-semibold' : 'text-white/40')}>{untilLabel(l.call_at!, now)}</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm md:text-base font-semibold truncate">
                            {l.name}{l.company ? <span className="text-white/45 font-normal"> · {l.company}</span> : null}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-white/45 mt-1 min-w-0">
                            {l.phone && <span className="flex items-center gap-1 shrink-0"><Phone className="w-3 h-3" />{l.phone}</span>}
                            {l.email && <span className="hidden sm:flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" />{l.email}</span>}
                          </div>
                          {l.answers?.needs?.length ? (
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {l.answers.needs.map((n) => <span key={n} className="pn-chip" style={{ fontSize: 11, padding: '2px 9px' }}>{n}</span>)}
                            </div>
                          ) : null}
                        </div>
                        {!actionable && (
                          <span className={cn('px-2.5 py-0.5 text-xs rounded-full inline-flex items-center gap-1.5 shrink-0', meta.badgeClass)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotColor)} />
                            {meta.label}
                          </span>
                        )}
                      </button>

                      {(l.phone || actionable) && (
                        <div className="flex flex-col justify-center gap-1.5 p-3 border-l border-white/10 shrink-0">
                          {l.phone && (
                            <div className="flex gap-1.5">
                              <a href={`tel:${l.phone.replace(/[^\d+]/g, '')}`} aria-label={`Llamar a ${l.name}`} className="w-10 h-10 rounded-xl border border-white/12 flex items-center justify-center hover:border-[var(--portal-line-strong)] hover:text-[var(--signal)]">
                                <Phone className="w-4 h-4" />
                              </a>
                              {wa && (
                                <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp a ${l.name}`} className="w-10 h-10 rounded-xl border border-white/12 flex items-center justify-center hover:border-[var(--portal-line-strong)] text-green-400">
                                  <MessageCircle className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          )}
                          {actionable && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setStatus(l, 'contacted')}
                                disabled={busyId === l.id}
                                className="flex-1 flex items-center justify-center gap-1 px-3 h-9 rounded-xl text-xs font-semibold portal-cta disabled:opacity-50 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Realizada</span>
                              </button>
                              <button
                                onClick={() => setStatus(l, 'lost')}
                                disabled={busyId === l.id}
                                aria-label="Cancelar llamada"
                                className="w-9 h-9 rounded-xl border border-white/12 flex items-center justify-center text-white/50 hover:text-red-400 hover:border-red-400/40 disabled:opacity-50 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <LeadDetailModal lead={selected} onClose={closeModal} accessToken={session?.access_token} onChange={refetch} allLeads={leads} onOpenLead={setSelectedId} />
    </Page>
  );
}
