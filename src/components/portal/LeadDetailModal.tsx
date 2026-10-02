'use client';

import { whatsappDigits } from '@/lib/contact';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Building2,
  CalendarClock,
  CreditCard,
  ExternalLink,
  History,
  Loader2,
  Mail,
  Megaphone,
  MessageCircle,
  Phone,
  PhoneCall,
  Send,
  ShoppingCart,
  Trash2,
  UserRound,
  X,
  Check,
  Copy,
  Eye,
  KeyRound,
} from 'lucide-react';
import type { Lead } from '@/app/portal/leads/context';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { formatCallDate, formatCallTime } from '@/lib/booking';
import { contactKeys, statusMeta, statusOptions, timeAgo } from '@/components/portal/leadMeta';
import { cn } from '@/lib/utils';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  accessToken: string | undefined;
  onChange: () => void;
  /** Todas las solicitudes: la ficha reúne las de la misma persona (mismo email o teléfono) */
  allLeads?: Lead[];
  /** Abre otra solicitud de la misma persona desde su historial */
  onOpenLead?: (id: string) => void;
}

const ANSWER_ROWS: { key: 'budget' | 'timeline'; label: string }[] = [
  { key: 'budget', label: 'Presupuesto' },
  { key: 'timeline', label: 'Cuándo empezar' },
];

const NOTICE_TEMPLATES: { title: string; body: string }[] = [
  { title: 'Tu guion está listo para revisar', body: 'Ya tienes los guiones preparados. Revísalos y dinos si los apruebas o quieres cambios. No producimos nada hasta tu visto bueno.' },
  { title: 'Tus vídeos están en producción', body: 'Hemos empezado a producir tus vídeos con el guion aprobado. Te avisaremos en cuanto estén listos para revisar.' },
  { title: 'Tus vídeos están listos', body: 'Ya puedes ver tus vídeos. Revísalos y, si quieres algún ajuste, dínoslo y lo hacemos.' },
  { title: 'Necesitamos algo de ti', body: 'Para seguir adelante necesitamos que nos envíes más información (fotos, web o ficha de producto). Respóndenos cuando puedas.' },
];

type Tab = 'resumen' | 'historial' | 'avisos';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

const isPaid = (l: Lead) => !!l.answers?.order && l.answers.order.livemode !== false;

