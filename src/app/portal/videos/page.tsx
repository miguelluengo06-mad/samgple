'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clapperboard,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { EmptyState, Page, Panel, Skeleton } from '@/components/portal/ui';
import { timeAgo } from '@/components/portal/leadMeta';
import { STATUS_LABEL, STATUS_ORDER, VIDEO_SETUP_SQL, type VideoStatus } from '@/lib/videos';
import { cn } from '@/lib/utils';
import { AvatarModal, NewAvatarButton, RequestDrawer, Thumb } from './parts';
import type { Avatar, VideoRequest } from './types';

type Filter = 'todo' | 'waiting' | 'production' | 'delivered' | 'all';

const FILTERS: { value: Filter; label: string; match: (s: VideoStatus) => boolean }[] = [
  { value: 'todo', label: 'Por hacer', match: (s) => s === 'requested' || s === 'scripting' },
  { value: 'waiting', label: 'Esperando al cliente', match: (s) => s === 'script_review' },
  { value: 'production', label: 'En producción', match: (s) => s === 'production' },
  { value: 'delivered', label: 'Entregados', match: (s) => s === 'delivered' },
  { value: 'all', label: 'Todos', match: () => true },
];

const TONE: Record<VideoStatus, string> = {
  requested: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
  scripting: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30',
  script_review: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  production: 'bg-[var(--signal)]/10 text-[var(--signal)] border-[var(--portal-line-strong)]',
  delivered: 'bg-green-400/10 text-green-400 border-green-400/30',
  cancelled: 'bg-white/5 text-white/45 border-white/15',
};

