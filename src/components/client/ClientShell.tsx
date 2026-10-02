'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Clapperboard, Home, LifeBuoy, LogOut, Menu, PhoneCall, Receipt, Settings, Sparkles, UserRound, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import KineticWordmark from '@/components/home/KineticWordmark';
import { cn } from '@/lib/utils';
import { useClient, useClientBadges } from './ClientProvider';
import { Wizard } from './video';
import type { ClientPage } from './types';

const NAV: { page: ClientPage; label: string; icon: LucideIcon }[] = [
  { page: 'inicio', label: 'Inicio', icon: Home },
  { page: 'videos', label: 'Mis vídeos', icon: Clapperboard },
  { page: 'avatares', label: 'Avatares', icon: UserRound },
  { page: 'avisos', label: 'Avisos', icon: BellRing },
  { page: 'compras', label: 'Compras', icon: Receipt },
  { page: 'llamadas', label: 'Llamadas', icon: PhoneCall },
  { page: 'ayuda', label: 'Ayuda', icon: LifeBuoy },
  { page: 'ajustes', label: 'Ajustes', icon: Settings },
];

const BOTTOM: ClientPage[] = ['inicio', 'videos', 'avatares', 'avisos'];

function Badge({ n }: { n?: number }) {
  if (!n) return null;
  return <span className="min-w-[20px] h-5 px-1.5 rounded-md bg-[var(--signal)] text-black text-[11px] font-bold font-mono flex items-center justify-center">{n > 99 ? '99+' : n}</span>;
}

