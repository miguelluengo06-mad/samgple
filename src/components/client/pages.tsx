'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCheck,
  Clapperboard,
  ExternalLink,
  LifeBuoy,
  Loader2,
  Mail,
  PenLine,
  PhoneCall,
  Play,
  Receipt,
  Search,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { LEGAL } from '@/lib/legal';
import { MAX_VIDEO_SECONDS, STATUS_LABEL } from '@/lib/videos';
import { formatCallDate, formatCallTime } from '@/lib/booking';
import { statusMeta, timeAgo } from '@/components/portal/leadMeta';
import { CountUp, EmptyState, Page, Panel, Skeleton, untilLabel } from '@/components/portal/ui';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { cn } from '@/lib/utils';
import { useClient } from './ClientProvider';
import { downloadCallIcs } from './ics';
import { AvatarImage, RequestCard, Ring } from './video';
import type { ClientPage } from './types';

type HrefFor = (p: ClientPage) => string;

const todayLabel = () => new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' }).format(new Date());

function Unconfirmed() {
  const c = useClient();
  if (c.confirmed) return null;
  return <p className="text-sm text-yellow-400 card-liquid rounded-2xl p-4 pn-in">Confirma tu email para ver aquí tus avisos, compras y vídeos. Te hemos enviado un enlace al registrarte.</p>;
}

/* ── Inicio ──────────────────────────────────────────────────────────────── */

