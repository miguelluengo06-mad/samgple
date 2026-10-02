'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BellRing,
  CalendarPlus,
  CalendarDays,
  Check,
  LifeBuoy,
  Loader2,
  Package,
  PhoneCall,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { cn } from '@/lib/utils';
import { buildIcs, formatCallDate, formatCallTime } from '@/lib/booking';
import { statusMeta, timeAgo } from '@/components/portal/leadMeta';
import { CountUp, EmptyState, Page, Panel, Skeleton, untilLabel } from '@/components/portal/ui';
import VideoStudio, { type StudioData } from '@/components/portal/dashboard/VideoStudio';

export interface AccountCall {
  id: string;
  kind: 'call' | 'proposal';
  call_at: string | null;
  status: 'new' | 'contacted' | 'won' | 'lost';
  created_at: string;
}

export interface AccountNotice {
  lead_id: string;
  id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface AccountPurchase {
  id: string;
  pack_name: string;
  items: { name: string; qty: number; total_eur: number }[];
  amount_eur: number;
  monthly: boolean;
  paid_at: string | null;
  invoice_url: string | null;
}

/** Descarga un archivo .ics para añadir la llamada al calendario del cliente. */
function downloadIcs(call: AccountCall) {
  if (!call.call_at) return;
  const ics = buildIcs({ uid: `${call.id}@samgple`, start: new Date(call.call_at), title: 'Llamada con samgple', description: 'Llamada de 30 minutos (horario de Madrid).' });
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'llamada-samgple.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Datos con los que se pinta la vista previa del administrador (sin llamar a la API del cliente). */
export interface AccountPreview {
  name: string;
  email: string;
  sample: boolean;
  calls: AccountCall[];
  notices: AccountNotice[];
  purchases: AccountPurchase[];
  studio?: StudioData;
}

/** Lo que ve un cliente: sus avisos, su próxima llamada, sus compras y un canal directo con la agencia. */
export default function AccountHome({ preview }: { preview?: AccountPreview }) {
  const { user: authUser, session } = useAuth();
  const user = preview ? ({ email: preview.email, email_confirmed_at: 'preview' } as typeof authUser) : authUser;
  const [calls, setCalls] = useState<AccountCall[] | null>(preview ? preview.calls : null);
  const [purchases, setPurchases] = useState<AccountPurchase[] | null>(preview ? preview.purchases : null);
  const [notices, setNotices] = useState<AccountNotice[] | null>(preview ? preview.notices : null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [supportMsg, setSupportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const token = preview ? undefined : session?.access_token;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    fetch('/api/account/calls', { headers })
      .then((r) => (r.ok ? r.json() : { calls: [] }))
      .then((d) => setCalls(d.calls || []))
      .catch(() => setCalls([]));
    fetch('/api/account/notices', { headers })
      .then((r) => (r.ok ? r.json() : { notices: [] }))
      .then((d) => setNotices(d.notices || []))
      .catch(() => setNotices([]));
    fetch('/api/account/purchases', { headers })
      .then((r) => (r.ok ? r.json() : { purchases: [] }))
      .then((d) => setPurchases(d.purchases || []))
      .catch(() => setPurchases([]));
  }, [token]);

  const sendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preview) {
      setSupportMsg({ ok: true, text: 'En la vista previa no se envía nada. El cliente recibiría esto por email.' });
      return;
    }
    if (!token) return;
    setSending(true);
    setSupportMsg(null);
    try {
      const res = await fetch('/api/account/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubject('');
        setMessage('');
        setSupportMsg({ ok: true, text: 'Mensaje enviado. Te responderemos por email.' });
      } else {
        setSupportMsg({ ok: false, text: data.error || 'No se pudo enviar el mensaje.' });
      }
    } catch {
      setSupportMsg({ ok: false, text: 'No se pudo enviar el mensaje.' });
    } finally {
      setSending(false);
    }
  };

  const markRead = (n: AccountNotice) => {
    if (n.read_at || (!token && !preview)) return;
    setNotices((all) => (all || []).map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    if (preview) return; // en la vista previa no se toca nada del cliente
    fetch('/api/account/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ leadId: n.lead_id, noticeId: n.id }),
    }).catch(() => {});
  };

  const { upcoming, past } = useMemo(() => {
    const up = (calls || [])
      .filter((c) => c.kind === 'call' && c.call_at && c.status !== 'lost' && new Date(c.call_at).getTime() + 30 * 60000 >= now)
      .sort((a, b) => new Date(a.call_at!).getTime() - new Date(b.call_at!).getTime());
    return { upcoming: up, past: (calls || []).filter((c) => !up.includes(c)) };
  }, [calls, now]);

