'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clapperboard, CornerDownLeft, Inbox, LayoutDashboard, LineChart, PhoneCall, Eye, Puzzle, Search, Settings, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react';
import { useLeadsContext } from '@/app/portal/leads/context';
import type { Lead } from '@/app/portal/leads/context';
import { statusMeta, timeAgo } from '@/components/portal/leadMeta';
import { cn } from '@/lib/utils';

export const OPEN_SEARCH_EVENT = 'portal-open-search';

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  href: string;
  group: 'Ir a' | 'Clientes y solicitudes';
}

const PAGES: Item[] = [
  { id: 'p-home', label: 'Resumen', icon: LayoutDashboard, href: '/portal', group: 'Ir a' },
  { id: 'p-calls', label: 'Llamadas', icon: PhoneCall, href: '/portal/calls', group: 'Ir a' },
  { id: 'p-leads', label: 'Solicitudes', icon: Inbox, href: '/portal/leads', group: 'Ir a' },
  { id: 'p-videos', label: 'Vídeos', icon: Clapperboard, href: '/portal/videos', group: 'Ir a' },
  { id: 'p-fin', label: 'Finanzas', icon: LineChart, href: '/portal/finance', group: 'Ir a' },
  { id: 'p-prompts', label: 'Prompts', icon: Puzzle, href: '/portal/prompts', group: 'Ir a' },
  { id: 'p-sec', label: 'Seguridad', icon: ShieldCheck, href: '/portal/security', group: 'Ir a' },
  { id: 'p-preview', label: 'Ver como cliente', icon: Eye, href: '/vista-cliente', group: 'Ir a' },
  { id: 'p-set', label: 'Ajustes', icon: Settings, href: '/portal/settings', group: 'Ir a' },
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function leadItem(l: Lead): Item {
  const meta = statusMeta(l.status, l.kind);
  return {
    id: l.id,
    label: l.name,
    hint: [l.company, l.phone || l.email, meta.label, timeAgo(l.created_at)].filter(Boolean).join(' · '),
    icon: l.kind === 'call' ? PhoneCall : UserRound,
    href: `/portal/${l.kind === 'call' ? 'calls' : 'leads'}?open=${l.id}`,
    group: 'Clientes y solicitudes',
  };
}

/** Buscador global (⌘K / Ctrl+K): salta a una sección o abre la ficha de cualquier cliente o solicitud. */
export default function CommandPalette() {
  const router = useRouter();
  const { leads } = useLeadsContext();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo(() => {
    const q = norm(query.trim());
    const pages = PAGES.filter((p) => !q || norm(p.label).includes(q));
    const found = (q
      ? leads.filter((l) => [l.name, l.email, l.phone, l.company, l.message].some((v) => v && norm(v).includes(q)))
      : leads
    )
      .slice(0, q ? 8 : 4)
      .map(leadItem);
    return [...found, ...pages];
  }, [query, leads]);

  useEffect(() => setCursor(0), [query]);

  const go = (item: Item | undefined) => {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  };

  if (!open) return null;

  const groups = (['Clientes y solicitudes', 'Ir a'] as const).map((g) => ({ g, rows: items.filter((i) => i.group === g) })).filter((x) => x.rows.length);

  return (
    <div className="fixed inset-0 z-[120] bg-black/70 flex items-start justify-center p-3 pt-[12vh]" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar"
        className="card-liquid w-full max-w-xl rounded-3xl overflow-hidden pn-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(items.length - 1, c + 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
          if (e.key === 'Enter') { e.preventDefault(); go(items[cursor]); }
        }}
      >
        <div className="flex items-center gap-3 px-4 border-b border-white/10">
          <Search className="w-4 h-4 text-white/40 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca un cliente, teléfono, email o sección…"
            aria-label="Buscar"
            className="flex-1 bg-transparent! border-0! py-4 text-base outline-none placeholder:text-white/30"
            style={{ boxShadow: 'none' }}
          />
          <kbd className="hidden sm:block text-[10px] text-white/40 border border-white/15 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="text-center text-sm text-white/40 py-10">Nada coincide con «{query}».</p>
          ) : (
            groups.map(({ g, rows }) => (
              <div key={g} className="mb-1">
                <div className="pn-title px-3 py-2">{g}</div>
                {rows.map((it) => {
                  const idx = items.indexOf(it);
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.id}
                      onMouseEnter={() => setCursor(idx)}
                      onClick={() => go(it)}
                      className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left cursor-pointer transition-colors', cursor === idx ? 'bg-[var(--signal)]/10 shadow-[inset_0_0_0_1px_var(--portal-line-strong)]' : 'hover:bg-white/[0.04]')}
                    >
                      <span className="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0 text-white/70">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{it.label}</span>
                        {it.hint && <span className="block text-xs text-white/40 truncate">{it.hint}</span>}
                      </span>
                      {cursor === idx && <CornerDownLeft className="w-3.5 h-3.5 text-white/40 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