/** Estructura del panel del cliente: menú lateral (escritorio) o barra inferior (móvil), saldo siempre a mano. */
export function ClientShell({ active, hrefFor, banner, children }: { active: ClientPage; hrefFor: (p: ClientPage) => string; banner?: React.ReactNode; children: React.ReactNode }) {
  const c = useClient();
  const badges = useClientBadges();
  const { signOut } = useAuth();
  const [brand, setBrand] = useState('samgple');
  const [more, setMore] = useState(false);

  useEffect(() => {
    fetch('/api/public/branding')
      .then((r) => r.json())
      .then((d) => d.business_name && setBrand(d.business_name))
      .catch(() => {});
  }, []);
  useEffect(() => setMore(false), [active]);

  const logout = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  const link = (p: ClientPage, onClick?: () => void) => {
    const item = NAV.find((n) => n.page === p)!;
    const Icon = item.icon;
    const on = active === p;
    return (
      <Link
        key={p}
        href={hrefFor(p)}
        onClick={onClick}
        aria-current={on ? 'page' : undefined}
        className={cn('group flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors', on ? 'bg-[var(--signal)]/10 text-white shadow-[inset_0_0_0_1px_var(--portal-line-strong)]' : 'text-white/60 hover:text-white hover:bg-white/[0.05]')}
      >
        <span className={cn('flex items-center justify-center w-8 h-8 rounded-lg shrink-0', on ? 'bg-[var(--signal)] text-black' : 'bg-white/[0.05] text-white/60 group-hover:text-white')}><Icon className="w-[17px] h-[17px]" /></span>
        <span className="flex-1 truncate">{item.label}</span>
        <Badge n={badges[p]} />
      </Link>
    );
  };

  const balance = c.studio.balance;

  const sidebar = (
    <div className="flex flex-col justify-between gap-6 h-full">
      <div className="flex flex-col gap-6">
        <Link href={hrefFor('inicio')} className="px-1.5"><KineticWordmark name={brand} className="text-xl" /></Link>
        <nav aria-label="Menú del cliente" className="flex flex-col gap-1">{NAV.map((n) => link(n.page))}</nav>
      </div>
      <div className="space-y-3">
        <div className="rounded-2xl border border-[var(--portal-line)] bg-white/[0.03] p-3.5">
          <div className="pn-title">Tu saldo</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">{balance} <span className="text-sm text-white/50 font-normal">{balance === 1 ? 'vídeo' : 'vídeos'}</span></div>
          {balance > 0 ? (
            <button onClick={() => c.openWizard()} className="mt-3 w-full inline-flex items-center justify-center gap-2 h-10 rounded-full portal-cta text-sm cursor-pointer"><Sparkles className="w-4 h-4" /> Pedir un vídeo</button>
          ) : (
            <Link href="/#precios" className="mt-3 w-full inline-flex items-center justify-center h-10 rounded-full border border-[var(--portal-line-strong)] text-sm hover:border-[var(--signal)]">Conseguir más vídeos</Link>
          )}
        </div>
        <div className="flex items-center gap-2.5 px-1">
          <span className="w-8 h-8 rounded-full bg-[var(--signal)]/15 text-[var(--signal)] flex items-center justify-center text-xs font-bold uppercase shrink-0">{(c.name || c.email || '?').charAt(0)}</span>
          <div className="min-w-0 flex-1"><div className="text-xs text-white/85 truncate">{c.name || c.email}</div><div className="text-[11px] text-white/45 truncate">{c.email}</div></div>
          {!c.preview && <button onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión" className="text-white/45 hover:text-white cursor-pointer"><LogOut className="w-4 h-4" /></button>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="portal-ui h-[100dvh] flex flex-col">
      {banner}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
      {/* Escritorio */}
      <aside className="hidden md:block w-64 shrink-0 m-3 mr-0 rounded-3xl border border-[var(--portal-line)] bg-black/95 p-3.5 overflow-y-auto shadow-[0_18px_50px_-30px_rgba(22,33,14,0.35)]">{sidebar}</aside>

      {/* Móvil: cabecera */}
      <header className="md:hidden flex-shrink-0 h-14 px-4 flex items-center justify-between border-b border-white/10 bg-black/95">
        <Link href={hrefFor('inicio')}><KineticWordmark name={brand} className="text-lg" /></Link>
        <Link href={hrefFor('videos')} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--portal-line-strong)] px-3 h-9 text-sm font-semibold"><Clapperboard className="w-4 h-4 text-[var(--signal)]" /> {balance}</Link>
      </header>

      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden relative">
        {children}
        <AnimatePresence>
          {c.toast && (
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className="absolute left-1/2 -translate-x-1/2 bottom-4 z-40 max-w-[92%] rounded-full border border-[var(--portal-line-strong)] bg-black px-5 py-3 text-sm shadow-xl text-center">
              {c.toast}
            </motion.p>
          )}
        </AnimatePresence>
      </main>

      {/* Móvil: barra inferior */}
      <nav aria-label="Navegación rápida" className="md:hidden flex-shrink-0 px-3 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}>
        <div className="grid grid-cols-5 rounded-2xl border border-[var(--portal-line-strong)] bg-black/95 shadow-[0_10px_30px_-14px_rgba(22,33,14,0.4)] p-1">
          {BOTTOM.map((p) => {
            const item = NAV.find((n) => n.page === p)!;
            const Icon = item.icon;
            const on = active === p;
            return (
              <Link key={p} href={hrefFor(p)} aria-current={on ? 'page' : undefined} className={cn('relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-semibold', on ? 'bg-[var(--signal)]/12 text-[var(--signal)]' : 'text-white/60')}>
                <span className="relative">
                  <Icon className="w-5 h-5" />
                  {badges[p] ? <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-md bg-[var(--signal)] text-black text-[10px] font-bold font-mono flex items-center justify-center">{badges[p]}</span> : null}
                </span>
                {item.label.replace('Mis ', '')}
              </Link>
            );
          })}
          <button onClick={() => setMore(true)} className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-semibold text-white/60 cursor-pointer" aria-label="Más opciones"><Menu className="w-5 h-5" />Más</button>
        </div>
      </nav>

      <AnimatePresence>
        {more && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 md:hidden bg-black/60" onClick={() => setMore(false)}>
            <motion.aside initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', duration: 0.24 }} role="dialog" aria-modal="true" aria-label="Menú" className="absolute inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t border-[var(--portal-line-strong)] bg-black px-4 pt-3 pb-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto h-1 w-10 rounded-full bg-white/20 mb-3" aria-hidden="true" />
              <div className="flex items-center justify-between mb-3"><span className="font-semibold">Menú</span><button onClick={() => setMore(false)} aria-label="Cerrar" className="text-white/60 cursor-pointer"><X className="w-5 h-5" /></button></div>
              <nav className="flex flex-col gap-1">{NAV.filter((n) => !BOTTOM.includes(n.page)).map((n) => link(n.page, () => setMore(false)))}</nav>
              {!c.preview && <button onClick={logout} className="mt-4 w-full inline-flex items-center justify-center gap-2 h-11 rounded-full border border-white/15 text-sm cursor-pointer"><LogOut className="w-4 h-4" /> Cerrar sesión</button>}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {c.wizard.open && <Wizard />}
      </div>
    </div>
  );
}
