'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarX, Check, Mail, Phone, PhoneCall, X } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { usePortalRoleContext } from '@/app/portal/context';
import { useLeadsContext, upcomingCalls } from '@/app/portal/leads/context';
import type { Lead } from '@/app/portal/leads/context';
import PageHeader from '@/components/portal/PageHeader';
import LeadDetailModal from '@/components/portal/LeadDetailModal';
import { statusMeta } from '@/components/portal/leadMeta';
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

export default function CallsPage() {
  const { session } = useAuth();
  const { role, loading: roleLoading } = usePortalRoleContext();
  const { leads, loading, refetch } = useLeadsContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && role !== 'agency') router.replace('/portal');
  }, [role, roleLoading, router]);

  const openParam = searchParams?.get('open');
  useEffect(() => {
    if (openParam) setSelectedId(openParam);
  }, [openParam]);

  const groups = useMemo(() => {
    const calls = leads.filter((l) => l.kind === 'call' && l.call_at);
    const upcoming = upcomingCalls(calls);
    const upcomingIds = new Set(upcoming.map((l) => l.id));
    const byTime = (asc: boolean) => (a: Lead, b: Lead) =>
      (new Date(a.call_at!).getTime() - new Date(b.call_at!).getTime()) * (asc ? 1 : -1);
    return {
      upcoming,
      unmarked: calls.filter((l) => l.status === 'new' && !upcomingIds.has(l.id)).sort(byTime(false)),
      done: calls.filter((l) => l.status === 'contacted' || l.status === 'won').sort(byTime(false)),
      cancelled: calls.filter((l) => l.status === 'lost').sort(byTime(false)),
    };
  }, [leads]);

  const list = groups[tab];
  const today = todayInBookingTz();
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
  if (loading) return <div className="flex-1" />;

  const selected = selectedId ? leads.find((l) => l.id === selectedId) || null : null;
  const totalCalls = leads.filter((l) => l.kind === 'call').length;

  return (
    <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
      <PageHeader title="Llamadas" subtitle={totalCalls > 0 ? 'Agenda de llamadas reservadas desde la web' : undefined} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-5 max-w-4xl">
          <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Filtro de llamadas">
            {TABS.map((t) => (
              <button
                key={t.value}
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer',
                  tab === t.value ? 'bg-[var(--signal)] text-black' : 'card-liquid text-white/60 hover:text-white'
                )}
              >
                {t.label}
                <span className={cn('ml-1.5', tab === t.value ? 'text-black/60' : t.value === 'unmarked' && groups.unmarked.length > 0 ? 'text-[var(--signal)]' : 'text-white/30')}>
                  {groups[t.value].length}
                </span>
              </button>
            ))}
          </div>

          {tab === 'unmarked' && groups.unmarked.length > 0 && (
            <p className="text-xs text-white/40">Llamadas cuya hora ya pasó y siguen sin marcar como realizadas o canceladas.</p>
          )}

          {list.length === 0 ? (
            <div className="text-center py-16">
              <div className="icon-badge icon-badge-neutral w-16 h-16 rounded-2xl mx-auto mb-4">
                {tab === 'cancelled' ? <CalendarX className="w-8 h-8 text-white/90" /> : <PhoneCall className="w-8 h-8 text-white/90" />}
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {totalCalls === 0 ? 'Aún no hay llamadas' : 'Nada por aquí'}
              </h3>
              <p className="text-sm text-white/50 max-w-sm mx-auto">
                {totalCalls === 0
                  ? 'Cuando alguien agende una llamada desde tu web, la verás en esta agenda.'
                  : tab === 'upcoming'
                    ? 'No tienes llamadas próximas.'
                    : 'No hay llamadas en esta categoría.'}
              </p>
            </div>
          ) : (
            byDay.map(([day, items]) => (
              <section key={day}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40 mb-2">{dayHeading(day, today)}</h2>
                <ul className="space-y-2">
                  {items.map((l) => {
                    const meta = statusMeta(l.status, 'call');
                    const actionable = l.status === 'new';
                    return (
                      <li key={l.id} className="card-liquid rounded-xl flex items-stretch">
                        <button onClick={() => setSelectedId(l.id)} className="flex-1 min-w-0 flex items-center gap-4 p-4 text-left cursor-pointer">
                          <div className="font-kinetic text-xl text-olive-600 dark:text-[var(--signal)] w-16 shrink-0">{formatCallTime(l.call_at!)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold truncate">
                              {l.name}{l.company ? <span className="text-white/40 font-normal"> · {l.company}</span> : null}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5 min-w-0">
                              {l.phone && <span className="flex items-center gap-1 shrink-0"><Phone className="w-3 h-3" />{l.phone}</span>}
                              <span className="hidden sm:flex items-center gap-1 truncate"><Mail className="w-3 h-3 shrink-0" />{l.email}</span>
                            </div>
                            {l.answers?.needs?.length ? (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {l.answers.needs.map((n) => (
                                  <span key={n} className="px-2 py-0.5 rounded-full border border-white/10 text-[11px] text-white/50">{n}</span>
                                ))}
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
                        {actionable && (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 p-3 border-l border-white/10">
                            <button
                              onClick={() => setStatus(l, 'contacted')}
                              disabled={busyId === l.id}
                              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--signal)] text-black hover:bg-[var(--signal-dim)] disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Realizada
                            </button>
                            <button
                              onClick={() => setStatus(l, 'lost')}
                              disabled={busyId === l.id}
                              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/50 hover:text-red-400 border border-white/10 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" /> Cancelar
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>

      <LeadDetailModal lead={selected} onClose={closeModal} accessToken={session?.access_token} onChange={refetch} />
    </div>
  );
}