  const unconfirmed = !!user && !user.email_confirmed_at;
  const unread = (notices || []).filter((n) => !n.read_at).length;
  const spent = (purchases || []).reduce((a, p) => a + p.amount_eur, 0);
  const name = preview ? preview.name.split(' ')[0] : (user?.email || '').split('@')[0].split(/[._-]/)[0];
  const next = upcoming[0];
  const loading = calls === null || purchases === null || notices === null;

  return (
    <Page title={name ? `Hola, ${name}` : 'Mi cuenta'} subtitle={user?.email} width="max-w-5xl">
      {preview && (
        <div className="rounded-2xl border border-[var(--portal-line-strong)] bg-[var(--signal)]/[0.08] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm pn-in">
          <span>
            <b className="text-[var(--signal)]">Vista previa de cliente.</b>{' '}
            {preview.sample ? 'Datos de ejemplo: así ve su cuenta un cliente.' : `Así ve su cuenta ${preview.name}. Solo lectura: no se envía ni se cambia nada.`}
          </span>
          <Link href="/portal" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--signal)] hover:underline">
            Volver al panel <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
      {unconfirmed && (
        <p className="text-sm text-yellow-400/90 card-liquid rounded-2xl p-4 pn-in">
          Confirma tu email para ver aquí tus avisos, llamadas y compras. Te hemos enviado un enlace al registrarte.
        </p>
      )}

      {/* Estudio de vídeos: saldo, pedir un vídeo y seguimiento */}
      <VideoStudio token={token} preview={preview?.studio} />

      {/* Resumen rápido */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="card-liquid rounded-3xl p-4 col-span-2 lg:col-span-1 pn-in">
          <div className="pn-title flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5 text-[var(--signal)]" /> Próxima llamada</div>
          {next ? (
            <>
              <div className="text-lg font-semibold mt-2 capitalize leading-tight">{formatCallDate(next.call_at!)}</div>
              <div className="text-xs text-white/50 mt-0.5">{formatCallTime(next.call_at!)} · {untilLabel(next.call_at!, now)}</div>
              <button onClick={() => downloadIcs(next)} className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--signal)] hover:underline cursor-pointer"><CalendarDays className="w-3.5 h-3.5" /> Añadir al calendario</button>
            </>
          ) : (
            <>
              <div className="text-sm text-white/60 mt-2">No tienes ninguna agendada.</div>
              <Link href="/#contacto" className="mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--signal)] hover:underline"><CalendarPlus className="w-3.5 h-3.5" /> Agendar llamada</Link>
            </>
          )}
        </div>
        {[
          { label: 'Avisos sin leer', value: <CountUp value={unread} />, accent: unread > 0, icon: <BellRing className="w-3.5 h-3.5" /> },
          { label: 'Compras', value: <CountUp value={(purchases || []).length} />, accent: false, icon: <Receipt className="w-3.5 h-3.5" /> },
          { label: 'Invertido', value: <CountUp value={spent} format={(n) => `${n.toLocaleString('es-ES')} €`} />, accent: false, icon: <Package className="w-3.5 h-3.5" /> },
        ].map((st) => (
          <div key={st.label} className="card-liquid rounded-3xl p-4 pn-in">
            <div className="pn-title flex items-center gap-1.5">{st.icon}{st.label}</div>
            <div className={cn('text-2xl font-semibold tabular-nums mt-2', st.accent && 'text-[var(--signal)]')}>{st.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:gap-5 lg:grid-cols-[1.4fr_1fr] items-start">
        <div className="space-y-4 md:space-y-5 min-w-0">
          {/* Avisos */}
          <Panel delay={80}>
            <h2 className="pn-title mb-4 flex items-center gap-2">
              <BellRing className="w-3.5 h-3.5 text-[var(--signal)]" /> Avisos
              {unread > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-md bg-[var(--signal)] text-black text-[11px] font-bold font-mono flex items-center justify-center">{unread}</span>}
            </h2>
            {notices === null ? (
              <Skeleton className="h-20" />
            ) : notices.length === 0 ? (
              <EmptyState icon={<BellRing className="w-6 h-6" />} title="Sin avisos por ahora" text="Aquí te avisaremos cuando tu guion esté listo para revisar o tus vídeos estén terminados." />
            ) : (
              <ul className="space-y-2.5">
                {notices.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => markRead(n)}
                      className={cn(
                        'w-full text-left rounded-2xl border p-4 transition-colors',
                        n.read_at ? 'border-white/10 bg-white/[0.02]' : 'border-[var(--portal-line-strong)] bg-[var(--signal)]/[0.07] cursor-pointer shadow-[0_0_30px_-12px_var(--portal-glow)]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold">{n.title}</span>
                        {!n.read_at ? (
                          <span className="w-2 h-2 mt-1.5 rounded-full bg-[var(--signal)] shadow-[0_0_8px_var(--signal)] shrink-0" aria-label="Sin leer" />
                        ) : (
                          <Check className="w-3.5 h-3.5 mt-0.5 text-white/30 shrink-0" aria-label="Leído" />
                        )}
                      </div>
                      <p className="text-sm text-white/60 mt-1 whitespace-pre-wrap">{n.body}</p>
                      <div className="text-[11px] text-white/35 mt-2">{timeAgo(n.created_at)}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Compras */}
          <Panel title="Tus compras" delay={140}>
            {purchases === null ? (
              <Skeleton className="h-20" />
            ) : purchases.length === 0 ? (
              <EmptyState icon={<Receipt className="w-6 h-6" />} title="Todavía no hay compras" text="Cuando compres un pack con este email, lo verás aquí con su factura." />
            ) : (
              <ul className="divide-y divide-white/10 -my-2">
                {purchases.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 md:gap-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      {p.items.length > 1 ? (
                        <ul className="text-sm font-medium space-y-0.5">
                          {p.items.map((it) => <li key={it.name} className="truncate">{it.qty > 1 ? `${it.qty} × ` : ''}{it.name}</li>)}
                        </ul>
                      ) : (
                        <div className="text-sm font-medium truncate">{p.pack_name || 'Pack'}</div>
                      )}
                      <div className="text-xs text-white/45 mt-0.5">
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString('es-ES') : ''}{p.monthly ? ' · mensual' : ''}
                      </div>
                    </div>
                    <div className="text-sm font-semibold tabular-nums shrink-0">{p.amount_eur.toLocaleString('es-ES')} €</div>
                    {p.invoice_url && (
                      <a href={p.invoice_url} target="_blank" rel="noopener noreferrer" className="pn-chip shrink-0">Factura</a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Llamadas */}
          <Panel title="Tus llamadas" delay={200}>
            {calls === null ? (
              <Skeleton className="h-20" />
            ) : calls.length === 0 ? (
              <EmptyState icon={<PhoneCall className="w-6 h-6" />} title="Aún no has agendado llamadas" text="Reserva un hueco de 30 minutos cuando quieras." action={<Link href="/#contacto" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full portal-cta text-sm"><CalendarPlus className="w-4 h-4" /> Agendar llamada</Link>} />
            ) : (
              <ul className="divide-y divide-white/10 -my-2">
                {[...upcoming, ...past].map((c) => {
                  const meta = statusMeta(c.status, c.kind);
                  return (
                    <li key={c.id} className="flex items-center gap-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate capitalize">{c.call_at ? formatCallDate(c.call_at, { withYear: true }) : 'Solicitud de propuesta'}</div>
                        <div className="text-xs text-white/45 mt-0.5">{c.call_at ? `${formatCallTime(c.call_at)} · horario de Madrid` : new Date(c.created_at).toLocaleDateString('es-ES')}</div>
                      </div>
                      <span className={cn('px-2.5 py-0.5 text-xs rounded-full inline-flex items-center gap-1.5 shrink-0', meta.badgeClass)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotColor)} />
                        {meta.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        {/* Atención al cliente */}
        <Panel delay={120} className="lg:sticky lg:top-2">
          <h2 className="pn-title mb-1 flex items-center gap-2"><LifeBuoy className="w-3.5 h-3.5 text-[var(--signal)]" /> Habla con nosotros</h2>
          <p className="text-xs text-white/45 mb-4">Escríbenos y te respondemos por email.</p>
          <form onSubmit={sendSupport} className="space-y-3">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={150}
              required
              placeholder="Asunto"
              aria-label="Asunto"
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={4000}
              required
              rows={6}
              placeholder="¿En qué podemos ayudarte?"
              aria-label="Mensaje"
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-y"
            />
            <button
              type="submit"
              disabled={sending || unconfirmed}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full portal-cta text-sm disabled:opacity-50 cursor-pointer"
            >
              {sending && <Loader2 className="w-4 h-4 animate-spin" />}
              Enviar mensaje
            </button>
            {supportMsg && <p role="status" className={cn('text-xs text-center', supportMsg.ok ? 'text-green-400' : 'text-red-400')}>{supportMsg.text}</p>}
          </form>
          {!preview && <Link href="/portal/settings" className="mt-5 inline-flex items-center gap-1 text-xs text-white/45 hover:text-white transition-colors">
            Ajustes de la cuenta <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>}
        </Panel>
      </div>
    </Page>
  );
}
