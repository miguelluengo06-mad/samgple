'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clapperboard,
  Download,
  Link2,
  Loader2,
  PenLine,
  Play,
  Search,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { LEGAL } from '@/lib/legal';
import { CLIENT_CANCELLABLE, MAX_VIDEO_SECONDS, MAX_WORDS, STATUS_HINT, STATUS_LABEL, STATUS_ORDER, TONES, estimateSeconds, type VideoStatus } from '@/lib/videos';
import { timeAgo } from '@/components/portal/leadMeta';
import { CountUp, EmptyState, Panel, Skeleton } from '@/components/portal/ui';
import { cn } from '@/lib/utils';

export interface StudioAvatar {
  id: string;
  name: string;
  style: string;
  gender: string;
  tags: string[];
  image_url: string;
  preview_url: string | null;
}

export interface StudioRequest {
  id: string;
  avatar_id: string | null;
  avatar_name: string;
  avatar_image_url: string | null;
  script_notes: string;
  est_seconds: number;
  product: string | null;
  tone: string | null;
  cta: string | null;
  drive_url: string | null;
  status: VideoStatus;
  script_text: string | null;
  client_feedback: string | null;
  delivery_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioData {
  balance: number;
  granted: number;
  requests: StudioRequest[];
  avatars: StudioAvatar[];
  unavailable?: boolean;
}

function AvatarImage({ src, name, className }: { src: string | null; name: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className={cn('overflow-hidden bg-white/[0.05] flex items-center justify-center shrink-0', className)}>
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)} className="w-full h-full object-cover" />
      ) : (
        <UserRound className="w-6 h-6 text-white/30" aria-label={name} />
      )}
    </div>
  );
}

/** Anillo con el saldo: vídeos que quedan sobre los que ha recibido. */
function Ring({ left, total }: { left: number; total: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, left / total) : 0;
  return (
    <div className="relative w-[132px] h-[132px] shrink-0" role="img" aria-label={`Te quedan ${left} de ${total} vídeos`}>
      <svg viewBox="0 0 132 132" className="w-full h-full -rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="66"
          cy="66"
          r={r}
          fill="none"
          stroke="var(--signal)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ filter: 'drop-shadow(0 0 8px var(--signal))', transition: 'stroke-dashoffset 0.8s cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tabular-nums leading-none"><CountUp value={left} /></span>
        <span className="text-[11px] text-white/45 mt-1">de {total}</span>
      </div>
    </div>
  );
}

/* ── Asistente de pedido ─────────────────────────────────────────────────── */

interface Draft {
  avatarId: string;
  scriptNotes: string;
  product: string;
  tone: string;
  cta: string;
  driveUrl: string;
}

const EMPTY: Draft = { avatarId: '', scriptNotes: '', product: '', tone: '', cta: '', driveUrl: '' };

