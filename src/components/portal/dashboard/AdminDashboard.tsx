'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowUpRight, CheckCircle2, Circle, Inbox, CreditCard, PhoneCall, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCallDate, formatCallTime, callDayKey, todayInBookingTz, addDays } from '@/lib/booking';
import { useLeadsContext, newRequests, upcomingCalls } from '@/app/portal/leads/context';
import { statusMeta, timeAgo } from '@/components/portal/leadMeta';
import PageHeader from '@/components/portal/PageHeader';
import ActivityChart from './ActivityChart';

interface StatProps {
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ReactNode;
  href: string;
  highlight?: boolean;
}

function Stat({ label, value, hint, icon, href, highlight }: StatProps) {
  return (
    <Link href={href} className="card-liquid card-liquid-interactive rounded-2xl p-5 flex flex-col gap-3 group">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-white/40">{label}</span>
        <span className={cn('text-white/30 group-hover:text-[var(--signal)] transition-colors', highlight && 'text-[var(--signal)]')}>{icon}</span>
      </div>
      <div className="text-4xl font-semibold tracking-tight tabular-nums leading-none">{value}</div>
      {hint && <div className="text-xs text-white/40">{hint}</div>}
    </Link>
  );
}

function Panel({ title, action, children, className }: { title: string; action?: { label: string; href: string }; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('card-liquid rounded-2xl p-5 md:p-6 flex flex-col', className)}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white">{title}</h2>
        {action && (
          <Link href={action.href} className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-[var(--signal)] transition-colors">
            {action.label} <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

const greeting = () => {
  const hour = Number(new Intl.DateTimeFormat('es-ES', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Madrid' }).format(new Date()));
  return hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';
};

export default function AdminDashboard() {
  const { leads, loading } = useLeadsContext();
  const { user } = useAuth();
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null);

  // ¿Tiene ya la clave de Stripe? (para el paso "Conecta Stripe" de Primeros pasos)
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('agency_stripe_key_set')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setStripeConnected(!!data?.agency_stripe_key_set));
  }, [user]);

  const stats = useMemo(() => {
    const upcoming = upcomingCalls(leads);
    const today = todayInBookingTz();
    const weekEnd = addDays(today, 7);
    const inWeek = upcoming.filter((l) => callDayKey(l.call_at!) <= weekEnd);
    const todayCalls = upcoming.filter((l) => callDayKey(l.call_at!) === today);
    const closed = leads.filter((l) => l.status === 'won' || l.status === 'lost');
    const won = leads.filter((l) => l.status === 'won').length;
    const pipeline = (['new', 'contacted', 'won', 'lost'] as const).map((status) => ({
      status,
      count: leads.filter((l) => l.status === status).length,
    }));
    const orders = leads.filter((l) => l.answers?.order);
    const sales = orders.reduce((sum, l) => sum + (l.answers?.order?.amount_eur || 0), 0);
    return {
      orders: orders.length,
      sales,
      upcoming,
      inWeek: inWeek.length,
      todayCalls: todayCalls.length,
      newCount: newRequests(leads).length,
      winRate: closed.length > 0 ? Math.round((won / closed.length) * 100) : null,
      won,
      pipeline,
      recent: leads.filter((l) => l.kind !== 'call').slice(0, 5),
    };
  }, [leads]);

  const todayLabel = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' }).format(new Date());
  const pipelineMax = Math.max(1, ...stats.pipeline.map((p) => p.count));

  if (loading) return <div className="flex-1" />;

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <PageHeader title="Resumen" subtitle={`${greeting()} · ${todayLabel}`} />

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Stat label="Solicitudes nuevas" value={stats.newCount} hint="Pendientes de respuesta" icon={<Inbox className="w-4 h-4" />} href="/portal/leads" highlight={stats.newCount > 0} />
            <Stat
              label="Llamadas próximas"
              value={stats.inWeek}
              hint={stats.todayCalls > 0 ? `${stats.todayCalls} hoy` : 'Próximos 7 días'}
              icon={<PhoneCall className="w-4 h-4" />}
              href="/portal/calls"
              highlight={stats.todayCalls > 0}
            />
            <Stat
              label="Tasa de cierre"
              value={stats.winRate === null ? '—' : `${stats.winRate}%`}
              hint={`${stats.won} ${stats.won === 1 ? 'ganada' : 'ganadas'}`}
              icon={<Percent className="w-4 h-4" />}
              href="/portal/leads"
            />
            <Stat
              label="Ventas"
              value={`${stats.sales.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €`}
              hint={stats.orders > 0 ? `${stats.orders} ${stats.orders === 1 ? 'compra' : 'compras'} · IVA incluido` : 'Compras de packs con Stripe'}
              icon={<CreditCard className="w-4 h-4" />}
              href="/portal/leads"
              highlight={stats.orders > 0}
            />
          </div>

          {leads.length === 0 && (
            <Panel title="Primeros pasos">
              <ul className="grid gap-3 md:grid-cols-3">
                {[
                  { done: false, title: 'Comparte tu web', text: 'Cada llamada agendada y cada solicitud aparecerá aquí al instante.', href: '/', label: 'Abrir la web', external: true },
                  { done: !!stripeConnected, title: 'Conecta Stripe', text: 'Pega tu clave en Ajustes y tus packs se podrán pagar online, con factura y IVA incluido.', href: '/portal/settings?tab=connections', label: 'Conectar Stripe' },
                  { done: false, title: 'Configura los avisos', text: 'Configura el SMTP en Ajustes para recibir un email con cada llamada.', href: '/portal/settings?tab=connections', label: 'Abrir ajustes' },
                ].map((step) => (
                  <li key={step.title} className="rounded-xl border border-white/10 p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {step.done ? <CheckCircle2 className="w-4 h-4 text-[var(--signal)]" /> : <Circle className="w-4 h-4 text-white/30" />}
                      {step.title}
                    </div>
                    <p className="text-xs text-white/45 flex-1">{step.text}</p>
                    <Link href={step.href} target={step.external ? '_blank' : undefined} className="text-xs text-[var(--signal)] hover:underline inline-flex items-center gap-1 w-fit">
                      {step.label} <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5">
            {/* Upcoming calls */}
            <Panel title="Próximas llamadas" action={{ label: 'Ver agenda', href: '/portal/calls' }} className="xl:col-span-2">
              {stats.upcoming.length === 0 ? (
                <p className="text-sm text-white/40 py-6 text-center">No hay llamadas agendadas. Cuando alguien reserve desde la web, aparecerá aquí.</p>
              ) : (
                <ul className="divide-y divide-white/10 -my-2">
                  {stats.upcoming.slice(0, 5).map((l) => (
                    <li key={l.id}>
                      <Link href={`/portal/calls?open=${l.id}`} className="flex items-center gap-4 py-3 group">
                        <div className="w-14 shrink-0 text-center rounded-xl border border-white/10 py-1.5">
                          <div className="text-[10px] uppercase tracking-wider text-white/40">
                            {new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'Europe/Madrid' }).format(new Date(l.call_at!)).replace('.', '')}
                          </div>
                          <div className="font-kinetic text-lg leading-tight">
                            {new Intl.DateTimeFormat('es-ES', { day: 'numeric', timeZone: 'Europe/Madrid' }).format(new Date(l.call_at!))}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate group-hover:text-[var(--signal)] transition-colors">
                            {l.name}{l.company ? <span className="text-white/40 font-normal"> · {l.company}</span> : null}
                          </div>
                          <div className="text-xs text-white/40 truncate">
                            {formatCallDate(l.call_at!)}{l.answers?.needs?.length ? ` · ${l.answers.needs.join(', ')}` : ''}
                          </div>
                        </div>
                        <span className="font-kinetic text-olive-600 dark:text-[var(--signal)] text-sm shrink-0">{formatCallTime(l.call_at!)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {/* Activity */}
            <Panel title="Actividad">
              <ActivityChart leads={leads} />
            </Panel>

            {/* Recent requests */}
            <Panel title="Solicitudes recientes" action={{ label: 'Ver todas', href: '/portal/leads' }} className="xl:col-span-2">
              {stats.recent.length === 0 ? (
                <p className="text-sm text-white/40 py-6 text-center">Aún no has recibido solicitudes.</p>
              ) : (
                <ul className="divide-y divide-white/10 -my-2">
                  {stats.recent.map((l) => {
                    const meta = statusMeta(l.status, l.kind);
                    return (
                      <li key={l.id}>
                        <Link href={`/portal/leads?open=${l.id}`} className="flex items-center gap-4 py-3 group">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate group-hover:text-[var(--signal)] transition-colors">{l.name}</div>
                            <div className="text-xs text-white/40 truncate">{l.message}</div>
                          </div>
                          <span className="text-xs text-white/30 shrink-0 hidden sm:block">{timeAgo(l.created_at)}</span>
                          <span className={cn('px-2.5 py-0.5 text-xs rounded-full inline-flex items-center gap-1.5 shrink-0', meta.badgeClass)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotColor)} />
                            {meta.label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            {/* Pipeline */}
            <Panel title="Embudo">
              <ul className="space-y-4">
                {stats.pipeline.map((p) => {
                  const meta = statusMeta(p.status);
                  return (
                    <li key={p.status}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-white/70 flex items-center gap-2">
                          <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotColor)} />
                          {meta.label}
                        </span>
                        <span className="font-semibold tabular-nums text-white">{p.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--signal)]/80" style={{ width: `${(p.count / pipelineMax) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