export default function LeadDetailModal({ lead, onClose, accessToken, onChange, allLeads, onOpenLead }: LeadDetailModalProps) {
  const [tab, setTab] = useState<Tab>('resumen');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessBusy, setAccessBusy] = useState(false);
  const [access, setAccess] = useState<{ email: string; password: string; loginUrl: string; reset: boolean } | null>(null);
  const [accessMsg, setAccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [sendingNotice, setSendingNotice] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEscapeKey(!!lead, onClose);

  useEffect(() => {
    setTab('resumen');
    setNotes(lead?.notes || '');
    setConfirmDelete(false);
    setError(null);
    setAccess(null);
    setAccessMsg(null);
    setCopied(false);
    setNoticeTitle('');
    setNoticeBody('');
    setNoticeMsg(null);
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Todo lo de la misma persona: solicitudes, llamadas y compras
  const related = useMemo(() => {
    if (!lead) return [];
    const mine = new Set(contactKeys(lead));
    const others = (allLeads || []).filter((l) => l.id !== lead.id && contactKeys(l).some((k) => mine.has(k)));
    return [lead, ...others].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [lead, allLeads]);

  const stats = useMemo(() => {
    let spent = 0;
    let purchases = 0;
    let calls = 0;
    for (const l of related) {
      if (isPaid(l)) {
        purchases += 1;
        spent += Math.max(0, (l.answers!.order!.amount_eur || 0) - (l.answers!.order!.refunded_eur || 0));
      }
      if (l.kind === 'call' && l.status !== 'lost') calls += 1;
    }
    return { spent, purchases, calls, requests: related.length };
  }, [related]);

  const notices = useMemo(
    () =>
      related
        .flatMap((l) => (l.answers?.notices || []).map((n) => ({ ...n })))
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [related]
  );

  if (!lead) return null;

  const isCall = lead.kind === 'call' && !!lead.call_at;
  const isLanding = lead.source === 'landing';
  const order = lead.answers?.order;
  const stripeRef = order ? order.payment_intent_id || order.subscription_id || order.invoice_id : null;
  const stripeUrl = order && stripeRef
    ? `https://dashboard.stripe.com/${order.livemode ? '' : 'test/'}${order.payment_intent_id ? 'payments' : order.subscription_id ? 'subscriptions' : 'invoices'}/${stripeRef}`
    : null;
  const meta = statusMeta(lead.status, lead.kind);
  const phoneDigits = whatsappDigits(lead.phone);
  const hasAnswers = !!lead.answers && (!!lead.answers.needs?.length || !!lead.answers.budget || !!lead.answers.timeline);
  const utmEntries = Object.entries(lead.answers?.utm || {});
  const unread = notices.filter((n) => !n.read_at).length;

  const createAccess = async (reset = false) => {
    if (!accessToken || !lead.email) return;
    setAccessBusy(true);
    setAccessMsg(null);
    try {
      const res = await fetch('/api/agency/create-customer-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ email: lead.email, name: lead.name, reset }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setAccessMsg(data.error || 'No se pudo crear el acceso');
      else if (data.alreadyRegistered) setAccessMsg('Este cliente ya tiene acceso. Si ha perdido la contraseña, genera una nueva.');
      else setAccess({ email: data.email, password: data.password, loginUrl: data.loginUrl || `${window.location.origin}/auth`, reset: !!data.reset });
    } catch {
      setAccessMsg('No se pudo crear el acceso');
    } finally {
      setAccessBusy(false);
    }
  };

  const accessText = access
    ? `Hola ${lead.name.split(' ')[0]}, ya tienes tu acceso a samgple para ver tus avisos, compras y llamadas:\n\n🔗 ${access.loginUrl}\n📧 ${access.email}\n🔑 ${access.password}\n\nPuedes cambiar la contraseña desde Ajustes cuando quieras.`
    : '';

  const copyAccess = async () => {
    try {
      await navigator.clipboard.writeText(accessText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setAccessMsg('No se pudo copiar. Selecciona el texto y cópialo a mano.');
    }
  };

  const updateLead = async (updates: Record<string, any>) => {
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(updates),
      });
      if (res.ok) onChange();
      else setError('No se pudo guardar el cambio');
    } finally {
      setSaving(false);
    }
  };

  const sendNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setSendingNotice(true);
    setNoticeMsg(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}/notices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ title: noticeTitle, body: noticeBody }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNoticeTitle('');
        setNoticeBody('');
        setNoticeMsg({ ok: true, text: 'Aviso enviado: lo verá en su cuenta.' });
        onChange();
      } else {
        setNoticeMsg({ ok: false, text: data.error || 'No se pudo enviar el aviso' });
      }
    } catch {
      setNoticeMsg({ ok: false, text: 'No se pudo enviar el aviso' });
    } finally {
      setSendingNotice(false);
    }
  };

  const handleDelete = async () => {
    if (!accessToken) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) {
        onChange();
        onClose();
      } else {
        setError('No se pudo eliminar');
      }
    } finally {
      setDeleting(false);
    }
  };

  const TABS: { value: Tab; label: string; icon: typeof UserRound; badge?: number }[] = [
    { value: 'resumen', label: 'Resumen', icon: UserRound },
    { value: 'historial', label: 'Historial', icon: History, badge: related.length > 1 ? related.length : undefined },
    { value: 'avisos', label: 'Avisos', icon: BellRing, badge: unread || undefined },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-stretch sm:justify-end" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-detail-title"
        className="card-liquid rounded-t-3xl sm:rounded-none sm:rounded-l-3xl w-full sm:max-w-xl h-[94dvh] sm:h-auto flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera de la ficha */}
        <div className="px-5 pt-5 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center font-kinetic text-lg text-[var(--signal)] bg-[var(--signal)]/10 border border-[var(--portal-line-strong)] shadow-[0_0_24px_-6px_var(--portal-glow)]">
              {initials(lead.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="lead-detail-title" className="font-kinetic uppercase text-lg leading-tight truncate">{lead.name}</h2>
              {lead.company && <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5 truncate"><Building2 className="w-3 h-3 shrink-0" />{lead.company}</p>}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={cn('px-2.5 py-0.5 text-xs rounded-full inline-flex items-center gap-1.5', meta.badgeClass)}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotColor)} />
                  {isCall ? 'Llamada · ' : ''}{meta.label}
                </span>
                {isLanding && (
                  <span className="px-2.5 py-0.5 text-xs rounded-full inline-flex items-center gap-1.5 border border-white/15 text-white/60"><Megaphone className="w-3 h-3" /> Landing</span>
                )}
                {lead.answers?.pack?.id === 'welcome' && (
                  <span className="px-2.5 py-0.5 text-xs rounded-full border border-[var(--signal)]/40 text-[var(--signal)]">Pack de Bienvenida</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white cursor-pointer" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cifras del cliente */}
          <dl className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'Gastado', value: `${stats.spent.toLocaleString('es-ES')} €`, accent: stats.spent > 0 },
              { label: 'Compras', value: String(stats.purchases), accent: false },
              { label: 'Llamadas', value: String(stats.calls), accent: false },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <dt className="text-[10px] uppercase tracking-widest text-white/40">{s.label}</dt>
                <dd className={cn('text-lg font-semibold tabular-nums', s.accent && 'text-[var(--signal)]')}>{s.value}</dd>
              </div>
            ))}
          </dl>

          {/* Contacto rápido */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {lead.phone ? (
              <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-[var(--portal-line-strong)] py-2 text-xs font-medium"><Phone className="w-3.5 h-3.5" />Llamar</a>
            ) : <span className="rounded-xl border border-white/5 py-2 text-xs text-white/25 flex items-center justify-center gap-1.5"><Phone className="w-3.5 h-3.5" />Sin teléfono</span>}
            {lead.phone && phoneDigits.length >= 8 ? (
              <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-[var(--portal-line-strong)] py-2 text-xs font-medium text-green-400"><MessageCircle className="w-3.5 h-3.5" />WhatsApp</a>
            ) : <span className="rounded-xl border border-white/5 py-2 text-xs text-white/25 flex items-center justify-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" />WhatsApp</span>}
            {lead.email ? (
              <a href={`mailto:${lead.email}`} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:border-[var(--portal-line-strong)] py-2 text-xs font-medium"><Mail className="w-3.5 h-3.5" />Email</a>
            ) : <span className="rounded-xl border border-white/5 py-2 text-xs text-white/25 flex items-center justify-center gap-1.5"><Mail className="w-3.5 h-3.5" />Sin email</span>}
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex border-b border-white/10 shrink-0" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium cursor-pointer border-b-2 -mb-px transition-colors',
                tab === t.value ? 'border-[var(--signal)] text-white' : 'border-transparent text-white/45 hover:text-white'
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.badge ? <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--signal)] text-black text-[10px] font-bold flex items-center justify-center">{t.badge}</span> : null}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === 'resumen' && (
            <>
              {!order && lead.answers?.cart && (
                <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/[0.06] p-4">
                  <div className="text-sm font-medium flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-yellow-400" />Carrito sin pagar · {lead.answers.cart.total_eur.toLocaleString('es-ES')} € (IVA incluido)</div>
                  <ul className="mt-1 space-y-0.5 text-xs text-white/60">
                    {lead.answers.cart.items.map((it) => (
                      <li key={it.pack_id} className="flex justify-between gap-3">
                        <span className="min-w-0">{it.qty > 1 ? `${it.qty} × ` : ''}{it.name}</span>
                        <span className="tabular-nums shrink-0">{it.total_eur.toLocaleString('es-ES')} €</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {order && (
                <div className="rounded-xl border border-[var(--signal)]/30 bg-[var(--signal)]/[0.06] p-4 flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-[var(--signal)] shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">Pagado · {order.amount_eur.toLocaleString('es-ES')} € (IVA incluido){order.mode === 'subscription' ? ' al mes' : ''}</div>
                    {order.items && order.items.length > 0 ? (
                      <ul className="mt-1 space-y-0.5 text-xs text-white/60">
                        {order.items.map((it) => (
                          <li key={it.pack_id} className="flex justify-between gap-3">
                            <span className="min-w-0">{it.qty > 1 ? `${it.qty} × ` : ''}{it.name}</span>
                            <span className="tabular-nums shrink-0">{it.total_eur.toLocaleString('es-ES')} €</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-white/50 mt-0.5">{order.pack_name}</div>
                    )}
                    {!order.livemode && <div className="text-xs text-white/40 mt-0.5">Modo prueba</div>}
                    {stripeUrl && (
                      <a href={stripeUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--signal)] hover:underline">
                        Ver en Stripe <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {isCall && (
                <div className="rounded-xl border border-blue-400/30 bg-blue-400/[0.06] p-4 flex items-center gap-3">
                  <CalendarClock className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <div className="text-sm">{formatCallDate(lead.call_at!, { withYear: true })}</div>
                    <div className="font-kinetic text-blue-400">{formatCallTime(lead.call_at!)} <span className="text-xs text-white/40 font-sans">· horario de Madrid · 30 min</span></div>
                  </div>
                </div>
              )}

              <div>
                <div className="block text-xs uppercase tracking-widest text-white/40 mb-2">Estado</div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Estado">
                  {statusOptions(lead.kind).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateLead({ status: opt.value })}
                      disabled={saving}
                      aria-pressed={lead.status === opt.value}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 border',
                        lead.status === opt.value ? 'portal-cta border-transparent' : 'border-white/15 text-white/60 hover:text-white hover:border-[var(--portal-line-strong)]'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {hasAnswers && lead.answers && (
                <div>
                  <div className="block text-xs uppercase tracking-widest text-white/40 mb-2">Respuestas previas</div>
                  <dl className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-white/40 mb-1.5">Necesita</dt>
                      <dd className="flex flex-wrap gap-1.5">
                        {lead.answers.needs?.length ? (
                          lead.answers.needs.map((n) => <span key={n} className="px-2.5 py-0.5 rounded-full border border-white/15 text-xs text-white/70">{n}</span>)
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </dd>
                    </div>
                    {ANSWER_ROWS.map((row) => (
                      <div key={row.key}>
                        <dt className="text-xs text-white/40">{row.label}</dt>
                        <dd className="text-white/80">{lead.answers?.[row.key] || <span className="text-white/30">—</span>}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {utmEntries.length > 0 && (
                <div>
                  <div className="block text-xs uppercase tracking-widest text-white/40 mb-2">Origen del anuncio</div>
                  <dl className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-1 text-sm">
                    {utmEntries.map(([key, value]) => (
                      <div key={key} className="flex gap-3">
                        <dt className="text-white/40 w-28 shrink-0 truncate">{key}</dt>
                        <dd className="text-white/80 break-all">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {!(isCall && !lead.message) && (
                <div>
                  <div className="block text-xs uppercase tracking-widest text-white/40 mb-2">{lead.answers?.pack ? 'Datos del pedido' : isLanding ? '¿Qué le interesa?' : 'Mensaje'}</div>
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.03] p-4">{lead.message}</p>
                </div>
              )}

              <div>
                <label htmlFor="lead-notes" className="block text-xs uppercase tracking-widest text-white/40 mb-2">Notas internas</label>
                <textarea
                  id="lead-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => { if (notes !== (lead.notes || '')) updateLead({ notes }); }}
                  rows={3}
                  placeholder="Anotaciones para el equipo — solo visibles aquí"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/15 text-white placeholder:text-gray-500 outline-none resize-none text-sm"
                />
              </div>

              <div className="text-white/30 text-xs">Recibida el {new Date(lead.created_at).toLocaleString('es-ES')}</div>

              {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

              <div className="flex justify-end pt-1">
                {confirmDelete ? (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-white/50">¿Eliminar definitivamente?</span>
                    <button onClick={() => setConfirmDelete(false)} className="text-white/50 hover:text-white cursor-pointer">Cancelar</button>
                    <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors cursor-pointer disabled:opacity-50">
                      {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Sí, eliminar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-white/40 hover:text-red-400 transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                    Eliminar {isCall ? 'llamada' : 'solicitud'}
                  </button>
                )}
              </div>
            </>
          )}

          {tab === 'historial' && (
            <ol className="relative space-y-3 pl-5 before:absolute before:left-[7px] before:top-1 before:bottom-1 before:w-px before:bg-[var(--portal-line-strong)]">
              {related.map((l) => {
                const m = statusMeta(l.status, l.kind);
                const o = l.answers?.order;
                const Icon = o ? CreditCard : l.kind === 'call' ? PhoneCall : l.source === 'cart' ? ShoppingCart : UserRound;
                const label = o
                  ? `Compra · ${o.pack_name}`
                  : l.kind === 'call' && l.call_at
                    ? `Llamada · ${formatCallDate(l.call_at)} ${formatCallTime(l.call_at)}`
                    : l.source === 'cart'
                      ? 'Carrito sin pagar'
                      : l.answers?.pack?.id === 'welcome'
                        ? 'Pack de Bienvenida'
                        : 'Solicitud';
                const current = l.id === lead.id;
                return (
                  <li key={l.id} className="relative">
                    <span className={cn('absolute -left-5 top-3 w-3.5 h-3.5 rounded-full border-2 bg-[#05080b]', current ? 'border-[var(--signal)] shadow-[0_0_10px_var(--signal)]' : 'border-white/30')} />
                    <button
                      onClick={() => (current ? setTab('resumen') : onOpenLead?.(l.id))}
                      className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] hover:border-[var(--portal-line-strong)] px-3.5 py-3 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium flex items-center gap-2 min-w-0"><Icon className="w-4 h-4 shrink-0 text-[var(--signal)]" /><span className="truncate">{label}</span></span>
                        <span className={cn('px-2 py-0.5 text-[11px] rounded-full shrink-0', m.badgeClass)}>{m.label}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-white/40">
                        <span>{timeAgo(l.created_at)}{current ? ' · abierta' : ''}</span>
                        {o && <span className="tabular-nums text-green-400">{o.amount_eur.toLocaleString('es-ES')} €</span>}
                      </div>
                    </button>
                  </li>
                );
              })}
              {related.length === 1 && <p className="text-xs text-white/40 pt-1">Es la única solicitud de esta persona. Si vuelve a escribir o compra con el mismo email o teléfono, aparecerá aquí.</p>}
            </ol>
          )}

          {tab === 'avisos' && (
            <>
              <form onSubmit={sendNotice} className="space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Plantillas rápidas</div>
                  <div className="flex flex-wrap gap-1.5">
                    {NOTICE_TEMPLATES.map((t) => (
                      <button
                        key={t.title}
                        type="button"
                        onClick={() => { setNoticeTitle(t.title); setNoticeBody(t.body); }}
                        className="px-2.5 py-1 rounded-full border border-white/15 text-xs text-white/65 hover:text-white hover:border-[var(--portal-line-strong)] cursor-pointer text-left"
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  maxLength={120}
                  placeholder="Título del aviso"
                  aria-label="Título del aviso"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/15 text-sm text-white placeholder:text-gray-500 outline-none"
                />
                <textarea
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="Mensaje para el cliente"
                  aria-label="Mensaje para el cliente"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/15 text-sm text-white placeholder:text-gray-500 outline-none resize-none"
                />
                <button
                  type="submit"
                  disabled={sendingNotice || !noticeTitle.trim() || !noticeBody.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full portal-cta text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {sendingNotice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar aviso a su cuenta
                </button>
                {noticeMsg && <p role="status" className={cn('text-xs text-center', noticeMsg.ok ? 'text-green-400' : 'text-red-400')}>{noticeMsg.text}</p>}
              </form>

              <div className="rounded-2xl border border-[var(--portal-line-strong)] bg-[var(--signal)]/[0.05] p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="w-4 h-4 text-[var(--signal)]" /> Acceso del cliente</div>
                <p className="text-xs text-white/55">El registro está cerrado: tú creas su acceso y se lo pasas. Con él ve sus avisos, compras y llamadas en <b className="text-white/80">Mi cuenta</b>{lead.email ? <> (<span className="text-white/80">{lead.email}</span>)</> : null}.</p>
                {!lead.email ? (
                  <p className="text-xs text-yellow-400">Esta solicitud no tiene email, así que no se puede crear un acceso.</p>
                ) : access ? (
                  <div className="space-y-3">
                    <pre className="whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/30 p-3 text-xs leading-relaxed font-mono">{accessText}</pre>
                    <p className="text-[11px] text-yellow-400">Guarda o envía esta contraseña ahora: no se vuelve a mostrar. Si se pierde, genera otra.</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={copyAccess} className="flex items-center justify-center gap-1.5 rounded-xl portal-cta py-2.5 text-xs cursor-pointer">
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copiado' : 'Copiar'}
                      </button>
                      {phoneDigits.length >= 8 ? (
                        <a href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(accessText)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 hover:border-[var(--portal-line-strong)] py-2.5 text-xs text-green-400">
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      ) : <span className="rounded-xl border border-white/5 py-2.5 text-xs text-white/25 flex items-center justify-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" />WhatsApp</span>}
                      <a href={`mailto:${access.email}?subject=${encodeURIComponent('Tu acceso a samgple')}&body=${encodeURIComponent(accessText)}`} className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 hover:border-[var(--portal-line-strong)] py-2.5 text-xs">
                        <Mail className="w-3.5 h-3.5" /> Email
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => createAccess(false)} disabled={accessBusy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full portal-cta text-xs cursor-pointer disabled:opacity-50">
                      {accessBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />} Crear acceso
                    </button>
                    <button onClick={() => createAccess(true)} disabled={accessBusy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 hover:border-[var(--portal-line-strong)] text-xs cursor-pointer disabled:opacity-50">
                      Generar nueva contraseña
                    </button>
                  </div>
                )}
                {accessMsg && <p role="status" className="text-xs text-white/70">{accessMsg}</p>}
                <Link href={`/portal/preview?lead=${lead.id}`} onClick={onClose} className="inline-flex items-center gap-2 text-xs text-[var(--signal)] hover:underline">
                  <Eye className="w-3.5 h-3.5" /> Ver su panel tal como lo ve {lead.name.split(' ')[0]}
                </Link>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-white/40 mb-2">Enviados ({notices.length})</div>
                {notices.length === 0 ? (
                  <p className="text-sm text-white/40">Todavía no le has enviado ningún aviso.</p>
                ) : (
                  <ul className="space-y-2">
                    {notices.map((n) => (
                      <li key={n.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium">{n.title}</span>
                          <span className={cn('shrink-0 inline-flex items-center gap-1 text-[11px]', n.read_at ? 'text-green-400' : 'text-white/40')}>
                            {n.read_at ? <><Check className="w-3 h-3" />Leído</> : 'Sin leer'}
                          </span>
                        </div>
                        <p className="text-xs text-white/55 mt-1 whitespace-pre-wrap">{n.body}</p>
                        <div className="text-[11px] text-white/30 mt-1.5">{timeAgo(n.created_at)}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