function Wizard({
  avatars,
  balance,
  onClose,
  onSubmit,
}: {
  avatars: StudioAvatar[];
  balance: number;
  onClose: () => void;
  onSubmit: (d: Draft) => Promise<string | null>;
}) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(EMPTY);
  const [query, setQuery] = useState('');
  const [facet, setFacet] = useState<string>('all');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const facets = useMemo(() => Array.from(new Set(avatars.flatMap((a) => [a.style, a.gender, ...a.tags]).filter(Boolean))).slice(0, 14), [avatars]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return avatars.filter((a) => (facet === 'all' || [a.style, a.gender, ...a.tags].includes(facet)) && (!q || `${a.name} ${a.style} ${a.gender} ${a.tags.join(' ')}`.toLowerCase().includes(q)));
  }, [avatars, query, facet]);

  const avatar = avatars.find((a) => a.id === d.avatarId);
  const seconds = estimateSeconds(d.scriptNotes);
  const words = (d.scriptNotes.trim().match(/\S+/g) || []).length;
  const over = seconds > MAX_VIDEO_SECONDS;
  const notesOk = d.scriptNotes.trim().length >= 10 && !over;
  const canNext = step === 0 ? !!avatar : step === 1 ? notesOk : true;

  const submit = async () => {
    setSending(true);
    setError(null);
    const err = await onSubmit(d);
    setSending(false);
    if (err) setError(err);
  };

  const STEPS = ['Avatar', 'Mensaje', 'Revisar'];

  return (
    <div className="fixed inset-0 z-[110] bg-black/75 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Pedir un vídeo" className="card-liquid w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl h-[96dvh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-5 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Clapperboard className="w-5 h-5 text-[var(--signal)]" /> Pedir un vídeo</h2>
            <button onClick={onClose} aria-label="Cerrar" className="text-white/50 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          <ol className="flex items-center gap-2 mt-4" aria-label="Pasos">
            {STEPS.map((label, i) => (
              <li key={label} className="flex-1 min-w-0">
                <div className={cn('h-1.5 rounded-full transition-colors', i <= step ? 'bg-[var(--signal)] shadow-[0_0_10px_var(--portal-glow)]' : 'bg-white/10')} />
                <div className={cn('text-[11px] mt-1.5 flex items-center gap-1', i === step ? 'text-[var(--signal)] font-semibold' : 'text-white/40')}>
                  {i < step ? <Check className="w-3 h-3" /> : <span className="font-mono">{i + 1}</span>} {label}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 0 && (
            avatars.length === 0 ? (
              <EmptyState icon={<UserRound className="w-6 h-6" />} title="Aún no hay avatares disponibles" text="Estamos preparando el catálogo. Escríbenos y te ayudamos a elegir." />
            ) : (
              <>
                <h3 className="text-base font-semibold">Elige quién habla en tu vídeo</h3>
                <p className="text-sm text-white/55 mt-1">Pulsa un avatar para seleccionarlo.</p>
                <div className="relative mt-4">
                  <Search className="w-4 h-4 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o estilo…" aria-label="Buscar avatar" className="w-full pl-10 pr-3 py-2.5 border border-[var(--portal-line-strong)] rounded-full text-sm outline-none placeholder:text-white/30" />
                </div>
                {facets.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto -mx-1 px-1 py-3">
                    <button onClick={() => setFacet('all')} aria-pressed={facet === 'all'} className="pn-chip">Todos</button>
                    {facets.map((f) => <button key={f} onClick={() => setFacet(f)} aria-pressed={facet === f} className="pn-chip">{f}</button>)}
                  </div>
                )}
                {shown.length === 0 ? (
                  <p className="text-sm text-white/45 text-center py-10">Ningún avatar coincide. Prueba con otro filtro.</p>
                ) : (
                  <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-1">
                    {shown.map((a) => {
                      const on = a.id === d.avatarId;
                      return (
                        <li key={a.id}>
                          <button
                            onClick={() => setD({ ...d, avatarId: a.id })}
                            aria-pressed={on}
                            className={cn('relative w-full text-left rounded-2xl overflow-hidden border transition-all cursor-pointer bg-white/[0.03]', on ? 'border-[var(--signal)] shadow-[0_0_0_2px_var(--signal),0_0_28px_-6px_var(--signal)]' : 'border-white/10 hover:border-[var(--portal-line-strong)]')}
                          >
                            <AvatarImage src={a.image_url} name={a.name} className="w-full aspect-[3/4]" />
                            {on && <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[var(--signal)] text-black flex items-center justify-center shadow-lg"><Check className="w-4 h-4" /></span>}
                            <div className="p-2.5">
                              <div className="text-sm font-semibold truncate">{a.name}</div>
                              <div className="text-[11px] text-white/45 truncate">{[a.style, a.gender].filter(Boolean).join(' · ') || ' '}</div>
                            </div>
                          </button>
                          {a.preview_url && (
                            <a href={a.preview_url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-white/50 hover:text-[var(--signal)]"><Play className="w-3 h-3" /> Ver ejemplo</a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )
          )}

          {step === 1 && (
            <div className="grid md:grid-cols-[1fr_220px] gap-5">
              <div className="space-y-4 min-w-0">
                <div>
                  <h3 className="text-base font-semibold">¿Qué quieres que diga el vídeo?</h3>
                  <p className="text-sm text-white/55 mt-1">Cuéntanoslo con tus palabras: las ideas, los datos y lo que no puede faltar. Nosotros escribimos el guion y tú lo apruebas.</p>
                </div>
                <div>
                  <textarea
                    value={d.scriptNotes}
                    onChange={(e) => setD({ ...d, scriptNotes: e.target.value })}
                    rows={7}
                    maxLength={2000}
                    placeholder="Ej.: Quiero presentar mi crema hidratante, que es vegana, absorbe en 10 segundos y dura todo el día. Que mencione que hay envío gratis…"
                    aria-label="Qué quieres que diga el vídeo"
                    aria-describedby="seconds-meter"
                    className="w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-y leading-relaxed"
                  />
                  <div id="seconds-meter" className="mt-2" aria-live="polite">
                    <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-300', over ? 'bg-red-400' : seconds > 38 ? 'bg-yellow-400' : 'bg-[var(--signal)] shadow-[0_0_10px_var(--portal-glow)]')} style={{ width: `${Math.min(100, (seconds / MAX_VIDEO_SECONDS) * 100)}%` }} />
                    </div>
                    <div className={cn('mt-1.5 text-xs flex justify-between', over ? 'text-red-400 font-medium' : 'text-white/50')}>
                      <span>≈ {seconds} s de {MAX_VIDEO_SECONDS} s{over ? ' · te pasas, acorta un poco' : ''}</span>
                      <span className="tabular-nums">{words}/{MAX_WORDS} palabras</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 min-w-0">
                <label className="block"><span className="pn-title">Producto o tu web</span><input value={d.product} onChange={(e) => setD({ ...d, product: e.target.value })} maxLength={300} placeholder="Crema Aloe · www.mitienda.com" className="mt-1.5 w-full rounded-2xl border px-4 py-2.5 text-sm outline-none" /></label>
                <div>
                  <span className="pn-title">Tono</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {TONES.map((t) => <button key={t} type="button" onClick={() => setD({ ...d, tone: d.tone === t ? '' : t })} aria-pressed={d.tone === t} className="pn-chip" style={{ fontSize: 11, padding: '3px 10px', minHeight: 30 }}>{t}</button>)}
                  </div>
                </div>
                <label className="block"><span className="pn-title">Llamada a la acción</span><input value={d.cta} onChange={(e) => setD({ ...d, cta: e.target.value })} maxLength={200} placeholder="Compra hoy con envío gratis" className="mt-1.5 w-full rounded-2xl border px-4 py-2.5 text-sm outline-none" /></label>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <label className="block">
                  <span className="pn-title flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> ¿Tienes fotos o archivos de tu producto?</span>
                  <input value={d.driveUrl} onChange={(e) => setD({ ...d, driveUrl: e.target.value })} maxLength={500} placeholder="https://drive.google.com/drive/folders/…" className="mt-2 w-full rounded-2xl border px-4 py-2.5 text-sm outline-none" />
                </label>
                <p className="text-xs text-white/50 mt-2 leading-relaxed">Súbelos a una carpeta de Google Drive, compártela con <b className="text-white/75">{LEGAL.email}</b> (con permiso de lectura) y pega aquí el enlace. Es opcional.</p>
              </div>
            </div>
          )}

          {step === 2 && avatar && (
            <div>
              <h3 className="text-base font-semibold">Revisa tu pedido</h3>
              <p className="text-sm text-white/55 mt-1">Al enviarlo se descuenta <b className="text-white/80">1 vídeo</b> de tu saldo (te quedarán {Math.max(0, balance - 1)}). Puedes cancelarlo mientras no esté en producción y el vídeo vuelve a tu saldo.</p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex gap-4">
                <AvatarImage src={avatar.image_url} name={avatar.name} className="w-20 h-28 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div><div className="pn-title">Avatar</div><div className="text-sm font-semibold">{avatar.name}</div></div>
                  <div><div className="pn-title">Lo que quieres que diga · ≈ {seconds} s</div><p className="text-sm text-white/75 whitespace-pre-wrap line-clamp-6">{d.scriptNotes}</p></div>
                </div>
              </div>
              <dl className="grid sm:grid-cols-3 gap-2 mt-3 text-xs">
                {d.product && <div className="rounded-xl border border-white/10 p-2.5"><dt className="text-white/40">Producto / web</dt><dd className="text-white/80 break-words">{d.product}</dd></div>}
                {d.tone && <div className="rounded-xl border border-white/10 p-2.5"><dt className="text-white/40">Tono</dt><dd className="text-white/80">{d.tone}</dd></div>}
                {d.cta && <div className="rounded-xl border border-white/10 p-2.5"><dt className="text-white/40">Llamada a la acción</dt><dd className="text-white/80 break-words">{d.cta}</dd></div>}
                {d.driveUrl && <div className="rounded-xl border border-white/10 p-2.5 sm:col-span-3"><dt className="text-white/40">Archivos (Google Drive)</dt><dd className="text-white/80 break-all">{d.driveUrl}</dd></div>}
              </dl>
              {error && <p role="alert" className="text-sm text-red-400 mt-4">{error}</p>}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
          <button onClick={() => (step === 0 ? onClose() : setStep(step - 1))} className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full text-sm text-white/65 hover:text-white cursor-pointer">
            {step === 0 ? 'Cancelar' : <><ArrowLeft className="w-4 h-4" /> Atrás</>}
          </button>
          {step < 2 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canNext} className="inline-flex items-center gap-1.5 px-5 h-11 rounded-full portal-cta text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={sending} className="inline-flex items-center gap-2 px-5 h-11 rounded-full portal-cta text-sm cursor-pointer disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Enviar pedido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Seguimiento de un pedido ────────────────────────────────────────────── */

function RequestCard({ r, busy, onAction }: { r: StudioRequest; busy: boolean; onAction: (id: string, action: 'approve' | 'changes' | 'cancel', feedback?: string) => Promise<string | null> }) {
  const [open, setOpen] = useState(r.status === 'script_review');
  const [asking, setAsking] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const idx = STATUS_ORDER.indexOf(r.status);
  const cancelled = r.status === 'cancelled';

  const run = async (action: 'approve' | 'changes' | 'cancel') => {
    setErr(null);
    const e = await onAction(r.id, action, feedback);
    if (e) setErr(e);
    else {
      setAsking(false);
      setFeedback('');
    }
  };

  return (
    <li className={cn('card-liquid rounded-3xl overflow-hidden pn-in', r.status === 'script_review' && 'shadow-[0_0_0_1px_var(--portal-line-strong),0_20px_60px_-30px_var(--portal-glow)]')}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center gap-4 p-4 text-left cursor-pointer">
        <AvatarImage src={r.avatar_image_url} name={r.avatar_name} className="w-14 h-[72px] rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{r.avatar_name}</span>
            <span className={cn('px-2.5 py-0.5 text-[11px] rounded-full border', cancelled ? 'border-white/15 text-white/45' : r.status === 'delivered' ? 'border-green-400/30 text-green-400 bg-green-400/10' : r.status === 'script_review' ? 'border-blue-400/30 text-blue-400 bg-blue-400/10' : 'border-[var(--portal-line-strong)] text-[var(--signal)] bg-[var(--signal)]/10')}>{STATUS_LABEL[r.status]}</span>
          </div>
          <p className="text-xs text-white/50 mt-1 line-clamp-1">{r.script_notes}</p>
          {!cancelled && (
            <div className="flex gap-1 mt-2.5" aria-hidden="true">
              {STATUS_ORDER.map((st, i) => <span key={st} className={cn('h-1 flex-1 rounded-full', i <= idx ? 'bg-[var(--signal)]' : 'bg-white/10')} />)}
            </div>
          )}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-white/40 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
          <p className={cn('text-sm', r.status === 'script_review' ? 'text-blue-300' : 'text-white/60')}>{STATUS_HINT[r.status]}</p>

          {r.status === 'script_review' && r.script_text && (
            <div className="rounded-2xl border border-[var(--portal-line-strong)] bg-[var(--signal)]/[0.05] p-4">
              <div className="pn-title mb-2 flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> Guion para tu aprobación</div>
              <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{r.script_text}</p>
              {!asking ? (
                <div className="flex flex-wrap gap-2 mt-4">
                  <button onClick={() => run('approve')} disabled={busy} className="inline-flex items-center gap-1.5 px-5 h-11 rounded-full portal-cta text-sm cursor-pointer disabled:opacity-50">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Aprobar guion
                  </button>
                  <button onClick={() => setAsking(true)} className="px-5 h-11 rounded-full border border-white/15 text-sm hover:border-[var(--portal-line-strong)] cursor-pointer">Pedir cambios</button>
                </div>
              ) : (
                <div className="mt-4 space-y-2">
                  <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} maxLength={2000} placeholder="¿Qué quieres cambiar del guion?" aria-label="Cambios que pides" className="w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-y" autoFocus />
                  <div className="flex gap-2">
                    <button onClick={() => run('changes')} disabled={busy || feedback.trim().length < 3} className="inline-flex items-center gap-1.5 px-5 h-10 rounded-full portal-cta text-sm cursor-pointer disabled:opacity-40">Enviar cambios</button>
                    <button onClick={() => setAsking(false)} className="px-4 h-10 rounded-full text-sm text-white/60 hover:text-white cursor-pointer">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {r.client_feedback && r.status === 'scripting' && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm"><span className="pn-title block mb-1">Tus cambios</span><span className="text-white/70 whitespace-pre-wrap">{r.client_feedback}</span></div>
          )}

          {r.status === 'delivered' && r.delivery_url && (
            <div className="flex flex-wrap gap-2">
              <a href={r.delivery_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 h-11 rounded-full portal-cta text-sm"><Play className="w-4 h-4" /> Ver mi vídeo</a>
              <a href={r.delivery_url} target="_blank" rel="noopener noreferrer" download className="inline-flex items-center gap-2 px-5 h-11 rounded-full border border-white/15 text-sm hover:border-[var(--portal-line-strong)]"><Download className="w-4 h-4" /> Descargar</a>
            </div>
          )}

          {r.status !== 'script_review' && r.script_text && r.status !== 'requested' && (
            <details className="text-sm"><summary className="cursor-pointer text-white/55 hover:text-white">Ver el guion</summary><p className="mt-2 text-white/75 whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.03] p-3">{r.script_text}</p></details>
          )}

          <dl className="grid sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl border border-white/10 p-2.5 sm:col-span-2"><dt className="text-white/40">Lo que pediste · ≈ {r.est_seconds} s</dt><dd className="text-white/75 whitespace-pre-wrap">{r.script_notes}</dd></div>
            {r.tone && <div className="rounded-xl border border-white/10 p-2.5"><dt className="text-white/40">Tono</dt><dd className="text-white/75">{r.tone}</dd></div>}
            {r.cta && <div className="rounded-xl border border-white/10 p-2.5"><dt className="text-white/40">Llamada a la acción</dt><dd className="text-white/75 break-words">{r.cta}</dd></div>}
          </dl>

          <div className="flex items-center justify-between text-[11px] text-white/35">
            <span>Pedido {timeAgo(r.created_at)}</span>
            {CLIENT_CANCELLABLE.includes(r.status) && (
              <button onClick={() => confirm('¿Cancelar el pedido? El vídeo volverá a tu saldo. Solo se puede cancelar hasta que pasa a producción.') && run('cancel')} disabled={busy} className="text-white/50 hover:text-red-400 cursor-pointer">Cancelar pedido</button>
            )}
          </div>
          {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
        </div>
      )}
    </li>
  );
}

/* ── Estudio completo: saldo + pedir + mis pedidos ───────────────────────── */

export default function VideoStudio({ token, preview }: { token?: string; preview?: StudioData }) {
  const [data, setData] = useState<StudioData | null>(preview || null);
  const [wizard, setWizard] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/account/videos', { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setData({ balance: d.balance || 0, granted: d.granted || 0, requests: d.requests || [], avatars: d.avatars || [], unavailable: d.unavailable });
    } catch {
      setData({ balance: 0, granted: 0, requests: [], avatars: [], unavailable: true });
    }
  }, [token]);

  useEffect(() => {
    if (!preview) load();
  }, [preview, load]);

  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  };

  const submit = async (draft: Draft): Promise<string | null> => {
    if (preview) {
      // Vista previa de la agencia: se simula, no se envía nada
      const av = data?.avatars.find((a) => a.id === draft.avatarId);
      const req: StudioRequest = {
        id: `preview-${Date.now()}`, avatar_id: draft.avatarId, avatar_name: av?.name || 'Avatar', avatar_image_url: av?.image_url || null, script_notes: draft.scriptNotes,
        est_seconds: estimateSeconds(draft.scriptNotes), product: draft.product || null, tone: draft.tone || null, cta: draft.cta || null, drive_url: draft.driveUrl || null,
        status: 'requested', script_text: null, client_feedback: null, delivery_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      };
      setData((cur) => cur && { ...cur, balance: Math.max(0, cur.balance - 1), requests: [req, ...cur.requests] });
      setWizard(false);
      flash('Vista previa: así se vería tu pedido enviado.');
      return null;
    }
    const res = await fetch('/api/account/videos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(draft) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return d.error || 'No se pudo enviar el pedido.';
    setWizard(false);
    flash('¡Pedido enviado! Te avisamos en cuanto el guion esté listo.');
    await load();
    return null;
  };

  const act = async (id: string, action: 'approve' | 'changes' | 'cancel', feedback?: string): Promise<string | null> => {
    setBusyId(id);
    try {
      if (preview) {
        const next: VideoStatus = action === 'approve' ? 'production' : action === 'changes' ? 'scripting' : 'cancelled';
        setData((cur) => cur && { ...cur, balance: action === 'cancel' ? cur.balance + 1 : cur.balance, requests: cur.requests.map((r) => (r.id === id ? { ...r, status: next, client_feedback: action === 'changes' ? feedback || null : r.client_feedback } : r)) });
        return null;
      }
      const res = await fetch(`/api/account/videos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, feedback }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return d.error || 'No se pudo completar.';
      flash(action === 'approve' ? 'Guion aprobado. Nos ponemos con tu vídeo.' : action === 'changes' ? 'Cambios enviados. Te avisamos con el guion nuevo.' : 'Pedido cancelado: el vídeo vuelve a tu saldo.');
      await load();
      return null;
    } finally {
      setBusyId(null);
    }
  };

  if (!data) return <Skeleton className="h-56" />;

  const waiting = data.requests.filter((r) => r.status === 'script_review').length;

  return (
    <>
      <section className="pn-hero p-5 md:p-7 pn-in" aria-label="Tus vídeos">
        <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8">
          <Ring left={data.balance} total={Math.max(data.granted, data.balance)} />
          <div className="min-w-0 text-center sm:text-left flex-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 border border-[var(--portal-line-strong)] text-[var(--signal)]"><Clapperboard className="w-3.5 h-3.5" /> Tus vídeos</span>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-3">
              {data.balance > 0 ? `Te ${data.balance === 1 ? 'queda' : 'quedan'} ${data.balance} ${data.balance === 1 ? 'vídeo' : 'vídeos'}` : data.granted > 0 ? 'Has usado todos tus vídeos' : 'Aún no tienes vídeos'}
            </h2>
            <p className="text-sm text-white/55 mt-1.5 max-w-md">
              {data.balance > 0 ? 'Elige un avatar, cuéntanos qué quieres que diga (hasta 45 segundos) y nosotros nos encargamos. Tú apruebas el guion antes de producir.' : 'Consigue más vídeos con cualquiera de nuestros packs y vuelve a pedir cuando quieras.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-5 justify-center sm:justify-start">
              {data.balance > 0 ? (
                <button onClick={() => setWizard(true)} className="inline-flex items-center gap-2 px-6 h-12 rounded-full portal-cta text-sm cursor-pointer"><Sparkles className="w-4 h-4" /> Pedir un vídeo</button>
              ) : (
                <Link href="/#precios" className="inline-flex items-center gap-2 px-6 h-12 rounded-full portal-cta text-sm">Ver packs <ArrowRight className="w-4 h-4" /></Link>
              )}
              {waiting > 0 && <span className="inline-flex items-center gap-1.5 px-4 h-12 rounded-full border border-blue-400/40 text-blue-300 text-sm"><PenLine className="w-4 h-4" /> {waiting} {waiting === 1 ? 'guion espera' : 'guiones esperan'} tu visto bueno</span>}
            </div>
          </div>
        </div>
      </section>

      {toast && <p role="status" className="rounded-2xl border border-[var(--portal-line-strong)] bg-[var(--signal)]/[0.08] px-4 py-3 text-sm pn-in">{toast}</p>}

      {data.unavailable && <p className="text-sm text-white/50">El estudio de vídeos todavía no está activado. Escríbenos si ves este mensaje.</p>}

      <Panel title="Mis pedidos" delay={60}>
        {data.requests.length === 0 ? (
          <EmptyState icon={<Clapperboard className="w-6 h-6" />} title="Todavía no has pedido ningún vídeo" text={data.balance > 0 ? 'Pulsa «Pedir un vídeo» para empezar. Son tres pasos.' : 'Cuando tengas vídeos disponibles, tus pedidos aparecerán aquí con su seguimiento.'} />
        ) : (
          <ul className="space-y-3">
            {data.requests.map((r) => <RequestCard key={r.id} r={r} busy={busyId === r.id} onAction={act} />)}
          </ul>
        )}
      </Panel>

      {wizard && <Wizard avatars={data.avatars} balance={data.balance} onClose={() => setWizard(false)} onSubmit={submit} />}
    </>
  );
}
