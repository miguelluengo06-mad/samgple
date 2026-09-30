'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Boxes,
  ExternalLink,
  FileStack,
  Inbox,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PhoneCall,
  Server,
  Settings as SettingsIcon,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import KineticWordmark from '@/components/home/KineticWordmark';
import { useAuth } from '@/components/AuthContext';
import { useLeadsContext, newRequests, upcomingCalls } from '@/app/portal/leads/context';
import type { PortalRole } from '@/components/portal/usePortalRole';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Exact match only (the dashboard lives at /portal, a prefix of everything else) */
  exact?: boolean;
  badge?: 'calls' | 'leads';
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const AGENCY_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Resumen', href: '/portal', icon: LayoutDashboard, exact: true },
      { label: 'Llamadas', href: '/portal/calls', icon: PhoneCall, badge: 'calls' },
      { label: 'Solicitudes', href: '/portal/leads', icon: Inbox, badge: 'leads' },
    ],
  },
  {
    label: 'Negocio',
    items: [
      { label: 'Productos', href: '/portal/services', icon: Package },
      { label: 'Clientes', href: '/portal/clients', icon: Users },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { label: 'Instancias', href: '/portal/manage', icon: Boxes },
      { label: 'Hosting', href: '/portal/hosting', icon: Server },
      { label: 'Templates', href: '/portal/templates', icon: FileStack },
      { label: 'Embeds', href: '/portal/ui-studio', icon: Layers },
    ],
  },
];

const CLIENT_GROUPS: NavGroup[] = [
  { items: [{ label: 'Mis instancias', href: '/portal/manage', icon: Boxes }] },
];

// Registered visitors (not the agency, not an invited client) only get their own account area.
const ACCOUNT_GROUPS: NavGroup[] = [
  { items: [{ label: 'Mi cuenta', href: '/portal', icon: UserRound, exact: true }] },
];

export function groupsForRole(role: PortalRole): NavGroup[] {
  if (role === 'agency') return AGENCY_GROUPS;
  if (role === 'client') return CLIENT_GROUPS;
  return ACCOUNT_GROUPS;
}

function NavList({ role, onNavigate }: { role: PortalRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { leads } = useLeadsContext();

  const badges = useMemo(
    () => ({ leads: newRequests(leads).length, calls: upcomingCalls(leads).length }),
    [leads]
  );

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname?.startsWith(item.href) ?? false);

  return (
    <nav className="flex flex-col gap-6" aria-label="Navegación del panel">
      {groupsForRole(role).map((group, gi) => (
        <div key={group.label ?? gi} className="flex flex-col gap-0.5">
          {group.label && (
            <span className="px-3 mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/30">{group.label}</span>
          )}
          {group.items.map((item) => {
            const active = isActive(item);
            const count = item.badge ? badges[item.badge] : 0;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-white/[0.07] text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.04]'
                )}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-[var(--signal)]" />}
                <Icon className={cn('w-[18px] h-[18px] shrink-0', active ? 'text-[var(--signal)]' : 'text-white/40 group-hover:text-white/70')} />
                <span className="flex-1 truncate">{item.label}</span>
                {count > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--signal)] text-black text-[11px] font-bold flex items-center justify-center">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ role, onNavigate }: { role: PortalRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const settingsActive = pathname?.startsWith('/portal/settings');

  const logout = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="flex flex-col gap-0.5 border-t border-white/10 pt-4">
      <Link
        href="/portal/settings"
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          settingsActive ? 'bg-white/[0.07] text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.04]'
        )}
      >
        <SettingsIcon className="w-[18px] h-[18px] text-white/40" />
        Ajustes
      </Link>
      <Link
        href="/"
        target="_blank"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/55 hover:text-white hover:bg-white/[0.04] transition-colors"
      >
        <ExternalLink className="w-[18px] h-[18px] text-white/40" />
        Ver web pública
      </Link>
      <div className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2">
        <span className="w-8 h-8 rounded-full bg-[var(--signal)]/15 text-[var(--signal)] flex items-center justify-center text-xs font-bold uppercase shrink-0">
          {(user?.email || '?').charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-white/80 truncate">{user?.email}</div>
          <div className="text-[11px] text-white/35">
            {role === 'agency' ? 'Administrador' : role === 'client' ? 'Cliente' : 'Cuenta'}
          </div>
        </div>
        <button
          onClick={logout}
          className="text-white/40 hover:text-white transition-colors cursor-pointer"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** Desktop: fixed left sidebar. Mobile: slim top bar with a drawer. */
export default function PortalSidebar({ role }: { role: PortalRole }) {
  const [open, setOpen] = useState(false);
  const [businessName, setBusinessName] = useState('samgple');
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/public/branding')
      .then((r) => r.json())
      .then((data) => { if (data.business_name) setBusinessName(data.business_name); })
      .catch(() => {});
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const brand = (
    <Link href="/portal" className="flex items-center gap-2.5">
      <KineticWordmark name={businessName} className="text-lg" />
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/30 border border-white/10 rounded px-1.5 py-0.5">Panel</span>
    </Link>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col justify-between gap-6 border-r border-white/10 bg-white/[0.015] px-3 py-5 overflow-y-auto">
        <div className="flex flex-col gap-8">
          <div className="px-3">{brand}</div>
          <NavList role={role} />
        </div>
        <SidebarFooter role={role} />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex-shrink-0 h-14 px-4 flex items-center justify-between border-b border-white/10 bg-black/80" style={{ backdropFilter: 'blur(20px)' }}>
        {brand}
        <button onClick={() => setOpen(true)} className="text-white/70 hover:text-white transition-colors cursor-pointer" aria-label="Abrir menú">
          <Menu className="w-5 h-5" />
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden bg-black/60"
            onClick={() => setOpen(false)}
          >
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.22 }}
              role="dialog"
              aria-modal="true"
              aria-label="Menú"
              className="h-full w-72 max-w-[85vw] flex flex-col justify-between gap-6 bg-black border-r border-white/10 px-3 py-5 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-8">
                <div className="px-3 flex items-center justify-between">
                  {brand}
                  <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white cursor-pointer" aria-label="Cerrar menú">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <NavList role={role} onNavigate={() => setOpen(false)} />
              </div>
              <SidebarFooter role={role} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
