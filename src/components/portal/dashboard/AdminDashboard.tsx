'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  Circle,
  CreditCard,
  Inbox,
  MessageCircle,
  Percent,
  Phone,
  PhoneCall,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCallDate, formatCallTime, callDayKey, todayInBookingTz, addDays } from '@/lib/booking';
import { useLeadsContext, newRequests, upcomingCalls, isPendingCall } from '@/app/portal/leads/context';
import type { Lead } from '@/app/portal/leads/context';
import { statusMeta, timeAgo, whatsappUrl } from '@/components/portal/leadMeta';
import { CountUp, EmptyState, Page, Panel, Skeleton, Sparkline, untilLabel } from '@/components/portal/ui';
import ActivityChart from './ActivityChart';

const SPARK_DAYS = 14;

const greeting = () => {
  const hour = Number(new Intl.DateTimeFormat('es-ES', { hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Madrid' }).format(new Date()));
  return hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';
};

function Kpi({ label, value, hint, icon, href, spark, highlight, delay }: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: React.ReactNode;
  href: string;
  spark?: number[];
  highlight?: boolean;
  delay: number;
}) {
  return (
    <Link
      href={href}
      className="card-liquid card-liquid-interactive rounded-3xl p-4 md:p-5 flex flex-col gap-2 group pn-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <span className="pn-title">{label}</span>
        <span className={cn('transition-colors', highlight ? 'text-[var(--signal)]' : 'text-white/30 group-hover:text-[var(--signal)]')}>{icon}</span>
      </div>
      <div className="text-3xl md:text-4xl font-semibold tracking-tight tabular-nums leading-none">{value}</div>
      {spark ? <Sparkline data={spark} className="mt-1" /> : <div className="h-9" />}
      {hint && <div className="text-xs text-white/45 -mt-1">{hint}</div>}
    </Link>
  );
}

type FeedEvent = { id: string; at: string; icon: React.ReactNode; title: string; sub: string; href: string; tone?: 'green' | 'blue' };

function feedOf(leads: Lead[]): FeedEvent[] {
  const events: FeedEvent[] = [];
  for (const l of leads) {
    const order = l.answers?.order;
    if (order) {
      events.push({
        id: `${l.id}-paid`,
        at: order.paid_at || l.created_at,
        icon: <CreditCard className="w-4 h-4" />,
        title: `${l.name} compró`,
        sub: `${order.pack_name} · ${order.amount_eur.toLocaleString('es-ES')} €${order.livemode === false ? ' (prueba)' : ''}`,
        href: `/portal/leads?open=${l.id}`,
        tone: 'green',
      });
    }
    if (l.kind === 'call' && l.call_at) {
      events.push({
        id: `${l.id}-call`,
        at: l.created_at,
        icon: <PhoneCall className="w-4 h-4" />,
        title: `${l.name} agendó una llamada`,
        sub: `${formatCallDate(l.call_at)} · ${formatCallTime(l.call_at)}`,
        href: `/portal/calls?open=${l.id}`,
        tone: 'blue',
      });
    } else if (!order && l.source !== 'cart') {
      events.push({
        id: `${l.id}-req`,
        at: l.created_at,
        icon: <Inbox className="w-4 h-4" />,
        title: `Nueva solicitud de ${l.name}`,
        sub: l.answers?.pack?.id === 'welcome' ? 'Pack de Bienvenida' : l.message?.slice(0, 70) || 'Solicitud',
        href: `/portal/leads?open=${l.id}`,
      });
    }
  }
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
}

export default function AdminDashboard() {
  const { leads, loading } = useLeadsContext();
  const { user } = useAuth();
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

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
    const upcoming = upcomingCalls(leads, now);
    const today = todayInBookingTz();
    const weekEnd = addDays(today, 7);
    const inWeek = upcoming.filter((l) => callDayKey(l.call_at!) <= weekEnd);
    const todayCalls = upcoming.filter((l) => callDayKey(l.call_at!) === today);
    const closed = leads.filter((l) => l.status === 'won' || l.status === 'lost');
    const won = leads.filter((l) => l.status === 'won').length;
    const orders = leads.filter((l) => l.answers?.order);
    const sales = orders.reduce((sum, l) => sum + (l.answers?.order?.amount_eur || 0), 0);

    // Series diarias (últimos 14 días) para las gráficas pequeñas
    const keys = Array.from({ length: SPARK_DAYS }, (_, i) => addDays(today, i - (SPARK_DAYS - 1)));
    const salesByDay = new Map(keys.map((k) => [k, 0]));
    const reqByDay = new Map(keys.map((k) => [k, 0]));
    for (const l of leads) {
      const o = l.answers?.order;
      if (o) {
        const k = callDayKey(o.paid_at || l.created_at);
        if (salesByDay.has(k)) salesByDay.set(k, (salesByDay.get(k) || 0) + o.amount_eur);
      }
      const k = callDayKey(l.created_at);
      if (reqByDay.has(k)) reqByDay.set(k, (reqByDay.get(k) || 0) + 1);
    }

    const unmarked = leads.filter((l) => isPendingCall(l) && new Date(l.call_at!).getTime() + 30 * 60000 < now).length;
    const possible = leads.filter((l) => !l.answers?.order && l.source === 'cart' && l.status === 'new').length;
    const funnel = {
      requests: leads.filter((l) => l.kind !== 'call' || l.call_at).length,
      contacted: leads.filter((l) => l.status === 'contacted' || l.status === 'won').length,
      won,
      paid: orders.length,
    };

    return {
      orders: orders.length,
      sales,
      upcoming,
      next: upcoming[0] || null,
      inWeek: inWeek.length,
      todayCalls: todayCalls.length,
      newList: newRequests(leads),
      winRate: closed.length > 0 ? Math.round((won / closed.length) * 100) : null,
      won,
      unmarked,
      possible,
      funnel,
      salesSpark: keys.map((k) => salesByDay.get(k) || 0),
      reqSpark: keys.map((k) => reqByDay.get(k) || 0),
      feed: feedOf(leads),
    };
  }, [leads, now]);

  const todayLabel = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' }).format(new Date());
  const firstName = (user?.email || '').split('@')[0].split(/[._-]/)[0];

  if (loading) {
    return (
      <Page title="Resumen" subtitle={todayLabel}>
        <Skeleton className="h-52" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <Skeleton className="h-64" />
      </Page>
    );
  }

  const next = stats.next;
  const nextWa = whatsappUrl(next?.phone);
  const todos: { n: number; label: string; href: string; icon: React.ReactNode }[] = [
    { n: stats.newList.length, label: stats.newList.length === 1 ? 'solicitud por responder' : 'solicitudes por responder', href: '/portal/leads', icon: <Inbox className="w-4 h-4" /> },
    { n: stats.unmarked, label: stats.unmarked === 1 ? 'llamada sin marcar' : 'llamadas sin marcar', href: '/portal/calls', icon: <PhoneCall className="w-4 h-4" /> },
    { n: stats.possible, label: stats.possible === 1 ? 'carrito sin pagar' : 'carritos sin pagar', href: '/portal/leads', icon: <BellRing className="w-4 h-4" /> },
  ].filter((t) => t.n > 0);

  return (
    <Page title="Resumen" subtitle={`${greeting()}${firstName ? `, ${firstName}` : ''} · ${todayLabel}`}>
      {/* Ahora: lo siguiente que pasa + lo que hay que hacer */}
      <section className="pn-hero p-5 md:p-7 pn-in">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] items-center">
          <div className="min-w-0">
            {next ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 bg-[var(--signal)] text-black', untilLabel(next.call_at!, now) === 'Ahora' && 'pn-live')}>
                    <PhoneCall className="w-3.5 h-3.5" /> Próxima llamada · {untilLabel(next.call_at!, now)}
                  </span>
                  <span className="text-xs text-white/50 hidden sm:inline">{formatCallDate(next.call_at!)} · {formatCallTime(next.call_at!)}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight truncate">{next.name}</h2>
                <p className="text-sm text-white/55 mt-1 truncate">{[next.company, next.phone || next.email].filter(Boolean).join(' · ')}</p>
                {next.answers?.needs?.length ? (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {next.answers.needs.map((n) => <span key={n} className="pn-chip">{n}</span>)}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 mt-5">
                  {next.phone && (
                    <a href={`tel:${next.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full portal-cta text-sm">
                      <Phone className="w-4 h-4" /> Llamar
                    </a>
                  )}
                  {nextWa && (
                    <a href={nextWa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 text-sm hover:border-[var(--portal-line-strong)]">
                      <MessageCircle className="w-4 h-4 text-green-400" /> WhatsApp
                    </a>
                  )}
                  <Link href={`/portal/calls?open=${next.id}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 text-sm hover:border-[var(--portal-line-strong)]">
                    <UserRound className="w-4 h-4" /> Ver ficha
                  </Link>
                </div>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 border border-[var(--portal-line-strong)] text-[var(--signal)] mb-3">
                  <Sparkles className="w-3.5 h-3.5" /> Sin llamadas pendientes
                </span>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Agenda libre</h2>
                <p className="text-sm text-white/55 mt-1 max-w-md">Cuando alguien reserve una llamada desde tu web, la verás aquí con cuenta atrás y botones para llamarle al momento.</p>
              </>
            )}
          </div>

          <div className="min-w-0">
            <div className="pn-title mb-3">Para hacer ahora</div>
            {todos.length === 0 ? (
              <div className="flex items-center gap-3 rounded-2xl border border-[var(--portal-line)] bg-white/[0.03] p-4 text-sm text-white/65">
                <CheckCircle2 className="w-5 h-5 text-[var(--signal)] shrink-0" /> Todo al día. No hay nada pendiente.
              </div>
            ) : (
              <ul className="space-y-2">
                {todos.map((t) => (
                  <li key={t.label}>
                    <Link href={t.href} className="flex items-center gap-3 rounded-2xl border border-[var(--portal-line)] bg-white/[0.04] hover:border-[var(--portal-line-strong)] px-4 py-3 transition-colors group">
                      <span className="w-8 h-8 rounded-xl bg-[var(--signal)]/12 text-[var(--signal)] flex items-center justify-center shrink-0">{t.icon}</span>
                      <span className="flex-1 text-sm"><b className="tabular-nums text-base mr-1.5">{t.n}</b>{t.label}</span>
                      <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-[var(--signal)] transition-colors" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Kpi
          label="Ventas"
          value={<CountUp value={stats.sales} format={(n) => `${n.toLocaleString('es-ES')} €`} />}
          hint={stats.orders > 0 ? `${stats.orders} ${stats.orders === 1 ? 'compra' : 'compras'} · IVA incl.` : 'Packs pagados con Stripe'}
          icon={<CreditCard className="w-4 h-4" />}
          href="/portal/finance"
          spark={stats.salesSpark}
          highlight={stats.orders > 0}
          delay={60}
        />
        <Kpi
          label="Solicitudes nuevas"
          value={<CountUp value={stats.newList.length} />}
          hint="Pendientes de respuesta"
          icon={<Inbox className="w-4 h-4" />}
          href="/portal/leads"
          spark={stats.reqSpark}
          highlight={stats.newList.length > 0}
          delay={120}
        />
        <Kpi
          label="Llamadas próximas"
          value={<CountUp value={stats.inWeek} />}
          hint={stats.todayCalls > 0 ? `${stats.todayCalls} hoy` : 'Próximos 7 días'}
          icon={<PhoneCall className="w-4 h-4" />}
          href="/portal/calls"
          highlight={stats.todayCalls > 0}
          delay={180}
        />
        <Kpi
          label="Tasa de cierre"
          value={stats.winRate === null ? '—' : <CountUp value={stats.winRate} format={(n) => `${n}%`} />}
          hint={`${stats.won} ${stats.won === 1 ? 'ganada' : 'ganadas'}`}
          icon={<Percent className="w-4 h-4" />}
          href="/portal/leads"
          delay={240}
        />
      </div>

      {leads.length === 0 && (
        <Panel title="Primeros pasos">
          <ul className="grid gap-3 md:grid-cols-3">
            {[
              { done: false, title: 'Comparte tu web', text: 'Cada llamada agendada y cada solicitud aparecerá aquí al instante.', href: '/', label: 'Abrir la web', external: true },
              { done: !!stripeConnected, title: 'Conecta Stripe', text: 'Pega tu clave en Ajustes y tus packs se podrán pagar online, con factura y IVA incluido.', href: '/portal/settings?tab=connections', label: 'Conectar Stripe' },
              { done: false, title: 'Configura los avisos', text: 'Configura el email en Ajustes para recibir un aviso con cada llamada.', href: '/portal/settings?tab=connections', label: 'Abrir ajustes' },
            ].map((step) => (
              <li key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {step.done ? <CheckCircle2 className="w-4 h-4 text-[var(--signal)]" /> : <Circle className="w-4 h-4 text-white/30" />}
                  {step.title}
                </div>
                <p className="text-xs text-white/50 flex-1">{step.text}</p>
                <Link href={step.href} target={step.external ? '_blank' : undefined} className="text-xs text-[var(--signal)] hover:underline inline-flex items-center gap-1 w-fit">
                  {step.label} <ArrowUpRight className="w-3 h-3" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-5">
        {/* Agenda */}
        <Panel title="Agenda" action={{ label: 'Ver todas', href: '/portal/calls' }} className="xl:col-span-2" delay={120}>
          {stats.upcoming.length === 0 ? (
            <EmptyState icon={<PhoneCall className="w-6 h-6" />} title="Sin llamadas agendadas" text="Cuando alguien reserve desde la web, aparecerá aquí." />
          ) : (
            <ul className="space-y-1 -mx-2">
              {stats.upcoming.slice(0, 5).map((l) => (
                <li key={l.id}>
                  <Link href={`/portal/calls?open=${l.id}`} className="pn-row flex items-center gap-3 md:gap-4 rounded-2xl px-2 py-2.5 group">
                    <div className="w-14 shrink-0 text-center rounded-2xl border border-[var(--portal-line)] bg-white/[0.03] py-1.5">
                      <div className="text-[10px] uppercase tracking-wider text-white/45 font-mono">
                        {new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'Europe/Madrid' }).format(new Date(l.call_at!)).replace('.', '')}
                      </div>
                      <div className="font-kinetic text-lg leading-tight">
                        {new Intl.DateTimeFormat('es-ES', { day: 'numeric', timeZone: 'Europe/Madrid' }).format(new Date(l.call_at!))}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate group-hover:text-[var(--signal)] transition-colors">
                        {l.name}{l.company ? <span className="text-white/45 font-normal"> · {l.company}</span> : null}
                      </div>
                      <div className="text-xs text-white/45 truncate">
                        {l.answers?.needs?.length ? l.answers.needs.join(', ') : l.phone || l.email}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-kinetic text-[var(--signal)] text-sm">{formatCallTime(l.call_at!)}</div>
                      <div className="text-[11px] text-white/40">{untilLabel(l.call_at!, now)}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Actividad (gráfica) */}
        <Panel title="Entradas · 14 días" delay={180}>
          <ActivityChart leads={leads} />
        </Panel>

        {/* Actividad reciente */}
        <Panel title="Actividad reciente" action={{ label: 'Ver solicitudes', href: '/portal/leads' }} className="xl:col-span-2" delay={240}>
          {stats.feed.length === 0 ? (
            <EmptyState icon={<Inbox className="w-6 h-6" />} title="Todavía no hay actividad" text="Solicitudes, llamadas y compras aparecerán aquí en tiempo real." />
          ) : (
            <ul className="relative space-y-1 -mx-2">
              {stats.feed.map((e) => (
                <li key={e.id}>
                  <Link href={e.href} className="pn-row flex items-center gap-3 rounded-2xl px-2 py-2.5 group">
                    <span
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
                        e.tone === 'green' ? 'bg-green-400/10 text-green-400 border-green-400/25' : e.tone === 'blue' ? 'bg-blue-400/10 text-blue-400 border-blue-400/25' : 'bg-white/[0.05] text-white/70 border-white/10'
                      )}
                    >
                      {e.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate group-hover:text-[var(--signal)] transition-colors">{e.title}</span>
                      <span className="block text-xs text-white/45 truncate">{e.sub}</span>
                    </span>
                    <span className="text-[11px] text-white/35 shrink-0 hidden sm:block">{timeAgo(e.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Embudo */}
        <Panel title="Embudo" delay={300}>
          <ul className="space-y-4">
            {[
              { label: 'Solicitudes y llamadas', v: stats.funnel.requests, status: 'new' as const },
              { label: 'Contactadas', v: stats.funnel.contacted, status: 'contacted' as const },
              { label: 'Ganadas', v: stats.funnel.won, status: 'won' as const },
              { label: 'Pagadas', v: stats.funnel.paid, status: 'won' as const },
            ].map((row) => {
              const pct = stats.funnel.requests ? Math.round((row.v / stats.funnel.requests) * 100) : 0;
              return (
                <li key={row.label}>
                  <div className="flex items-baseline justify-between text-sm mb-1.5">
                    <span className="text-white/70 flex items-center gap-2">
                      <span className={cn('w-1.5 h-1.5 rounded-full', statusMeta(row.status).dotColor)} />
                      {row.label}
                    </span>
                    <span className="tabular-nums"><b>{row.v}</b><span className="text-white/35 text-xs ml-1.5">{pct}%</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[var(--signal-dim)] to-[var(--signal)] shadow-[0_0_12px_var(--portal-glow)] transition-[width] duration-700" style={{ width: `${Math.max(pct, row.v ? 3 : 0)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </Page>
  );
}
