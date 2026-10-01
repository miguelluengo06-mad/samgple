'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookMarked,
  Check,
  Copy,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Puzzle,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { EmptyState, Page, Panel, Skeleton } from '@/components/portal/ui';
import { CATEGORY_SUGGESTIONS, PROMPTS_SETUP_SQL, composePrompt, extractVariables } from '@/lib/prompts';
import type { PromptRow } from '@/lib/prompts';
import { cn } from '@/lib/utils';

interface TrayItem {
  uid: string;
  blockId: string;
}

let uidCounter = 0;
const newUid = () => `t${++uidCounter}`;

export default function PromptsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [rows, setRows] = useState<PromptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<'piezas' | 'recetas'>('piezas');
  const [category, setCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [onlyFav, setOnlyFav] = useState(false);
  const [sort, setSort] = useState<'recent' | 'az' | 'fav'>('recent');

  const [tray, setTray] = useState<TrayItem[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [recipeName, setRecipeName] = useState('');
  const [dragUid, setDragUid] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<Partial<PromptRow> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const builderRef = useRef<HTMLDivElement>(null);

  const headers = useMemo(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/prompts', { headers });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'No se pudieron cargar los prompts');
      else {
        setRows(data.prompts || []);
        setSetup(!!data.setup);
        setError(null);
      }
    } catch {
      setError('No se pudieron cargar los prompts');
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  useEffect(() => { load(); }, [load]);

  const blocks = useMemo(() => rows.filter((r) => r.kind === 'block'), [rows]);
  const recipes = useMemo(() => rows.filter((r) => r.kind === 'recipe'), [rows]);
  const byId = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);
  const categories = useMemo(() => Array.from(new Set(blocks.map((b) => b.category).filter(Boolean))), [blocks]);

  const tags = useMemo(() => {
    const count = new Map<string, number>();
    for (const b of blocks) for (const t of b.tags || []) count.set(t, (count.get(t) || 0) + 1);
    return [...count.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([t]) => t);
  }, [blocks]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = blocks.filter(
      (b) =>
        (category === 'all' || b.category === category) &&
        (!onlyFav || b.favorite) &&
        tagFilter.every((t) => (b.tags || []).includes(t)) &&
        (!q || `${b.title} ${b.body} ${b.category} ${(b.tags || []).join(' ')}`.toLowerCase().includes(q))
    );
    return list.sort((a, b) => {
      if (sort === 'az') return a.title.localeCompare(b.title, 'es');
      if (sort === 'fav' && a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [blocks, category, query, tagFilter, onlyFav, sort]);

  const activeFilters = (category !== 'all' ? 1 : 0) + tagFilter.length + (onlyFav ? 1 : 0) + (query.trim() ? 1 : 0);
  const clearFilters = () => {
    setCategory('all');
    setTagFilter([]);
    setOnlyFav(false);
    setQuery('');
  };

  const toggleFav = async (b: PromptRow) => {
    if (!token) return;
    setRows((all) => all.map((r) => (r.id === b.id ? { ...r, favorite: !b.favorite } : r)));
    const res = await fetch(`/api/prompts/${b.id}`, { method: 'PATCH', headers, body: JSON.stringify({ favorite: !b.favorite }) });
    if (!res.ok) setRows((all) => all.map((r) => (r.id === b.id ? { ...r, favorite: b.favorite } : r)));
  };

  const trayBlocks = tray.map((t) => byId.get(t.blockId)).filter((b): b is PromptRow => !!b);
  const variables = useMemo(() => extractVariables(...trayBlocks.map((b) => b.body)), [trayBlocks]);
  const composed = composePrompt(trayBlocks.map((b) => b.body), values);

  const add = (id: string) => setTray((t) => [...t, { uid: newUid(), blockId: id }]);
  const remove = (uid: string) => setTray((t) => t.filter((x) => x.uid !== uid));
  const move = (uid: string, dir: -1 | 1) =>
    setTray((t) => {
      const i = t.findIndex((x) => x.uid === uid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= t.length) return t;
      const copy = t.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  const reorderTo = (fromUid: string, toUid: string) =>
    setTray((t) => {
      const from = t.findIndex((x) => x.uid === fromUid);
      const to = t.findIndex((x) => x.uid === toUid);
      if (from < 0 || to < 0 || from === to) return t;
      const copy = t.slice();
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });

  const flash = (key: string) => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  };
  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(key);
    } catch {
      setError('No se pudo copiar. Selecciona el texto y cópialo a mano.');
    }
  };

  const clearPuzzle = () => {
    setTray([]);
    setValues({});
    setRecipeId(null);
    setRecipeName('');
  };

  const loadRecipe = (r: PromptRow) => {
    setTray(r.block_ids.filter((id) => byId.has(id)).map((id) => ({ uid: newUid(), blockId: id })));
    setRecipeId(r.id);
    setRecipeName(r.title);
    setValues({});
    builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const saveRecipe = async (asNew: boolean) => {
    if (!token || tray.length === 0 || !recipeName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const payload = { kind: 'recipe', title: recipeName, block_ids: tray.map((t) => t.blockId) };
      const update = !asNew && recipeId;
      const res = await fetch(update ? `/api/prompts/${recipeId}` : '/api/prompts', { method: update ? 'PATCH' : 'POST', headers, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'No se pudo guardar la receta');
      else {
        setRecipeId(data.prompt?.id ?? recipeId);
        await load();
        flash('recipe');
      }
    } finally {
      setBusy(false);
    }
  };

  const saveBlock = async () => {
    if (!token || !editing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(editing.id ? `/api/prompts/${editing.id}` : '/api/prompts', {
        method: editing.id ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify({ kind: 'block', title: editing.title, body: editing.body, category: editing.category, tags: editing.tags }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'No se pudo guardar');
      else {
        setEditing(null);
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    if (!token) return;
    setBusy(true);
    try {
      await fetch(`/api/prompts/${id}`, { method: 'DELETE', headers });
      setTray((t) => t.filter((x) => x.blockId !== id));
      if (recipeId === id) clearPuzzle();
      setConfirmDelete(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const seed = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const res = await fetch('/api/prompts', { method: 'POST', headers, body: JSON.stringify({ seed: true }) });
      if (!res.ok) setError('No se pudieron crear las piezas de ejemplo');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const newButton = (
    <button onClick={() => setEditing({ kind: 'block', title: '', body: '', category: '', tags: [] })} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full portal-cta text-xs cursor-pointer">
      <Plus className="w-4 h-4" /> Nueva pieza
    </button>
  );

  if (loading) {
    return (
      <Page title="Prompts">
        <Skeleton className="h-12" />
        <div className="grid lg:grid-cols-2 gap-4"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      </Page>
    );
  }

  if (setup) {
    return (
      <Page title="Prompts" subtitle="Una pieza por idea, combínalas como un puzle" width="max-w-3xl">
        <Panel title="Un último paso: crear la tabla">
          <p className="text-sm text-white/65 mb-4">
            Para guardar tus prompts hace falta una tabla en tu base de datos. Copia este código, pégalo en <b>Supabase → SQL Editor → Run</b> y vuelve aquí.
          </p>
          <pre className="whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-relaxed font-mono max-h-72 overflow-y-auto">{PROMPTS_SETUP_SQL}</pre>
          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={() => copy(PROMPTS_SETUP_SQL, 'sql')} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full portal-cta text-sm cursor-pointer">
              {copied === 'sql' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied === 'sql' ? 'Copiado' : 'Copiar SQL'}
            </button>
            <button onClick={load} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 text-sm hover:border-[var(--portal-line-strong)] cursor-pointer">Ya lo he ejecutado</button>
          </div>
        </Panel>
      </Page>
    );
  }

  return (
    <Page title="Prompts" subtitle="Una pieza por idea. Combínalas como un puzle y copia el resultado." actions={newButton} width="max-w-[1400px]">
      {error && <p role="alert" className="text-sm text-red-400 card-liquid rounded-2xl p-3">{error}</p>}

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-4 md:gap-5 items-start">
        {/* Biblioteca */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-center gap-2" role="tablist">
            <button role="tab" aria-selected={tab === 'piezas'} onClick={() => setTab('piezas')} className="pn-chip"><Puzzle className="w-3.5 h-3.5" /> Piezas <span className="tabular-nums opacity-70">{blocks.length}</span></button>
            <button role="tab" aria-selected={tab === 'recetas'} onClick={() => setTab('recetas')} className="pn-chip"><BookMarked className="w-3.5 h-3.5" /> Recetas <span className="tabular-nums opacity-70">{recipes.length}</span></button>
          </div>

          {tab === 'piezas' ? (
            blocks.length === 0 ? (
              <Panel>
                <EmptyState
                  icon={<Puzzle className="w-6 h-6" />}
                  title="Tu biblioteca está vacía"
                  text="Crea tus piezas (un gancho, un estilo, el formato…) o carga unas de ejemplo para empezar a montar prompts."
                  action={
                    <div className="flex flex-wrap gap-2 justify-center">
                      <button onClick={seed} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full portal-cta text-sm cursor-pointer disabled:opacity-50">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Cargar piezas de ejemplo
                      </button>
                      <button onClick={() => setEditing({ kind: 'block', title: '', body: '', category: '', tags: [] })} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 text-sm hover:border-[var(--portal-line-strong)] cursor-pointer"><Plus className="w-4 h-4" /> Crear la mía</button>
                    </div>
                  }
                />
              </Panel>
            ) : (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 text-white/35 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por título, texto, categoría o etiqueta…" aria-label="Buscar piezas" className="w-full pl-10 pr-3 py-2.5 border border-[var(--portal-line-strong)] rounded-full text-sm outline-none placeholder:text-white/30" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-0.5" aria-label="Categorías">
                    <button onClick={() => setCategory('all')} aria-pressed={category === 'all'} className="pn-chip">Todas</button>
                    {categories.map((c) => <button key={c} onClick={() => setCategory(c)} aria-pressed={category === c} className="pn-chip">{c}</button>)}
                  </div>
                  {tags.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5" aria-label="Etiquetas">
                      <span className="pn-title shrink-0 pr-1">Etiquetas</span>
                      {tags.map((t) => (
                        <button
                          key={t}
                          onClick={() => setTagFilter((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}
                          aria-pressed={tagFilter.includes(t)}
                          className="pn-chip"
                          style={{ fontSize: 11, padding: '2px 10px', minHeight: 28 }}
                        >
                          #{t}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setOnlyFav((v) => !v)} aria-pressed={onlyFav} className="pn-chip"><Star className="w-3.5 h-3.5" /> Favoritas</button>
                    <label className="inline-flex items-center gap-2 text-xs text-white/50">
                      Ordenar
                      <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Ordenar piezas" className="rounded-full border px-3 py-1.5 text-xs outline-none">
                        <option value="recent">Más recientes</option>
                        <option value="az">A–Z</option>
                        <option value="fav">Favoritas primero</option>
                      </select>
                    </label>
                    <span className="text-xs text-white/40 tabular-nums ml-auto">{shown.length} de {blocks.length}</span>
                    {activeFilters > 0 && <button onClick={clearFilters} className="text-xs text-[var(--signal)] hover:underline cursor-pointer">Limpiar filtros ({activeFilters})</button>}
                  </div>
                </div>
                {shown.length === 0 ? (
                  <EmptyState icon={<Search className="w-6 h-6" />} title="Nada coincide" text="Prueba con otra palabra u otra categoría." />
                ) : (
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {shown.map((b) => {
                      const inTray = tray.filter((t) => t.blockId === b.id).length;
                      return (
                        <li
                          key={b.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', b.id)}
                          className="card-liquid rounded-3xl p-4 flex flex-col gap-2 pn-in cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {b.category && <span className="pn-title block mb-1">{b.category}</span>}
                              <h3 className="text-sm font-semibold leading-snug">{b.title}</h3>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => toggleFav(b)} aria-pressed={!!b.favorite} aria-label={b.favorite ? `Quitar «${b.title}» de favoritas` : `Marcar «${b.title}» como favorita`} className={cn('w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/[0.06]', b.favorite ? 'text-[var(--signal)]' : 'text-white/35')}>
                              <Star className={cn('w-4 h-4', b.favorite && 'fill-current')} />
                            </button>
                            <button onClick={() => add(b.id)} aria-label={`Añadir «${b.title}» al puzle`} className="shrink-0 w-9 h-9 rounded-xl portal-cta flex items-center justify-center cursor-pointer relative">
                              <Plus className="w-4 h-4" />
                              {inTray > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-black text-[var(--signal)] border border-[var(--signal)] text-[10px] font-bold flex items-center justify-center">{inTray}</span>}
                            </button>
                            </div>
                          </div>
                          <p className="text-xs text-white/55 line-clamp-4 whitespace-pre-wrap">{b.body}</p>
                          {(b.tags || []).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {(b.tags || []).map((t) => <span key={t} className="text-[10px] text-white/45 font-mono">#{t}</span>)}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-auto pt-1">
                            <button onClick={() => copy(b.body, b.id)} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/[0.06] cursor-pointer">
                              {copied === b.id ? <Check className="w-3.5 h-3.5 text-[var(--signal)]" /> : <Copy className="w-3.5 h-3.5" />} {copied === b.id ? 'Copiado' : 'Copiar'}
                            </button>
                            <button onClick={() => setEditing(b)} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/[0.06] cursor-pointer"><Pencil className="w-3.5 h-3.5" /> Editar</button>
                            {confirmDelete === b.id ? (
                              <span className="ml-auto flex items-center gap-1 text-xs">
                                <button onClick={() => del(b.id)} disabled={busy} className="px-2 h-8 rounded-lg bg-red-500/15 text-red-400 cursor-pointer">Eliminar</button>
                                <button onClick={() => setConfirmDelete(null)} className="px-2 h-8 text-white/50 cursor-pointer">No</button>
                              </span>
                            ) : (
                              <button onClick={() => setConfirmDelete(b.id)} aria-label={`Eliminar «${b.title}»`} className="ml-auto w-8 h-8 rounded-lg text-white/35 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )
          ) : recipes.length === 0 ? (
            <Panel><EmptyState icon={<BookMarked className="w-6 h-6" />} title="Aún no hay recetas" text="Monta un puzle con varias piezas, ponle nombre y guárdalo para reutilizarlo con un clic." /></Panel>
          ) : (
            <ul className="space-y-3">
              {recipes.map((r) => {
                const names = r.block_ids.map((id) => byId.get(id)?.title).filter(Boolean) as string[];
                return (
                  <li key={r.id} className="card-liquid rounded-3xl p-4 pn-in">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold">{r.title}</h3>
                        <p className="text-xs text-white/50 mt-1">{names.length} {names.length === 1 ? 'pieza' : 'piezas'}: {names.join(' → ') || 'sin piezas'}</p>
                      </div>
                      <button onClick={() => loadRecipe(r)} className="shrink-0 px-3.5 h-9 rounded-full portal-cta text-xs cursor-pointer">Usar</button>
                    </div>
                    <div className="flex justify-end mt-2">
                      {confirmDelete === r.id ? (
                        <span className="flex items-center gap-1 text-xs">
                          <button onClick={() => del(r.id)} disabled={busy} className="px-2 h-8 rounded-lg bg-red-500/15 text-red-400 cursor-pointer">Eliminar</button>
                          <button onClick={() => setConfirmDelete(null)} className="px-2 h-8 text-white/50 cursor-pointer">No</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDelete(r.id)} aria-label={`Eliminar receta «${r.title}»`} className="w-8 h-8 rounded-lg text-white/35 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Puzle */}
        <div ref={builderRef} className="lg:sticky lg:top-2 min-w-0 scroll-mt-4">
          <section
            className="pn-hero p-4 md:p-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData('text/plain');
              if (id && byId.has(id)) add(id);
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="pn-title flex items-center gap-2"><Puzzle className="w-3.5 h-3.5 text-[var(--signal)]" /> Tu puzle {tray.length > 0 && <span className="tabular-nums text-white/60">· {tray.length}</span>}</h2>
              {tray.length > 0 && <button onClick={clearPuzzle} className="text-xs text-white/45 hover:text-white cursor-pointer">Vaciar</button>}
            </div>

            {tray.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--portal-line-strong)] py-10 px-4 text-center">
                <Puzzle className="w-8 h-8 mx-auto text-[var(--signal)]/60 mb-2" />
                <p className="text-sm text-white/65">Pulsa <b>+</b> en una pieza o arrástrala aquí.</p>
                <p className="text-xs text-white/40 mt-1">Se unirán en orden y verás el prompt completo al momento.</p>
              </div>
            ) : (
              <ol className="space-y-2">
                {tray.map((t, i) => {
                  const b = byId.get(t.blockId);
                  if (!b) return null;
                  return (
                    <li
                      key={t.uid}
                      draggable
                      onDragStart={(e) => { setDragUid(t.uid); e.dataTransfer.setData('text/plain', ''); }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.stopPropagation(); if (dragUid) reorderTo(dragUid, t.uid); setDragUid(null); }}
                      className={cn('flex items-center gap-2 rounded-2xl border bg-white/[0.04] pl-2 pr-1.5 py-2 transition-colors', dragUid === t.uid ? 'border-[var(--signal)] opacity-60' : 'border-[var(--portal-line)]')}
                    >
                      <GripVertical className="w-4 h-4 text-white/30 shrink-0 cursor-grab" aria-hidden="true" />
                      <span className="w-5 text-center text-[11px] font-mono text-[var(--signal)]">{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{b.title}</span>
                        {b.category && <span className="block text-[11px] text-white/40">{b.category}</span>}
                      </span>
                      <button onClick={() => move(t.uid, -1)} disabled={i === 0} aria-label="Subir" className="w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] disabled:opacity-25 flex items-center justify-center cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => move(t.uid, 1)} disabled={i === tray.length - 1} aria-label="Bajar" className="w-8 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] disabled:opacity-25 flex items-center justify-center cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(t.uid)} aria-label="Quitar" className="w-8 h-8 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </li>
                  );
                })}
              </ol>
            )}

            {variables.length > 0 && (
              <div className="mt-5">
                <div className="pn-title mb-2">Rellena los huecos</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {variables.map((v) => (
                    <label key={v} className="block">
                      <span className="text-[11px] text-white/50 font-mono">{`{{${v}}}`}</span>
                      <input value={values[v] || ''} onChange={(e) => setValues((x) => ({ ...x, [v]: e.target.value }))} placeholder={v} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none" />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {tray.length > 0 && (
              <>
                <div className="mt-5">
                  <div className="pn-title mb-2">Prompt final</div>
                  <textarea readOnly value={composed} rows={Math.min(14, Math.max(5, composed.split('\n').length + 1))} aria-label="Prompt final" className="w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-y leading-relaxed" />
                  <div className="text-[11px] text-white/35 mt-1 tabular-nums">{composed.length.toLocaleString('es-ES')} caracteres</div>
                </div>
                <button onClick={() => copy(composed, 'final')} className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full portal-cta text-sm cursor-pointer">
                  {copied === 'final' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied === 'final' ? '¡Copiado!' : 'Copiar prompt'}
                </button>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="pn-title mb-2">Guardar como receta</div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input value={recipeName} onChange={(e) => setRecipeName(e.target.value)} placeholder="Nombre (p. ej. Anuncio UGC 30 s)" aria-label="Nombre de la receta" className="flex-1 rounded-full border px-4 py-2.5 text-sm outline-none" />
                    <div className="flex gap-2">
                      {recipeId && (
                        <button onClick={() => saveRecipe(false)} disabled={busy || !recipeName.trim()} className="px-4 h-10 rounded-full border border-white/15 text-xs hover:border-[var(--portal-line-strong)] disabled:opacity-40 cursor-pointer">
                          {copied === 'recipe' ? 'Guardada' : 'Actualizar'}
                        </button>
                      )}
                      <button onClick={() => saveRecipe(true)} disabled={busy || !recipeName.trim()} className="px-4 h-10 rounded-full portal-cta text-xs disabled:opacity-40 cursor-pointer">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : recipeId ? 'Guardar como nueva' : copied === 'recipe' ? 'Guardada' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* Crear / editar pieza */}
      {editing && (
        <div className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setEditing(null)}>
          <div role="dialog" aria-modal="true" aria-label={editing.id ? 'Editar pieza' : 'Nueva pieza'} className="card-liquid w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 md:p-6 max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing.id ? 'Editar pieza' : 'Nueva pieza'}</h2>
              <button onClick={() => setEditing(null)} aria-label="Cerrar" className="text-white/50 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="pn-title">Título</span>
                <input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} maxLength={120} placeholder="Gancho · pregunta directa" className="mt-1.5 w-full rounded-2xl border px-4 py-3 text-sm outline-none" autoFocus />
              </label>
              <label className="block">
                <span className="pn-title">Categoría</span>
                <input value={editing.category || ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} maxLength={40} list="prompt-cats" placeholder="Gancho, Estilo, Formato…" className="mt-1.5 w-full rounded-2xl border px-4 py-3 text-sm outline-none" />
                <datalist id="prompt-cats">{Array.from(new Set([...CATEGORY_SUGGESTIONS, ...categories])).map((c) => <option key={c} value={c} />)}</datalist>
              </label>
              <label className="block">
                <span className="pn-title">Etiquetas</span>
                <input value={(editing.tags || []).join(', ')} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(',').map((t) => t.trimStart()) })} placeholder="ugc, tiktok, veo, belleza" className="mt-1.5 w-full rounded-2xl border px-4 py-3 text-sm outline-none" />
                <span className="text-[11px] text-white/40">Separadas por comas. Sirven para filtrar: por herramienta, sector, red social…</span>
              </label>
              <label className="block">
                <span className="pn-title">Texto del prompt</span>
                <textarea value={editing.body || ''} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={7} maxLength={8000} placeholder="Escribe la pieza. Usa {{producto}} para dejar huecos que rellenarás al montar el puzle." className="mt-1.5 w-full rounded-2xl border px-4 py-3 text-sm outline-none resize-y leading-relaxed" />
                <span className="text-[11px] text-white/40">Huecos con llaves dobles: {'{{producto}}'}, {'{{tono}}'}… se piden al montar el puzle.</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-4 h-10 rounded-full text-sm text-white/60 hover:text-white cursor-pointer">Cancelar</button>
              <button onClick={saveBlock} disabled={busy || !(editing.title || '').trim() || !(editing.body || '').trim()} className="px-5 h-10 rounded-full portal-cta text-sm disabled:opacity-40 cursor-pointer inline-flex items-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Móvil: acceso rápido al puzle */}
      {tray.length > 0 && (
        <button onClick={() => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="lg:hidden fixed right-4 bottom-24 z-30 inline-flex items-center gap-2 px-4 h-11 rounded-full portal-cta text-sm cursor-pointer shadow-lg">
          <Puzzle className="w-4 h-4" /> Ver puzle · {tray.length}
        </button>
      )}
    </Page>
  );
}
