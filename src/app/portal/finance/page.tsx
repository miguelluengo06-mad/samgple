'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownRight, ArrowUpRight, Repeat, Table2, BarChart3 } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { usePortalRoleContext } from '@/app/portal/context';
import { useLeadsContext } from '@/app/portal/leads/context';
import { Page, Skeleton } from '@/components/portal/ui';
import type { MonthRow, PackRow } from '@/lib/finance';
import { cn } from '@/lib/utils';

interface FinanceData {
  connected: boolean;
  livemode?: boolean;
  months?: MonthRow[];
  packs?: PackRow[];
  mrr?: number;
  activeSubscriptions?: number;
  truncated?: boolean;
  error?: string;
}

const eur = (cents: number, opts: Intl.NumberFormatOptions = {}) =>
  (cents / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, ...opts });

const monthLabel = (key: string, long = false) =>
  new Intl.DateTimeFormat('es-ES', { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit', timeZone: 'UTC' })
    .format(new Date(`${key}-15T12:00:00Z`))
    .replace(/\./g, '');

/** Ingresos netos por mes: una serie, una tonalidad, tooltip con el desglose. */
function RevenueChart({ months }: { months: MonthRow[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...months.map((m) => m.net));
  const total = months.reduce((a, m) => a + m.net, 0);

  return (
    <div>
      <div
        className="relative flex items-end gap-1.5 h-56 border-b border-white/10"
        role="img"
        aria-label={`Ingresos netos de los últimos ${months.length} meses: ${eur(total)} en total`}
      >
        {[0.5, 1].map((f) => (
          <span key={f} className="absolute inset-x-0 border-t border-dashed border-white/[0.06] pointer-events-none" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2.5 left-0 text-[10px] text-white/25 tabular-nums">{eur(max * f)}</span>
          </span>
        ))}
        {months.map((m, i) => (
          <div
            key={m.key}
            tabIndex={0}
            className="relative flex-1 h-full flex items-end justify-center outline-none"
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          >
            <span
              className={cn(
                'block w-full max-w-[28px] rounded-t-[6px] transition-colors',
                m.net <= 0 ? 'h-[2px] bg-white/10' : active === i ? 'bg-[var(--signal)] shadow-[0_0_14px_var(--signal)]' : 'bg-gradient-to-t from-[var(--signal-dim)]/60 to-[var(--signal)]/90'
              )}
              style={m.net > 0 ? { height: `${Math.max(3, (m.net / max) * 100)}%` } : undefined}
            />
            {active === i && (
              <span
                className={cn(
                  'absolute bottom-full mb-2 z-10 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-xs pointer-events-none space-y-0.5',
                  i < 2 ? 'left-0' : i > months.length - 3 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                )}
              >
                <span className="block text-white/50 capitalize">{monthLabel(m.key, true)}</span>
                <span className="block text-white font-semibold tabular-nums">{eur(m.net)} netos</span>
                <span className="block text-white/40 tabular-nums">
                  Cobrado {eur(m.gross)} · IVA {eur(m.tax)}
                  {m.refunds > 0 ? ` · Reembolsos ${eur(m.refunds)}` : ''}
                </span>
                <span className="block text-white/40">{m.invoices} {m.invoices === 1 ? 'factura' : 'facturas'}</span>
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-2">
        {months.map((m) => (
          <span key={m.key} className="flex-1 text-center text-[10px] text-white/30 capitalize truncate">{monthLabel(m.key)}</span>
        ))}
      </div>
    </div>
  );
}

function MonthTable({ months }: { months: MonthRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-[11px] uppercase tracking-widest text-white/30 border-b border-white/10">
            <th className="text-left font-normal py-2 pr-4">Mes</th>
            <th className="text-right font-normal py-2 px-2">Cobrado</th>
            <th className="text-right font-normal py-2 px-2">IVA</th>
            <th className="text-right font-normal py-2 px-2">Reembolsos</th>
            <th className="text-right font-normal py-2 px-2">Neto</th>
            <th className="text-right font-normal py-2 pl-2">Facturas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {[...months].reverse().map((m) => (
            <tr key={m.key}>
              <td className="py-2 pr-4 capitalize">{monthLabel(m.key, true)}</td>
              <td className="py-2 px-2 text-right text-white/60">{eur(m.gross)}</td>
              <td className="py-2 px-2 text-right text-white/60">{eur(m.tax)}</td>
              <td className="py-2 px-2 text-right text-white/60">{eur(m.refunds)}</td>
              <td className="py-2 px-2 text-right font-medium">{eur(m.net)}</td>
              <td className="py-2 pl-2 text-right text-white/60">{m.invoices}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Barras horizontales con el valor al final: nombre a la izquierda, sin leyenda (una sola serie). */
function BarList({ rows, format }: { rows: { label: string; value: number; hint?: string }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
            <span className="truncate">{r.label}</span>
            <span className="tabular-nums text-white/80 shrink-0">
              {format(r.value)}
              {r.hint && <span className="text-white/30 ml-2 text-xs">{r.hint}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-[var(--signal)]/80" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Kpi({ label, value, delta, hint }: { label: string; value: string; delta?: number | null; hint?: string }) {
  return (
    <div className="card-liquid rounded-3xl p-5">
      <div className="pn-title mb-2">{label}</div>
      <div className="text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-white/40 flex items-center gap-1.5 min-h-4">
        {delta != null && (
          <span className={cn('inline-flex items-center gap-0.5 font-medium', delta >= 0 ? 'text-green-400' : 'text-red-400')}>
            {delta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(delta).toLocaleString('es-ES', { maximumFractionDigits: 0 })}%
          </span>
        )}
        {hint}
      </div>
    </div>
  );
}

export default function FinancePage() {
  const { session } = useAuth();
  const { role, loading: roleLoading } = usePortalRoleContext();
  const { leads } = useLeadsContext();
  const router = useRouter();
  const [data, setData] = useState<FinanceData | null>(null);
  const [table, setTable] = useState(false);
  const token = session?.access_token;

  useEffect(() => {
    if (!roleLoading && role !== 'agency') router.replace('/portal');
  }, [role, roleLoading, router]);

  useEffect(() => {
    if (!token || role !== 'agency') return;
    fetch('/api/agency/finance', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ connected: true, error: 'No se pudieron cargar las finanzas.' }));
  }, [token, role]);

  const funnel = useMemo(() => {
    const requests = leads.filter((l) => l.kind !== 'call' || l.call_at).length;
    const contacted = leads.filter((l) => l.status === 'contacted' || l.status === 'won').length;
    const won = leads.filter((l) => l.status === 'won').length;
    const paid = leads.filter((l) => l.answers?.order?.livemode).length;
    return { requests, contacted, won, paid };
  }, [leads]);

  if (role !== 'agency') return null;

  const months = data?.months || [];
  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  const delta = current && previous && previous.net > 0 ? ((current.net - previous.net) / previous.net) * 100 : null;
  const year = months.reduce((a, m) => a + m.net, 0);
  const possible = leads.filter((l) => !l.answers?.order && (l.status === 'new' || l.status === 'contacted')).length;

  return (
    <Page
      title="Finanzas"
      subtitle={data?.livemode === false ? 'Modo de pruebas de Stripe — importes no reales' : 'Ingresos netos de IVA, desde Stripe'}
      width="max-w-[1200px]"
    >
      {
        <>
          {data === null ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
              <Skeleton className="h-72" />
            </>
          ) : !data.connected ? (
            <div className="card-liquid rounded-3xl p-6 text-sm text-white/60">
              Conecta tu clave de Stripe en Ajustes → Pagos y email para ver las finanzas.
            </div>
          ) : data.error ? (
            <div className="card-liquid rounded-3xl p-6 text-sm text-red-400">{data.error}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi label="Este mes (neto)" value={eur(current?.net || 0)} delta={delta} hint="vs mes anterior" />
                <Kpi label="Últimos 12 meses" value={eur(year)} hint="neto de IVA" />
                <Kpi
                  label="Suscripciones"
                  value={eur(data.mrr || 0)}
                  hint={`${data.activeSubscriptions || 0} activas · al mes`}
                />
                <Kpi label="Posibles compras" value={String(possible)} hint="solicitudes sin pagar" />
              </div>

              <section className="card-liquid rounded-3xl p-5 md:p-6">
                <div className="flex items-center justify-between gap-3 mb-5">
                  <h2 className="pn-title">Ingresos netos por mes</h2>
                  <button
                    onClick={() => setTable((t) => !t)}
                    className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
                  >
                    {table ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
                    {table ? 'Ver gráfica' : 'Ver tabla'}
                  </button>
                </div>
                {table ? <MonthTable months={months} /> : <RevenueChart months={months} />}
                {data.truncated && <p className="mt-3 text-xs text-yellow-400/80">Hay muchas facturas: se muestran solo las más recientes.</p>}
              </section>

              <div className="grid lg:grid-cols-2 gap-5">
                <section className="card-liquid rounded-3xl p-5 md:p-6">
                  <h2 className="pn-title mb-5">Del interés a la compra</h2>
                  <BarList
                    format={(v) => String(v)}
                    rows={[
                      { label: 'Solicitudes y llamadas', value: funnel.requests },
                      { label: 'Contactadas', value: funnel.contacted, hint: funnel.requests ? `${Math.round((funnel.contacted / funnel.requests) * 100)}%` : undefined },
                      { label: 'Ganadas', value: funnel.won, hint: funnel.requests ? `${Math.round((funnel.won / funnel.requests) * 100)}%` : undefined },
                      { label: 'Pagadas en Stripe', value: funnel.paid, hint: funnel.requests ? `${Math.round((funnel.paid / funnel.requests) * 100)}%` : undefined },
                    ]}
                  />
                </section>

                <section className="card-liquid rounded-3xl p-5 md:p-6">
                  <h2 className="pn-title mb-5">Ingresos por pack (12 meses)</h2>
                  {(data.packs || []).length === 0 ? (
                    <p className="text-sm text-white/40">Todavía no hay facturas pagadas.</p>
                  ) : (
                    <BarList
                      format={(v) => eur(v)}
                      rows={(data.packs || []).map((p) => ({ label: p.name, value: p.net, hint: `${p.invoices} ${p.invoices === 1 ? 'venta' : 'ventas'}` }))}
                    />
                  )}
                </section>
              </div>

              <p className="text-xs text-white/30 flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5" /> Incluye las renovaciones de suscripciones. Neto = cobrado − IVA − reembolsos. Meses en hora de Madrid.
              </p>
            </>
          )}
        </>
      }
    </Page>
  );
}
