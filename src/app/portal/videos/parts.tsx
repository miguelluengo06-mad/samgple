'use client';

import { useState } from 'react';
import { Check, ExternalLink, Gift, Link2, Loader2, Plus, Send, UserRound, X } from 'lucide-react';
import { STATUS_LABEL, STATUS_ORDER, estimateSeconds, type VideoStatus } from '@/lib/videos';
import { timeAgo } from '@/components/portal/leadMeta';
import { cn } from '@/lib/utils';
import type { Avatar, VideoRequest } from './types';

/** Imagen de avatar con respaldo si el enlace falla. */
export function Thumb({ src, name, className }: { src: string | null; name: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={cn('rounded-2xl overflow-hidden bg-white/[0.05] border border-white/10 shrink-0 flex items-center justify-center', className)}>
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)} className="w-full h-full object-cover" />
      ) : (
        <UserRound className="w-6 h-6 text-white/30" aria-label={name} />
      )}
    </div>
  );
}

export function NewAvatarButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full portal-cta text-xs cursor-pointer">
      <Plus className="w-4 h-4" /> Nuevo avatar
    </button>
  );
}

/* ── Ficha de un pedido ─────────────────────────────────────────────────── */

export function RequestDrawer({
  request: r,
  balance,
  headers,
  onClose,
  onChanged,
}: {
  request: VideoRequest;
  balance: number;
  headers: Record<string, string>;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [script, setScript] = useState(r.script_text || '');
  const [delivery, setDelivery] = useState(r.delivery_url || '');
  const [notes, setNotes] = useState(r.admin_notes || '');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [gift, setGift] = useState(false);

  const call = async (key: string, url: string, method: string, body: unknown, okText: string) => {
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ ok: false, text: data.error || 'No se pudo completar' });
      else {
        setMsg({ ok: true, text: okText });
        await onChanged();
      }
    } finally {
      setBusy(null);
    }
  };

  const patch = (key: string, body: Record<string, unknown>, okText: string) => call(key, `/api/videos/${r.id}`, 'PATCH', body, okText);
  const closed = r.status === 'cancelled' || r.status === 'delivered';
  const seconds = estimateSeconds(script);
  const idx = STATUS_ORDER.indexOf(r.status);

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-stretch sm:justify-end" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Pedido de vídeo" className="card-liquid rounded-t-3xl sm:rounded-none sm:rounded-l-3xl w-full sm:max-w-xl h-[94dvh] sm:h-auto flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-start gap-4">
            <Thumb src={r.avatar_image_url} name={r.avatar_name} className="w-16 h-20" />
            <div className="min-w-0 flex-1">
              <h2 className="font-kinetic uppercase text-lg leading-tight truncate">{r.customer_name || r.customer_email}</h2>
              <p className="text-xs text-white/50 truncate">{r.customer_email}</p>
              <p className="text-xs text-white/50 mt-1">Avatar: <b className="text-white/80">{r.avatar_name}</b> · ≈ {r.est_seconds} s · {timeAgo(r.created_at)}</p>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="text-white/40 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
          </div>

          {/* Progreso */}
          {r.status !== 'cancelled' ? (
            <ol className="flex items-center gap-1 mt-4" aria-label="Progreso">
              {STATUS_ORDER.map((st, i) => (
                <li key={st} className="flex-1 min-w-0">
                  <div className={cn('h-1.5 rounded-full', i <= idx ? 'bg-[var(--signal)] shadow-[0_0_10px_var(--portal-glow)]' : 'bg-white/10')} />
                  <div className={cn('text-[10px] mt-1 truncate', i === idx ? 'text-[var(--signal)] font-semibold' : 'text-white/35')}>{STATUS_LABEL[st]}</div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-xs text-white/50">Pedido cancelado: el vídeo volvió al saldo del cliente.</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <section>
            <div className="pn-title mb-2">Lo que quiere el cliente</div>
            <p className="text-sm text-white/80 whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.03] p-4">{r.script_notes}</p>
            <dl className="grid grid-cols-2 gap-2 mt-2 text-xs">
              {r.product && <div className="rounded-xl border border-white/10 p-2.5 col-span-2"><dt className="text-white/40">Producto / web</dt><dd className="text-white/80 break-words">{r.product}</dd></div>}
              {r.tone && <div className="rounded-xl border border-white/10 p-2.5"><dt className="text-white/40">Tono</dt><dd className="text-white/80">{r.tone}</dd></div>}
              {r.cta && <div className="rounded-xl border border-white/10 p-2.5"><dt className="text-white/40">Llamada a la acción</dt><dd className="text-white/80 break-words">{r.cta}</dd></div>}
              {r.drive_url && (
                <div className="rounded-xl border border-white/10 p-2.5 col-span-2">
                  <dt className="text-white/40">Archivos del producto (Google Drive)</dt>
                  <dd><a href={r.drive_url} target="_blank" rel="noopener noreferrer" className="text-[var(--signal)] hover:underline inline-flex items-center gap-1 break-all"><Link2 className="w-3.5 h-3.5 shrink-0" />{r.drive_url}</a></dd>
                </div>
              )}
            </dl>
          </section>

          {r.client_feedback && (
            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/[0.06] p-4">
              <div className="text-xs font-semibold text-yellow-400 mb-1">El cliente pide cambios en el guion</div>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{r.client_feedback}</p>
            </div>
          )}

          {!closed && (
            <section>
              <label htmlFor="script" className="pn-title mb-2 block">Guion para su aprobación</label>
              <textarea id="script" value={script} onChange={(e) => setScript(e.target.value)} rows={7} maxLength={6000} placeholder="Escribe aquí el guion que verá el cliente…" className="w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-y leading-relaxed" />
              <div className={cn('text-[11px] mt-1 tabular-nums', seconds > 45 ? 'text-red-400' : 'text-white/40')}>≈ {seconds} s{seconds > 45 ? ' · pasa de 45 s' : ''}</div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => patch('save', { script_text: script }, 'Guion guardado')} disabled={!!busy} className="px-4 h-10 rounded-full border border-white/15 text-xs hover:border-[var(--portal-line-strong)] cursor-pointer disabled:opacity-50">
                  {busy === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Guardar borrador'}
                </button>
                <button onClick={() => patch('review', { script_text: script, status: 'script_review' }, 'Guion enviado al cliente para su visto bueno')} disabled={!!busy || !script.trim()} className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full portal-cta text-xs cursor-pointer disabled:opacity-40">
                  {busy === 'review' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Enviar guion a aprobar
                </button>
              </div>
            </section>
          )}

          {r.status === 'delivered' && r.script_text && (
            <section><div className="pn-title mb-2">Guion aprobado</div><p className="text-sm text-white/70 whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.03] p-4">{r.script_text}</p></section>
          )}

          {r.status !== 'cancelled' && (
            <section>
              <label htmlFor="delivery" className="pn-title mb-2 block">Vídeo terminado (enlace)</label>
              <input id="delivery" value={delivery} onChange={(e) => setDelivery(e.target.value)} placeholder="https://…" className="w-full rounded-full border px-4 py-2.5 text-sm outline-none" />
              <div className="flex flex-wrap gap-2 mt-3">
                {r.status !== 'delivered' && (
                  <button onClick={() => patch('deliver', { delivery_url: delivery, status: 'delivered' }, 'Entregado: el cliente ya puede verlo')} disabled={!!busy || !delivery.trim()} className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full portal-cta text-xs cursor-pointer disabled:opacity-40">
                    {busy === 'deliver' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Marcar entregado
                  </button>
                )}
                {r.status === 'delivered' && (
                  <button onClick={() => patch('relink', { delivery_url: delivery }, 'Enlace actualizado')} disabled={!!busy} className="px-4 h-10 rounded-full border border-white/15 text-xs hover:border-[var(--portal-line-strong)] cursor-pointer disabled:opacity-50">Actualizar enlace</button>
                )}
                {r.delivery_url && <a href={r.delivery_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full border border-white/15 text-xs hover:border-[var(--portal-line-strong)]"><ExternalLink className="w-3.5 h-3.5" /> Abrir vídeo</a>}
              </div>
            </section>
          )}

          {/* Cambiar de paso a mano */}
          {r.status !== 'cancelled' && r.status !== 'delivered' && (
            <section>
              <div className="pn-title mb-2">Mover de paso</div>
              <div className="flex flex-wrap gap-1.5">
                {(['scripting', 'production'] as VideoStatus[]).filter((st) => st !== r.status).map((st) => (
                  <button key={st} onClick={() => patch(st, { status: st }, `Ahora: ${STATUS_LABEL[st]}`)} disabled={!!busy} className="pn-chip">{STATUS_LABEL[st]}</button>
                ))}
              </div>
            </section>
          )}

          <section>
            <label htmlFor="admin-notes" className="pn-title mb-2 block">Notas internas</label>
            <textarea id="admin-notes" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (r.admin_notes || '') && patch('notes', { admin_notes: notes }, 'Notas guardadas')} rows={2} placeholder="Solo las ves tú y tu equipo" className="w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-none" />
          </section>

          {/* Saldo del cliente */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div><div className="pn-title">Saldo del cliente</div><div className="text-2xl font-semibold tabular-nums mt-1">{balance} <span className="text-sm text-white/45 font-normal">{balance === 1 ? 'vídeo' : 'vídeos'}</span></div></div>
              <button onClick={() => setGift((g) => !g)} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full border border-white/15 text-xs hover:border-[var(--portal-line-strong)] cursor-pointer"><Gift className="w-3.5 h-3.5" /> Ajustar</button>
            </div>
            {gift && (
              <div className="flex flex-wrap gap-2 mt-3">
                {[1, 2, 5, -1].map((n) => (
                  <button key={n} onClick={() => call(`credit${n}`, '/api/videos/credits', 'POST', { email: r.customer_email, delta: n, note: n > 0 ? 'Regalo de la agencia' : 'Ajuste de la agencia' }, n > 0 ? `+${n} vídeo${n > 1 ? 's' : ''} para el cliente` : 'Vídeo retirado')} disabled={!!busy} className="pn-chip">{n > 0 ? `+${n}` : n}</button>
                ))}
              </div>
            )}
          </section>

          {msg && <p role="status" className={cn('text-sm', msg.ok ? 'text-green-400' : 'text-red-400')}>{msg.text}</p>}

          {!closed && (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => confirm('¿Anular el pedido? El vídeo vuelve al saldo del cliente.') && patch('cancel', { status: 'cancelled' }, 'Pedido anulado')}
                disabled={!!busy}
                className="text-xs text-white/40 hover:text-red-400 cursor-pointer"
              >
                Anular pedido y devolver el vídeo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Crear / editar un avatar ───────────────────────────────────────────── */

export function AvatarModal({
  avatar,
  headers,
  onClose,
  onSaved,
}: {
  avatar: Partial<Avatar>;
  headers: Record<string, string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    name: avatar.name || '',
    style: avatar.style || '',
    gender: avatar.gender || '',
    tags: (avatar.tags || []).join(', '),
    image_url: avatar.image_url || '',
    preview_url: avatar.preview_url || '',
    active: avatar.active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(avatar.id ? `/api/avatars/${avatar.id}` : '/api/avatars', { method: avatar.id ? 'PATCH' : 'POST', headers, body: JSON.stringify(f) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'No se pudo guardar');
      else onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <form onSubmit={save} role="dialog" aria-modal="true" aria-label={avatar.id ? 'Editar avatar' : 'Nuevo avatar'} className="card-liquid w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 md:p-6 max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{avatar.id ? 'Editar avatar' : 'Nuevo avatar'}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-white/50 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid sm:grid-cols-[120px_1fr] gap-4">
          <Thumb src={f.image_url || null} name={f.name || 'Avatar'} className="w-full sm:w-[120px] aspect-[3/4]" />
          <div className="space-y-3 min-w-0">
            <label className="block"><span className="pn-title">Nombre</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} placeholder="Lucía" className="mt-1.5 w-full rounded-2xl border px-4 py-2.5 text-sm outline-none" autoFocus /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="pn-title">Estilo</span><input value={f.style} onChange={(e) => setF({ ...f, style: e.target.value })} maxLength={40} placeholder="UGC, Elegante…" className="mt-1.5 w-full rounded-2xl border px-4 py-2.5 text-sm outline-none" /></label>
              <label className="block"><span className="pn-title">Género</span><input value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} maxLength={20} placeholder="Mujer, Hombre…" className="mt-1.5 w-full rounded-2xl border px-4 py-2.5 text-sm outline-none" /></label>
            </div>
          </div>
        </div>
        <div className="space-y-3 mt-3">
          <label className="block"><span className="pn-title">Enlace de la imagen</span><input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} placeholder="https://…/lucia.jpg" className="mt-1.5 w-full rounded-2xl border px-4 py-2.5 text-sm outline-none" /></label>
          <label className="block"><span className="pn-title">Enlace de un vídeo corto (opcional)</span><input value={f.preview_url} onChange={(e) => setF({ ...f, preview_url: e.target.value })} placeholder="https://…/lucia.mp4" className="mt-1.5 w-full rounded-2xl border px-4 py-2.5 text-sm outline-none" /></label>
          <label className="block"><span className="pn-title">Etiquetas</span><input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} placeholder="belleza, moda, joven" className="mt-1.5 w-full rounded-2xl border px-4 py-2.5 text-sm outline-none" /><span className="text-[11px] text-white/40">Separadas por comas: ayudan al cliente a filtrar.</span></label>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="w-4 h-4 accent-[var(--signal)]" /> Visible para los clientes</label>
        </div>
        {error && <p role="alert" className="text-sm text-red-400 mt-3">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-4 h-10 rounded-full text-sm text-white/60 hover:text-white cursor-pointer">Cancelar</button>
          <button type="submit" disabled={saving || !f.name.trim() || !f.image_url.trim()} className="px-5 h-10 rounded-full portal-cta text-sm disabled:opacity-40 cursor-pointer inline-flex items-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />} Guardar</button>
        </div>
      </form>
    </div>
  );
}
