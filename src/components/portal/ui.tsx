'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Página del panel: cabecera (título + acciones) fija y contenido con scroll, con el mismo ancho y márgenes en todas. */
export function Page({
  title,
  subtitle,
  actions,
  children,
  width = 'max-w-[1280px]',
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      <header className="flex-shrink-0 px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <div className={cn('mx-auto w-full flex items-end justify-between gap-3', width)}>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs md:text-sm text-white/45 mt-0.5 truncate capitalize-first">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className={cn('px-4 md:px-8 pb-8 pt-2 mx-auto space-y-4 md:space-y-5', width)}>{children}</div>
      </div>
    </div>
  );
}

/** Bloque con título y enlace opcional. */
export function Panel({
  title,
  action,
  children,
  className,
  delay = 0,
}: {
  title?: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section className={cn('card-liquid rounded-3xl p-4 md:p-6 pn-in min-w-0', className)} style={{ animationDelay: `${delay}ms` }}>
      {title && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="pn-title">{title}</h2>
          {action && (
            <Link href={action.href} className="inline-flex items-center gap-1 text-xs text-white/45 hover:text-[var(--signal)] transition-colors">
              {action.label} <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/** Número que sube hasta su valor al aparecer (respeta «reducir movimiento»). */
export function CountUp({ value, format }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);
  useEffect(() => {
    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 700);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(origin + (value - origin) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const n = Math.round(shown);
  return <>{format ? format(n) : n.toLocaleString('es-ES')}</>;
}

/** Mini gráfica de línea con área; una sola serie. */
export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const w = 120;
  const h = 36;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * w, h - 3 - (v / max) * (h - 8)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const id = useRef(`sp${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn('w-full h-9', className)} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--signal)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--signal)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="var(--signal)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('pn-skeleton', className)} aria-hidden="true" />;
}

/** Pantalla vacía con icono. */
export function EmptyState({ icon, title, text, action }: { icon: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-14 px-4">
      <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-[var(--signal)]/10 border border-[var(--portal-line-strong)] text-[var(--signal)] shadow-[0_0_28px_-8px_var(--portal-glow)]">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      {text && <p className="text-sm text-white/50 max-w-sm mx-auto">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** «en 2 h 15 min», «en 12 min», «ahora»… para una llamada. */
export function untilLabel(iso: string, now: number = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const mins = Math.round(diff / 60000);
  if (mins <= 0 && mins > -30) return 'Ahora';
  if (mins <= -30) return 'Ya pasó';
  if (mins < 60) return `en ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `en ${h} h${mins % 60 ? ` ${mins % 60} min` : ''}`;
  const d = Math.round(h / 24);
  return `en ${d} ${d === 1 ? 'día' : 'días'}`;
}
