'use client';

import { whatsappDigits } from '@/lib/contact';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Trash2, Loader2, Mail, Building2, UserPlus, Phone, CalendarClock, MessageCircle, Megaphone, CreditCard, ExternalLink } from 'lucide-react';
import type { Lead } from '@/app/portal/leads/context';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { formatCallDate, formatCallTime } from '@/lib/booking';
import { statusMeta, statusOptions } from '@/components/portal/leadMeta';
import { cn } from '@/lib/utils';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  accessToken: string | undefined;
  onChange: () => void;
}

const ANSWER_ROWS: { key: 'budget' | 'timeline'; label: string }[] = [
  { key: 'budget', label: 'Presupuesto' },
  { key: 'timeline', label: 'Cuándo empezar' },
];

export default function LeadDetailModal({ lead, onClose, accessToken, onChange }: LeadDetailModalProps) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  useEscapeKey(!!lead, onClose);

  useEffect(() => {
    setNotes(lead?.notes || '');
    setConfirmDelete(false);
    setError(null);
    setInviteMsg(null);
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const inviteToAccount = async () => {
    if (!accessToken || !lead.email) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch('/api/agency/invite-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ email: lead.email, name: lead.name }),
      });
      const data = await res.json().catch(() => ({}));
      setInviteMsg(
        !res.ok ? data.error || 'No se pudo enviar la invitación'
          : data.alreadyRegistered ? 'Este cliente ya tiene cuenta.'
          : 'Invitación enviada por email.'
      );
    } catch {
      setInviteMsg('No se pudo enviar la invitación');
    } finally {
      setInviting(false);
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

  const handleDelete = async () => {
    if (!accessToken) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
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

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-detail-title"
        className="card-liquid rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-white/10">
          <div className="min-w-0">
            <h2 id="lead-detail-title" className="font-kinetic uppercase text-lg truncate">{lead.name}</h2>
            <span className={cn('mt-1.5 px-2.5 py-0.5 text-xs rounded-full inline-flex items-center gap-1.5', meta.badgeClass)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', meta.dotColor)} />
              {isCall ? 'Llamada · ' : ''}{meta.label}
            </span>
            {isLanding && (
              <span className="mt-1.5 ml-2 px-2.5 py-0.5 text-xs rounded-full inline-flex items-center gap-1.5 border border-white/15 text-white/60">
                <Megaphone className="w-3 h-3" /> Landing
              </span>
            )}
            {lead.answers?.pack?.id === 'welcome' && (
              <span className="mt-1.5 ml-2 px-2.5 py-0.5 text-xs rounded-full inline-flex items-center gap-1.5 border border-[var(--signal)]/40 text-[var(--signal)]">
                Pack de Bienvenida · 30 € (IVA incluido)
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white cursor-pointer" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!order && lead.answers?.cart && (
            <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/[0.06] p-4">
              <div className="text-sm font-medium">Carrito sin pagar · {lead.answers.cart.total_eur.toLocaleString('es-ES')} € (IVA incluido)</div>
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
                <div className="text-sm font-medium">
                  Pagado · {order.amount_eur.toLocaleString('es-ES')} € (IVA incluido){order.mode === 'subscription' ? ' al mes' : ''}
                </div>
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
            <div className="rounded-xl border border-[var(--signal)]/30 bg-[var(--signal)]/[0.06] p-4 flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-[var(--signal)] shrink-0" />
              <div>
                <div className="text-sm">{formatCallDate(lead.call_at!, { withYear: true })}</div>
                <div className="font-kinetic text-olive-600 dark:text-[var(--signal)]">{formatCallTime(lead.call_at!)} <span className="text-xs text-white/40 font-sans">· horario de Madrid · 30 min</span></div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2" role="group" aria-label="Estado">
            {statusOptions(lead.kind).map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateLead({ status: opt.value })}
                disabled={saving}
                aria-pressed={lead.status === opt.value}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${
                  lead.status === opt.value ? 'bg-[var(--signal)] text-black' : 'card-liquid text-white/60 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {lead.status === 'won' && (
            <button
              onClick={() => router.push(`/portal/clients?inviteName=${encodeURIComponent(lead.name)}${lead.email ? `&inviteEmail=${encodeURIComponent(lead.email)}` : ''}`)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[var(--signal)] text-black hover:bg-[var(--signal-dim)] transition-colors text-sm font-medium cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Convertir en cliente
            </button>
          )}

          {lead.status === 'won' && lead.email && (
            <div>
              <button
                onClick={inviteToAccount}
                disabled={inviting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-white/15 text-white/80 hover:text-white hover:border-white/40 transition-colors text-sm font-medium cursor-pointer disabled:opacity-50"
              >
                {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Dar acceso a su cuenta (compras y soporte)
              </button>
              {inviteMsg && <p className="mt-2 text-xs text-white/50 text-center">{inviteMsg}</p>}
            </div>
          )}

          <div className="space-y-2 text-sm">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-white/30" />
                {lead.email}
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-white/30" />
                {lead.phone}
              </a>
            )}
            {lead.phone && phoneDigits.length >= 8 && (
              <a
                href={`https://wa.me/${phoneDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-white/30" />
                Abrir en WhatsApp
              </a>
            )}
            {lead.company && (
              <div className="flex items-center gap-2 text-white/70">
                <Building2 className="w-4 h-4 text-white/30" />
                {lead.company}
              </div>
            )}
            <div className="text-white/30 text-xs">Recibida el {new Date(lead.created_at).toLocaleString('es-ES')}</div>
          </div>

          {hasAnswers && lead.answers && (
            <div>
              <div className="block text-xs uppercase tracking-widest text-white/40 mb-2">Respuestas previas</div>
              <dl className="card-liquid rounded-lg p-4 space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-white/40 mb-1.5">Necesita</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {lead.answers.needs?.length ? (
                      lead.answers.needs.map((n) => (
                        <span key={n} className="px-2.5 py-0.5 rounded-full border border-white/15 text-xs text-white/70">{n}</span>
                      ))
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
              <dl className="card-liquid rounded-lg p-4 space-y-1 text-sm">
                {utmEntries.map(([key, value]) => (
                  <div key={key} className="flex gap-3">
                    <dt className="text-white/40 w-28 shrink-0 truncate">{key}</dt>
                    <dd className="text-white/80 break-all">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div>
            <div className="block text-xs uppercase tracking-widest text-white/40 mb-2">{lead.answers?.pack ? 'Datos del pedido' : isLanding ? '¿Qué le interesa?' : 'Mensaje'}</div>
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap card-liquid rounded-lg p-4">{lead.message}</p>
          </div>

          <div>
            <label htmlFor="lead-notes" className="block text-xs uppercase tracking-widest text-white/40 mb-2">
              Notas internas
            </label>
            <textarea
              id="lead-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => { if (notes !== (lead.notes || '')) updateLead({ notes }); }}
              rows={3}
              placeholder="Anotaciones para el equipo — solo visibles aquí"
              className="w-full px-4 py-2.5 card-liquid rounded-lg text-white placeholder:text-gray-500 focus:ring-2 focus:ring-[var(--signal)] focus:border-[var(--signal)] outline-none resize-none text-sm"
            />
          </div>

          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end pt-2">
            {confirmDelete ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-white/50">¿Eliminar definitivamente?</span>
                <button onClick={() => setConfirmDelete(false)} className="text-white/50 hover:text-white cursor-pointer">Cancelar</button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Sí, eliminar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-white/40 hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar {isCall ? 'llamada' : 'solicitud'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