export function HomePage({ hrefFor }: { hrefFor: HrefFor }) {
  const c = useClient();
  const { studio } = c;
  const first = (c.name || '').split(' ')[0];
  const now = Date.now();
  const next = c.calls
    .filter((x) => x.kind === 'call' && x.call_at && x.status !== 'lost' && new Date(x.call_at).getTime() + 30 * 60000 >= now)
    .sort((a, b) => new Date(a.call_at!).getTime() - new Date(b.call_at!).getTime())[0];

  if (c.loading) {
    return (
      <Page title={first ? `Hola, ${first}` : 'Inicio'} subtitle={todayLabel()} width="max-w-5xl">
        <Skeleton className="h-52" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      </Page>
    );
  }

  const recent = studio.requests.slice(0, 3);
  const latestNotices = c.notices.slice(0, 3);

  return (
    <Page title={first ? `Hola, ${first}` : 'Inicio'} subtitle={todayLabel()} width="max-w-5xl">
      <Unconfirmed />

      <section className="pn-hero p-5 md:p-7 pn-in" aria-label="Tus vídeos">
        <div className="flex flex-col sm:flex-row items-center gap-6 md:gap-8">
          <Ring left={studio.balance} total={Math.max(studio.granted, studio.balance)} />
          <div className="min-w-0 text-center sm:text-left flex-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 border border-[var(--portal-line-strong)] text-[var(--signal)]"><Clapperboard className="w-3.5 h-3.5" /> Tus vídeos</span>
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mt-3">
              {studio.balance > 0 ? `Te ${studio.balance === 1 ? 'queda' : 'quedan'} ${studio.balance} ${studio.balance === 1 ? 'vídeo' : 'vídeos'}` : studio.granted > 0 ? 'Has usado todos tus vídeos' : 'Aún no tienes vídeos'}
            </h2>
            <p className="text-sm text-white/60 mt-1.5 max-w-md">
              {studio.balance > 0 ? 'Elige un avatar, cuéntanos qué quieres que diga (hasta 45 segundos) y nosotros nos encargamos. Tú apruebas el guion antes de producir.' : 'Consigue más vídeos con cualquiera de nuestros packs y vuelve a pedir cuando quieras.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-5 justify-center sm:justify-start">
              {studio.balance > 0 ? (
                <button onClick={() => c.openWizard()} className="inline-flex items-center gap-2 px-6 h-12 rounded-full portal-cta text-sm cursor-pointer"><Sparkles className="w-4 h-4" /> Pedir un vídeo</button>
              ) : (
                <Link href="/#precios" className="inline-flex items-center gap-2 px-6 h-12 rounded-full portal-cta text-sm">Ver packs <ArrowRight className="w-4 h-4" /></Link>
              )}
              {c.waiting > 0 && (
                <Link href={hrefFor('videos')} className="inline-flex items-center gap-1.5 px-4 h-12 rounded-full border border-blue-400/40 text-blue-400 text-sm font-medium"><PenLine className="w-4 h-4" /> {c.waiting} {c.waiting === 1 ? 'guion espera' : 'guiones esperan'} tu visto bueno</Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'En curso', value: c.inProgress, icon: <Clapperboard className="w-3.5 h-3.5" />, page: 'videos' as const },
          { label: 'Para aprobar', value: c.waiting, icon: <PenLine className="w-3.5 h-3.5" />, page: 'videos' as const, accent: c.waiting > 0 },
          { label: 'Avisos sin leer', value: c.unread, icon: <BellRing className="w-3.5 h-3.5" />, page: 'avisos' as const, accent: c.unread > 0 },
        ].map((t, i) => (
          <Link key={t.label} href={hrefFor(t.page)} className="card-liquid card-liquid-interactive rounded-3xl p-4 pn-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="pn-title flex items-center gap-1.5">{t.icon}{t.label}</div>
            <div className={cn('text-3xl font-semibold tabular-nums mt-2', t.accent && 'text-[var(--signal)]')}><CountUp value={t.value} /></div>
          </Link>
        ))}
        <Link href={hrefFor('llamadas')} className="card-liquid card-liquid-interactive rounded-3xl p-4 pn-in" style={{ animationDelay: '150ms' }}>
          <div className="pn-title flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5" /> Próxima llamada</div>
          {next ? (
            <>
              <div className="text-base font-semibold mt-2 capitalize leading-tight">{formatCallDate(next.call_at!)}</div>
              <div className="text-xs text-white/55 mt-0.5">{formatCallTime(next.call_at!)} · {untilLabel(next.call_at!, now)}</div>
            </>
          ) : (
            <div className="text-sm text-white/55 mt-2">Ninguna agendada</div>
          )}
        </Link>
      </div>

      <div className="grid gap-4 md:gap-5 lg:grid-cols-[1.5fr_1fr] items-start">
        <Panel title="Tus últimos vídeos" action={{ label: 'Ver todos', href: hrefFor('videos') }} delay={60}>
          {recent.length === 0 ? (
            <div>
              <p className="text-sm text-white/60 mb-4">Todavía no has pedido ningún vídeo. Es muy fácil:</p>
              <ol className="grid sm:grid-cols-3 gap-3">
                {[
                  { n: '1', t: 'Elige un avatar', d: 'Quién habla en tu vídeo.' },
                  { n: '2', t: 'Cuéntanos el mensaje', d: 'Hasta 45 segundos.' },
                  { n: '3', t: 'Aprueba el guion', d: 'Y recibes tu vídeo.' },
                ].map((s) => (
                  <li key={s.n} className="rounded-2xl border border-[var(--portal-line)] bg-white/[0.03] p-3.5">
                    <span className="w-7 h-7 rounded-full bg-[var(--signal)] text-black text-xs font-bold flex items-center justify-center">{s.n}</span>
                    <div className="text-sm font-semibold mt-2">{s.t}</div>
                    <div className="text-xs text-white/50 mt-0.5">{s.d}</div>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link href={hrefFor('videos')} className="pn-row flex items-center gap-3 rounded-2xl px-2 py-2">
                    <AvatarImage src={r.avatar_image_url} name={r.avatar_name} className="w-11 h-14 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{r.avatar_name}</div>
                      <div className="text-xs text-white/50 truncate">{r.script_notes}</div>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full border border-[var(--portal-line-strong)] text-white/70 shrink-0">{STATUS_LABEL[r.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Avisos recientes" action={{ label: 'Ver todos', href: hrefFor('avisos') }} delay={120}>
          {latestNotices.length === 0 ? (
            <p className="text-sm text-white/55">Aquí verás cuándo tu guion está listo o tu vídeo terminado.</p>
          ) : (
            <ul className="space-y-2">
              {latestNotices.map((n) => (
                <li key={n.id}>
                  <Link href={hrefFor('avisos')} className={cn('block rounded-2xl border p-3', n.read_at ? 'border-[var(--portal-line)]' : 'border-[var(--portal-line-strong)] bg-[var(--signal)]/[0.06]')}>
                    <div className="text-sm font-semibold flex items-center gap-2">{!n.read_at && <span className="w-2 h-2 rounded-full bg-[var(--signal)] shrink-0" />} <span className="truncate">{n.title}</span></div>
                    <div className="text-[11px] text-white/45 mt-1">{timeAgo(n.created_at)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </Page>
  );
}

/* ── Mis vídeos ──────────────────────────────────────────────────────────── */

type VFilter = 'all' | 'live' | 'review' | 'done' | 'cancelled';

export function VideosPage() {
  const c = useClient();
  const [filter, setFilter] = useState<VFilter>('all');
  const rs = c.studio.requests;
  const match: Record<VFilter, (s: string) => boolean> = {
    all: () => true,
    live: (s) => s === 'requested' || s === 'scripting' || s === 'production',
    review: (s) => s === 'script_review',
    done: (s) => s === 'delivered',
    cancelled: (s) => s === 'cancelled',
  };
  const FILTERS: [VFilter, string][] = [['all', 'Todos'], ['live', 'En curso'], ['review', 'Para aprobar'], ['done', 'Entregados'], ['cancelled', 'Cancelados']];
  const shown = rs.filter((r) => match[filter](r.status));

  return (
    <Page
      title="Mis vídeos"
      subtitle={`${c.studio.balance} ${c.studio.balance === 1 ? 'vídeo disponible' : 'vídeos disponibles'}`}
      width="max-w-4xl"
      actions={
        <button onClick={() => c.openWizard()} disabled={c.studio.balance < 1} className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full portal-cta text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
          <Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">Pedir un vídeo</span><span className="sm:hidden">Pedir</span>
        </button>
      }
    >
      <Unconfirmed />
      {c.studio.unavailable && <p className="text-sm text-white/55">El estudio de vídeos todavía no está activado. Escríbenos si ves este mensaje.</p>}
      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {FILTERS.map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)} aria-pressed={filter === v} className="pn-chip">
            {label} <span className={cn('tabular-nums', filter === v ? 'text-white/80' : 'text-white/40')}>{rs.filter((r) => match[v](r.status)).length}</span>
          </button>
        ))}
      </div>
      {c.loading ? (
        <Skeleton className="h-32" />
      ) : shown.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Clapperboard className="w-6 h-6" />}
            title={rs.length === 0 ? 'Todavía no has pedido ningún vídeo' : 'Nada por aquí'}
            text={rs.length === 0 ? (c.studio.balance > 0 ? 'Pulsa «Pedir un vídeo» para empezar. Son tres pasos.' : 'Cuando tengas vídeos disponibles, tus pedidos aparecerán aquí con su seguimiento.') : 'No hay pedidos con este filtro.'}
          />
        </Panel>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => <RequestCard key={r.id} r={r} busy={c.busyVideoId === r.id} onAction={c.videoAction} />)}
        </ul>
      )}
    </Page>
  );
}

/* ── Avatares ────────────────────────────────────────────────────────────── */

export function AvatarsPage() {
  const c = useClient();
  const { avatars, balance } = c.studio;
  const [query, setQuery] = useState('');
  const [facet, setFacet] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const facets = useMemo(() => Array.from(new Set(avatars.flatMap((a) => [a.style, a.gender, ...a.tags]).filter(Boolean))).slice(0, 16), [avatars]);
  const shown = avatars.filter((a) => (facet === 'all' || [a.style, a.gender, ...a.tags].includes(facet)) && (!query.trim() || `${a.name} ${a.style} ${a.gender} ${a.tags.join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())));
  const open = avatars.find((a) => a.id === openId) || null;

  return (
    <Page title="Avatares" subtitle="Elige quién habla en tus vídeos" width="max-w-5xl">
      <div className="relative">
        <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, estilo o etiqueta…" aria-label="Buscar avatar" className="w-full pl-10 pr-3 py-3 border rounded-full text-sm outline-none" />
      </div>
      {facets.length > 0 && (
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
          <button onClick={() => setFacet('all')} aria-pressed={facet === 'all'} className="pn-chip">Todos</button>
          {facets.map((f) => <button key={f} onClick={() => setFacet(f)} aria-pressed={facet === f} className="pn-chip">{f}</button>)}
        </div>
      )}
      {c.loading ? (
        <Skeleton className="h-64" />
      ) : avatars.length === 0 ? (
        <Panel><EmptyState icon={<UserRound className="w-6 h-6" />} title="Aún no hay avatares disponibles" text="Estamos preparando el catálogo. Escríbenos y te ayudamos a elegir." /></Panel>
      ) : shown.length === 0 ? (
        <p className="text-sm text-white/50 text-center py-12">Ningún avatar coincide con tu búsqueda.</p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {shown.map((a, i) => (
            <li key={a.id} className="pn-in" style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}>
              <button onClick={() => setOpenId(a.id)} className="card-liquid card-liquid-interactive w-full text-left rounded-3xl overflow-hidden cursor-pointer">
                <AvatarImage src={a.image_url} name={a.name} className="w-full aspect-[3/4]" />
                <div className="p-3">
                  <div className="text-sm font-semibold truncate">{a.name}</div>
                  <div className="text-xs text-white/50 truncate">{[a.style, a.gender].filter(Boolean).join(' · ') || ' '}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setOpenId(null)}>
          <div role="dialog" aria-modal="true" aria-label={open.name} className="card-liquid w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[94dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="grid sm:grid-cols-[260px_1fr]">
              <AvatarImage src={open.image_url} name={open.name} className="w-full aspect-[3/4] sm:aspect-auto sm:h-full min-h-[260px]" />
              <div className="p-5 md:p-6 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div><h2 className="text-xl font-semibold">{open.name}</h2><p className="text-sm text-white/55 mt-0.5">{[open.style, open.gender].filter(Boolean).join(' · ')}</p></div>
                  <button onClick={() => setOpenId(null)} aria-label="Cerrar" className="text-white/50 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
                </div>
                {open.tags.length > 0 && <div className="flex flex-wrap gap-1.5 mt-4">{open.tags.map((t) => <span key={t} className="pn-chip" style={{ fontSize: 11, padding: '2px 9px' }}>#{t}</span>)}</div>}
                {open.preview_url && <a href={open.preview_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--signal)] hover:underline"><Play className="w-4 h-4" /> Ver un ejemplo</a>}
                <div className="mt-auto pt-6">
                  {balance > 0 ? (
                    <button onClick={() => { setOpenId(null); c.openWizard(open.id); }} className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full portal-cta text-sm cursor-pointer"><Sparkles className="w-4 h-4" /> Pedir un vídeo con {open.name}</button>
                  ) : (
                    <Link href="/#precios" className="w-full inline-flex items-center justify-center h-12 rounded-full border border-[var(--portal-line-strong)] text-sm">Consigue vídeos para pedirlo</Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

/* ── Avisos ──────────────────────────────────────────────────────────────── */

export function NoticesPage() {
  const c = useClient();
  return (
    <Page
      title="Avisos"
      subtitle={c.unread > 0 ? `${c.unread} sin leer` : 'Todo al día'}
      width="max-w-3xl"
      actions={c.unread > 0 ? (
        <button onClick={() => c.notices.filter((n) => !n.read_at).forEach((n) => c.markNoticeRead(n))} className="inline-flex items-center gap-1.5 px-3.5 h-10 rounded-full border border-[var(--portal-line-strong)] text-sm hover:border-[var(--signal)] cursor-pointer"><CheckCheck className="w-4 h-4" /> <span className="hidden sm:inline">Marcar todos como leídos</span><span className="sm:hidden">Leídos</span></button>
      ) : undefined}
    >
      {c.loading ? (
        <Skeleton className="h-32" />
      ) : c.notices.length === 0 ? (
        <Panel><EmptyState icon={<BellRing className="w-6 h-6" />} title="Sin avisos por ahora" text="Aquí te avisaremos cuando tu guion esté listo para revisar o tus vídeos estén terminados." /></Panel>
      ) : (
        <ul className="space-y-3">
          {c.notices.map((n) => (
            <li key={n.id} className="pn-in">
              <button onClick={() => c.markNoticeRead(n)} className={cn('w-full text-left rounded-3xl border p-4 md:p-5 transition-colors', n.read_at ? 'card-liquid' : 'border-[var(--portal-line-strong)] bg-[var(--signal)]/[0.07] cursor-pointer shadow-[0_14px_34px_-22px_rgba(79,122,16,0.5)]')}>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold">{n.title}</span>
                  {n.read_at ? <Check className="w-4 h-4 text-white/35 shrink-0" aria-label="Leído" /> : <span className="w-2.5 h-2.5 mt-1 rounded-full bg-[var(--signal)] shrink-0" aria-label="Sin leer" />}
                </div>
                <p className="text-sm text-white/65 mt-1.5 whitespace-pre-wrap">{n.body}</p>
                <div className="text-[11px] text-white/40 mt-2.5">{timeAgo(n.created_at)}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

/* ── Compras ─────────────────────────────────────────────────────────────── */

export function PurchasesPage() {
  const c = useClient();
  const total = c.purchases.reduce((a, p) => a + p.amount_eur, 0);
  return (
    <Page
      title="Compras"
      subtitle={c.purchases.length > 0 ? `${c.purchases.length} ${c.purchases.length === 1 ? 'compra' : 'compras'} · ${total.toLocaleString('es-ES')} € en total` : undefined}
      width="max-w-3xl"
      actions={<Link href="/#precios" className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full portal-cta text-sm"><Sparkles className="w-4 h-4" /> <span className="hidden sm:inline">Conseguir más vídeos</span><span className="sm:hidden">Más vídeos</span></Link>}
    >
      {c.loading ? (
        <Skeleton className="h-32" />
      ) : c.purchases.length === 0 ? (
        <Panel><EmptyState icon={<Receipt className="w-6 h-6" />} title="Todavía no hay compras" text="Cuando compres un pack con este email, lo verás aquí con su factura." /></Panel>
      ) : (
        <ul className="space-y-3">
          {c.purchases.map((p) => (
            <li key={p.id} className="card-liquid rounded-3xl p-4 md:p-5 flex items-center gap-4 pn-in">
              <span className="w-11 h-11 rounded-2xl bg-[var(--signal)]/10 text-[var(--signal)] border border-[var(--portal-line-strong)] flex items-center justify-center shrink-0"><Receipt className="w-5 h-5" /></span>
              <div className="min-w-0 flex-1">
                {p.items.length > 1 ? (
                  <ul className="text-sm font-semibold space-y-0.5">{p.items.map((it) => <li key={it.name} className="truncate">{it.qty > 1 ? `${it.qty} × ` : ''}{it.name}</li>)}</ul>
                ) : (
                  <div className="text-sm font-semibold truncate">{p.pack_name || 'Pack'}</div>
                )}
                <div className="text-xs text-white/50 mt-0.5">{p.paid_at ? new Date(p.paid_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}{p.monthly ? ' · mensual' : ''}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-base font-semibold tabular-nums">{p.amount_eur.toLocaleString('es-ES')} €</div>
                {p.invoice_url && <a href={p.invoice_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--signal)] hover:underline inline-flex items-center gap-1 mt-0.5">Factura <ExternalLink className="w-3 h-3" /></a>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

/* ── Llamadas ────────────────────────────────────────────────────────────── */

export function CallsPage() {
  const c = useClient();
  const now = Date.now();
  const list = c.calls.filter((x) => x.call_at);
  const upcoming = list.filter((x) => x.kind === 'call' && x.status !== 'lost' && new Date(x.call_at!).getTime() + 30 * 60000 >= now).sort((a, b) => new Date(a.call_at!).getTime() - new Date(b.call_at!).getTime());
  const past = list.filter((x) => !upcoming.includes(x)).sort((a, b) => new Date(b.call_at!).getTime() - new Date(a.call_at!).getTime());
  const next = upcoming[0];

  return (
    <Page title="Llamadas" subtitle="Reserva un hueco de 30 minutos cuando quieras" width="max-w-3xl" actions={<Link href="/#contacto" className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full portal-cta text-sm"><CalendarPlus className="w-4 h-4" /> <span className="hidden sm:inline">Agendar llamada</span><span className="sm:hidden">Agendar</span></Link>}>
      {c.loading ? (
        <Skeleton className="h-32" />
      ) : (
        <>
          {next ? (
            <section className="pn-hero p-5 md:p-6 pn-in">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 bg-[var(--signal)] text-black"><PhoneCall className="w-3.5 h-3.5" /> Tu próxima llamada · {untilLabel(next.call_at!, now)}</span>
              <h2 className="text-2xl font-semibold tracking-tight mt-3 capitalize">{formatCallDate(next.call_at!)}</h2>
              <p className="text-sm text-white/60 mt-1">{formatCallTime(next.call_at!)} · horario de Madrid · 30 min</p>
              <button onClick={() => downloadCallIcs(next.id, next.call_at!)} className="mt-4 inline-flex items-center gap-2 px-4 h-10 rounded-full border border-[var(--portal-line-strong)] text-sm hover:border-[var(--signal)] cursor-pointer"><CalendarDays className="w-4 h-4" /> Añadir al calendario</button>
            </section>
          ) : (
            <Panel><EmptyState icon={<PhoneCall className="w-6 h-6" />} title="No tienes ninguna llamada agendada" text="Reserva una llamada de 30 minutos para hablar de tu proyecto." action={<Link href="/#contacto" className="inline-flex items-center gap-2 px-5 h-11 rounded-full portal-cta text-sm"><CalendarPlus className="w-4 h-4" /> Agendar llamada</Link>} /></Panel>
          )}

          {past.length > 0 && (
            <Panel title="Historial" delay={80}>
              <ul className="divide-y divide-white/10 -my-2">
                {past.map((x) => {
                  const meta = statusMeta(x.status, x.kind);
                  return (
                    <li key={x.id} className="flex items-center gap-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium capitalize">{formatCallDate(x.call_at!, { withYear: true })}</div>
                        <div className="text-xs text-white/50 mt-0.5">{formatCallTime(x.call_at!)} · horario de Madrid</div>
                      </div>
                      <span className={cn('px-2.5 py-0.5 text-xs rounded-full inline-flex items-center gap-1.5 shrink-0', meta.badgeClass)}><span className={cn('w-1.5 h-1.5 rounded-full', meta.dotColor)} />{meta.label}</span>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
        </>
      )}
    </Page>
  );
}

/* ── Ayuda ───────────────────────────────────────────────────────────────── */

const FAQ = [
  { q: '¿Cómo pido un vídeo?', a: 'Pulsa «Pedir un vídeo»: eliges un avatar, nos cuentas qué quieres que diga y revisas el pedido. Se descuenta un vídeo de tu saldo.' },
  { q: `¿Cuánto puede durar cada vídeo?`, a: `Hasta ${MAX_VIDEO_SECONDS} segundos, unas 110 palabras. El medidor te avisa si te pasas mientras escribes.` },
  { q: '¿Qué pasa después de pedirlo?', a: 'Escribimos el guion con lo que nos has contado y te lo enviamos. Tú lo apruebas o pides cambios: no producimos nada sin tu visto bueno.' },
  { q: '¿Puedo cancelar un pedido?', a: 'Sí, mientras no haya pasado a producción. El vídeo vuelve a tu saldo.' },
  { q: '¿Cómo te paso fotos o archivos de mi producto?', a: `Súbelos a una carpeta de Google Drive, compártela con ${LEGAL.email} y pega el enlace al hacer el pedido.` },
  { q: '¿Cómo consigo más vídeos?', a: 'Con cualquiera de los packs de la web. Los vídeos se suman a tu saldo en cuanto pagas.' },
];

export function HelpPage() {
  const c = useClient();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);
    const r = await c.sendSupport(subject, message);
    setResult(r);
    if (r.ok) {
      setSubject('');
      setMessage('');
    }
    setSending(false);
  };

  return (
    <Page title="Ayuda" subtitle="Preguntas frecuentes y contacto" width="max-w-4xl">
      <div className="grid gap-4 md:gap-5 lg:grid-cols-[1.1fr_1fr] items-start">
        <Panel title="Preguntas frecuentes">
          <div className="divide-y divide-white/10 -my-2">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0} className="group py-3.5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">{f.q}<span className="text-[var(--signal)] text-lg leading-none group-open:rotate-45 transition-transform">+</span></summary>
                <p className="text-sm text-white/65 mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </Panel>

        <Panel delay={80}>
          <h2 className="pn-title mb-1 flex items-center gap-2"><LifeBuoy className="w-3.5 h-3.5 text-[var(--signal)]" /> Habla con nosotros</h2>
          <p className="text-xs text-white/55 mb-4">Escríbenos y te respondemos por email.</p>
          <form onSubmit={send} className="space-y-3">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} required placeholder="Asunto" aria-label="Asunto" className="w-full rounded-2xl border px-4 py-3 text-sm outline-none" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} required rows={6} placeholder="¿En qué podemos ayudarte?" aria-label="Mensaje" className="w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-y" />
            <button type="submit" disabled={sending || !c.confirmed} className="w-full inline-flex items-center justify-center gap-2 px-4 h-12 rounded-full portal-cta text-sm disabled:opacity-50 cursor-pointer">{sending && <Loader2 className="w-4 h-4 animate-spin" />} Enviar mensaje</button>
            {result && <p role="status" className={cn('text-xs text-center', result.ok ? 'text-green-400' : 'text-red-400')}>{result.text}</p>}
          </form>
          <a href={`mailto:${LEGAL.email}`} className="mt-4 inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-[var(--signal)]"><Mail className="w-3.5 h-3.5" /> {LEGAL.email}</a>
        </Panel>
      </div>
    </Page>
  );
}

/* ── Ajustes ─────────────────────────────────────────────────────────────── */

export function SettingsPage() {
  const c = useClient();
  return (
    <Page title="Ajustes" subtitle="Tu nombre, tu email y tu contraseña" width="max-w-2xl">
      {c.preview ? (
        <Panel><p className="text-sm text-white/60">En la vista previa no se muestran los ajustes del cliente.</p></Panel>
      ) : (
        <AccountSettings />
      )}
    </Page>
  );
}