export default function VideosPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [tab, setTab] = useState<'pedidos' | 'avatares'>('pedidos');
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState(false);
  const [requests, setRequests] = useState<VideoRequest[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [filter, setFilter] = useState<Filter>('todo');
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [editingAvatar, setEditingAvatar] = useState<Partial<Avatar> | null>(null);

  const headers = useMemo(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [r, a] = await Promise.all([fetch('/api/videos', { headers }), fetch('/api/avatars', { headers })]);
      const rd = await r.json();
      const ad = await a.json();
      if (rd.setup || ad.setup) setSetup(true);
      else if (!r.ok || !a.ok) setError(rd.error || ad.error || 'No se pudo cargar');
      else {
        setSetup(false);
        setRequests(rd.requests || []);
        setBalances(rd.balances || {});
        setAvatars(ad.avatars || []);
        setError(null);
      }
    } catch {
      setError('No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  useEffect(() => { load(); }, [load]);

  const pending = requests.filter((r) => r.status === 'requested' || r.status === 'scripting').length;
  const shown = requests.filter((r) => FILTERS.find((f) => f.value === filter)!.match(r.status));
  const open = requests.find((r) => r.id === openId) || null;

  const sync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch('/api/videos/sync', { method: 'POST', headers });
      const d = await res.json();
      setSyncMsg(res.ok ? (d.videos > 0 ? `Listo: ${d.videos} vídeos apuntados a ${d.customers} compras.` : 'Todo al día: no había compras sin apuntar.') : d.error || 'No se pudo sincronizar');
      await load();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Page title="Vídeos">
        <Skeleton className="h-12" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </Page>
    );
  }

  if (setup) {
    return (
      <Page title="Vídeos" subtitle="Pedidos de tus clientes y catálogo de avatares" width="max-w-3xl">
        <Panel title="Un último paso: crear las tablas">
          <p className="text-sm text-white/65 mb-4">Copia este código, pégalo en <b>Supabase → SQL Editor → Run</b> y vuelve aquí.</p>
          <pre className="whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-relaxed font-mono max-h-72 overflow-y-auto">{VIDEO_SETUP_SQL}</pre>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={async () => { try { await navigator.clipboard.writeText(VIDEO_SETUP_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full portal-cta text-sm cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copiado' : 'Copiar SQL'}
            </button>
            <button onClick={load} className="px-4 py-2.5 rounded-full border border-white/15 text-sm hover:border-[var(--portal-line-strong)] cursor-pointer">Ya lo he ejecutado</button>
          </div>
        </Panel>
      </Page>
    );
  }

  return (
    <Page
      title="Vídeos"
      subtitle="Pedidos de tus clientes y catálogo de avatares"
      width="max-w-[1200px]"
      actions={
        tab === 'avatares' ? <NewAvatarButton onClick={() => setEditingAvatar({})} /> : (
          <button onClick={sync} disabled={syncing} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full border border-white/15 text-xs hover:border-[var(--portal-line-strong)] cursor-pointer disabled:opacity-50" title="Apunta en el saldo los vídeos de compras anteriores">
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} <span className="hidden sm:inline">Sincronizar compras</span>
          </button>
        )
      }
    >
      {error && <p role="alert" className="text-sm text-red-400 card-liquid rounded-2xl p-3">{error}</p>}
      {syncMsg && <p role="status" className="text-sm text-white/70 card-liquid rounded-2xl p-3">{syncMsg}</p>}

      <div className="flex items-center gap-2" role="tablist">
        <button role="tab" aria-selected={tab === 'pedidos'} onClick={() => setTab('pedidos')} className="pn-chip"><Clapperboard className="w-3.5 h-3.5" /> Pedidos {pending > 0 && <span className="tabular-nums">{pending}</span>}</button>
        <button role="tab" aria-selected={tab === 'avatares'} onClick={() => setTab('avatares')} className="pn-chip"><UserRound className="w-3.5 h-3.5" /> Avatares <span className="tabular-nums opacity-70">{avatars.length}</span></button>
      </div>

      {tab === 'pedidos' ? (
        <>
          <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
            {FILTERS.map((f) => {
              const n = requests.filter((r) => f.value === 'all' ? true : f.match(r.status)).length;
              return (
                <button key={f.value} onClick={() => setFilter(f.value)} aria-pressed={filter === f.value} className="pn-chip">
                  {f.label} <span className={cn('tabular-nums', filter === f.value ? 'text-black/60' : 'text-white/35')}>{n}</span>
                </button>
              );
            })}
          </div>

          {shown.length === 0 ? (
            <EmptyState icon={<Clapperboard className="w-6 h-6" />} title={filter === 'todo' ? 'Nada por hacer' : 'Sin pedidos aquí'} text="Cuando un cliente pida un vídeo desde su panel, te avisa Telegram y aparece en esta lista." />
          ) : (
            <ul className="space-y-3">
              {shown.map((r, i) => (
                <li key={r.id} className="pn-in" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                  <button onClick={() => setOpenId(r.id)} className="card-liquid rounded-3xl w-full text-left p-4 flex items-center gap-4 cursor-pointer">
                    <Thumb src={r.avatar_image_url} name={r.avatar_name} className="w-14 h-[72px]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{r.customer_name || r.customer_email}</span>
                        <span className={cn('px-2.5 py-0.5 text-[11px] rounded-full border', TONE[r.status])}>{STATUS_LABEL[r.status]}</span>
                      </div>
                      <div className="text-xs text-white/50 mt-0.5">{r.avatar_name} · ≈ {r.est_seconds} s{r.tone ? ` · ${r.tone}` : ''}</div>
                      <p className="text-sm text-white/60 line-clamp-2 mt-1.5">{r.script_notes}</p>
                    </div>
                    <span className="text-[11px] text-white/40 shrink-0 self-start">{timeAgo(r.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : avatars.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<UserRound className="w-6 h-6" />}
            title="Tu catálogo está vacío"
            text="Añade los avatares que podrán elegir tus clientes: nombre, estilo y el enlace de su imagen."
            action={<NewAvatarButton onClick={() => setEditingAvatar({})} />}
          />
        </Panel>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {avatars.map((a) => (
            <li key={a.id} className={cn('card-liquid rounded-3xl overflow-hidden pn-in', !a.active && 'opacity-55')}>
              <div className="relative">
                <Thumb src={a.image_url} name={a.name} className="w-full aspect-[3/4] rounded-none" />
                {!a.active && <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/70 text-white/80">Oculto</span>}
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold truncate">{a.name}</div>
                <div className="text-xs text-white/50 truncate">{[a.style, a.gender].filter(Boolean).join(' · ') || 'Sin estilo'}</div>
                <div className="flex items-center gap-1 mt-2">
                  <button onClick={() => toggleAvatar(a)} aria-label={a.active ? `Ocultar ${a.name}` : `Mostrar ${a.name}`} title={a.active ? 'Ocultar a los clientes' : 'Mostrar a los clientes'} className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/60 cursor-pointer">
                    {a.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => setEditingAvatar(a)} aria-label={`Editar ${a.name}`} className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/60 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => removeAvatar(a)} aria-label={`Eliminar ${a.name}`} className="ml-auto w-8 h-8 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-white/40 hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <RequestDrawer
          key={open.id}
          request={open}
          balance={balances[open.customer_email] ?? 0}
          headers={headers}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}
      {editingAvatar && <AvatarModal avatar={editingAvatar} headers={headers} onClose={() => setEditingAvatar(null)} onSaved={() => { setEditingAvatar(null); load(); }} />}
    </Page>
  );

  // — acciones del catálogo —
  async function toggleAvatar(a: Avatar) {
    setAvatars((all) => all.map((x) => (x.id === a.id ? { ...x, active: !a.active } : x)));
    const res = await fetch(`/api/avatars/${a.id}`, { method: 'PATCH', headers, body: JSON.stringify({ active: !a.active }) });
    if (!res.ok) await load();
  }
  async function removeAvatar(a: Avatar) {
    if (!confirm(`¿Eliminar a ${a.name} del catálogo? Los pedidos ya hechos no cambian.`)) return;
    await fetch(`/api/avatars/${a.id}`, { method: 'DELETE', headers });
    await load();
  }
}
