'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarPlus, LifeBuoy, Loader2, Package, PhoneCall, Receipt } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { cn } from '@/lib/utils';
import { formatCallDate, formatCallTime } from '@/lib/booking';
import { statusMeta } from '@/components/portal/leadMeta';
import PageHeader from '@/components/portal/PageHeader';

interface AccountCall {
  id: string;
  kind: 'call' | 'proposal';
  call_at: string | null;
  status: 'new' | 'contacted' | 'won' | 'lost';
  created_at: string;
}

interface AccountPurchase {
  id: string;
  pack_name: string;
  amount_eur: number;
  monthly: boolean;
  paid_at: string | null;
  invoice_url: string | null;
}

/** What a registered visitor sees: their own bookings and the next steps — no admin tools. */
export default function AccountHome() {
  const { user, session } = useAuth();
  const [calls, setCalls] = useState<AccountCall[] | null>(null);
  const [purchases, setPurchases] = useState<AccountPurchase[] | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [supportMsg, setSupportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const token = session?.access_token;

  const sendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
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

  useEffect(() => {
    if (!token) return;
    fetch('/api/account/calls', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { calls: [] }))
      .then((d) => setCalls(d.calls || []))
      .catch(() => setCalls([]));
    fetch('/api/account/purchases', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { purchases: [] }))
      .then((d) => setPurchases(d.purchases || []))
      .catch(() => setPurchases([]));
  }, [token]);

  const now = Date.now();
  const upcoming = (calls || []).filter((c) => c.kind === 'call' && c.call_at && c.status !== 'lost' && new Date(c.call_at).getTime() + 30 * 60000 >= now)
    .sort((a, b) => new Date(a.call_at!).getTime() - new Date(b.call_at!).getTime());
  const past = (calls || []).filter((c) => !upcoming.includes(c));
  const unconfirmed = !!user && !user.email_confirmed_at;

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <PageHeader title="Mi cuenta" subtitle={user?.email} />
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-5 max-w-3xl">
          <section className="card-liquid rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-kinetic uppercase text-xl mb-1">Bienvenido</h2>
              <p className="text-sm text-white/50 max-w-md">Desde aquí sigues tus llamadas con nosotros. ¿Hablamos de tu próximo proyecto?</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/#contacto" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--signal)] text-black text-sm font-medium hover:bg-[var(--signal-dim)] transition-colors">
                <CalendarPlus className="w-4 h-4" /> Agendar llamada
              </Link>
              <Link href="/store" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 text-sm text-white/70 hover:text-white hover:border-white/40 transition-colors">
                <Package className="w-4 h-4" /> Ver packages
              </Link>
            </div>
          </section>

          {unconfirmed && (
            <p className="text-sm text-yellow-400/90 card-liquid rounded-xl p-4">
              Confirma tu email para ver aquí tus llamadas y compras. Te hemos enviado un enlace al registrarte.
            </p>
          )}

          <section className="card-liquid rounded-2xl p-5 md:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-5">Tus llamadas</h2>
            {calls === null ? (
              <p className="text-sm text-white/40">Cargando…</p>
            ) : calls.length === 0 ? (
              <div className="text-center py-6">
                <PhoneCall className="w-8 h-8 mx-auto text-white/20 mb-3" />
                <p className="text-sm text-white/40">Todavía no tienes llamadas agendadas con este email.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/10 -my-2">
                {[...upcoming, ...past].map((c) => {
                  const meta = statusMeta(c.status, c.kind);
                  return (
                    <li key={c.id} className="flex items-center gap-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {c.call_at ? formatCallDate(c.call_at, { withYear: true }) : 'Solicitud de propuesta'}
                        </div>
                        <div className="text-xs text-white/40">
                          {c.call_at ? `${formatCallTime(c.call_at)} · horario de Madrid` : new Date(c.created_at).toLocaleDateString('es-ES')}
                        </div>
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
          </section>

          <section className="card-liquid rounded-2xl p-5 md:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-5">Tus compras</h2>
            {purchases === null ? (
              <p className="text-sm text-white/40">Cargando…</p>
            ) : purchases.length === 0 ? (
              <div className="text-center py-6">
                <Receipt className="w-8 h-8 mx-auto text-white/20 mb-3" />
                <p className="text-sm text-white/40">Todavía no hay compras con este email.</p>
              </div>
            ) : (
              <ul className="divide-y divide-white/10 -my-2">
                {purchases.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{p.pack_name || 'Pack'}</div>
                      <div className="text-xs text-white/40">
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString('es-ES') : ''}
                        {p.monthly ? ' · mensual' : ''}
                      </div>
                    </div>
                    <div className="text-sm shrink-0">{p.amount_eur.toLocaleString('es-ES')} €</div>
                    {p.invoice_url && (
                      <a href={p.invoice_url} target="_blank" rel="noopener noreferrer" className="text-xs text-white/50 hover:text-white underline underline-offset-2 shrink-0">
                        Factura
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card-liquid rounded-2xl p-5 md:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-1 flex items-center gap-2">
              <LifeBuoy className="w-4 h-4" /> Atención al cliente
            </h2>
            <p className="text-xs text-white/40 mb-4">Escríbenos y te respondemos por email.</p>
            <form onSubmit={sendSupport} className="space-y-3">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={150}
                required
                placeholder="Asunto"
                aria-label="Asunto"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/40"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={4000}
                required
                rows={5}
                placeholder="¿En qué podemos ayudarte?"
                aria-label="Mensaje"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-white/40 resize-y"
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={sending || unconfirmed}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--signal)] text-black text-sm font-medium hover:bg-[var(--signal-dim)] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enviar mensaje
                </button>
                {supportMsg && <p className={cn('text-xs', supportMsg.ok ? 'text-green-400' : 'text-red-400')}>{supportMsg.text}</p>}
              </div>
            </form>
          </section>

          <Link href="/portal/settings" className="inline-flex items-center gap-1 text-sm text-white/40 hover:text-white transition-colors">
            Ajustes de la cuenta <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
