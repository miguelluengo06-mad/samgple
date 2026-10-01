'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Boxes,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  FileStack,
  Inbox,
  Layers,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Package,
  PhoneCall,
  Server,
  Settings as SettingsIcon,
  UserRound,
  Users,
  Wrench,
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
  /** Plegable: arranca cerrado salvo que la página actual esté dentro */
  collapsible?: boolean;
  icon?: LucideIcon;
  items: NavItem[];
}

const AGENCY_GROUPS: NavGroup[] = [
  {
    label: 'Hoy',
    items: [
      { label: 'Resumen', href: '/portal', icon: LayoutDashboard, exact: true },
      { label: 'Llamadas', href: '/portal/calls', icon: PhoneCall, badge: 'calls' },
      { label: 'Solicitudes', href: '/portal/leads', icon: Inbox, badge: 'leads' },
    ],
  },
  {
    label: 'Negocio',
    items: [
      { label: 'Clientes', href: '/portal/clients', icon: Users },
      { label: 'Productos', href: '/portal/services', icon: Package },
      { label: 'Finanzas', href: '/portal/finance', icon: LineChart },
    ],
  },
  {
    label: 'Herramientas',
    collapsible: true,
    icon: Wrench,
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

const OPEN_MENU_EVENT = 'portal-open-menu';
const COLLAPSE_KEY = 'portal-nav-collapsed';

function useBadges() {
  const { leads } = useLeadsContext();
  return useMemo(() => ({ leads: newRequests(leads).length, calls: upcomingCalls(leads).length }), [leads]);
}

function Badge({ n, dot }: { n: number; dot?: boolean }) {
  if (n <= 0) return null;
  if (dot) return <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--signal)] shadow-[0_0_8px_var(--signal)]" />;
  return (
    <span className="min-w-[20px] h-5 px-1.5 rounded-md bg-[var(--signal)] text-black text-[11px] font-bold font-mono flex items-center justify-center shadow-[0_0_14px_-2px_var(--signal)]">
      {n > 99 ? '99+' : n}
    </span>
  );
}

function NavLink({ item, active, collapsed, count, onNavigate }: { item: NavItem; active: boolean; collapsed?: boolean; count: number; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center rounded-xl text-sm font-medium transition-all',
        collapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 px-2.5 py-2',
        active
          ? 'bg-[var(--signal)]/10 text-white shadow-[inset_0_0_0_1px_var(--portal-line-strong),0_0_22px_-8px_var(--portal-glow)]'
          : 'text-white/55 hover:text-white hover:bg-white/[0.05]'
      )}
    >
      <span
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors',
          active ? 'bg-[var(--signal)] text-black shadow-[0_0_16px_-2px_var(--signal)]' : 'bg-white/[0.05] text-white/60 group-hover:text-white'
        )}
      >
        <Icon className="w-[17px] h-[17px]" />
      </span>
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && <Badge n={count} />}
      {collapsed && <Badge n={count} dot />}
    </Link>
  );
}

function NavList({ role, collapsed, onNavigate }: { role: PortalRole; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const badges = useBadges();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname?.startsWith(item.href) ?? false);

  return (
    <nav className="flex flex-col gap-5" aria-label="Navegación del panel">
      {groupsForRole(role).map((group, gi) => {
        const hasActive = group.items.some(isActive);
        const open = !group.collapsible || collapsed || hasActive || !!openGroups[group.label ?? ''];
        return (
          <div key={group.label ?? gi} className="flex flex-col gap-1">
            {group.label && !collapsed && (
              group.collapsible ? (
                <button
                  onClick={() => setOpenGroups((o) => ({ ...o, [group.label!]: !open }))}
                  aria-expanded={open}
                  className="flex items-center justify-between px-2.5 mb-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35 hover:text-white/70 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">{group.icon && <group.icon className="w-3 h-3" />}{group.label}</span>
                  <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
                </button>
              ) : (
                <span className="px-2.5 mb-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">{group.label}</span>
              )
            )}
            {collapsed && gi > 0 && <span className="h-px bg-white/10 mx-2 mb-1" aria-hidden="true" />}
            {open &&
              group.items.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item)} collapsed={collapsed} count={item.badge ? badges[item.badge] : 0} onNavigate={onNavigate} />
              ))}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ role, collapsed, onNavigate }: { role: PortalRole; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const settingsActive = pathname?.startsWith('/portal/settings') ?? false;

  const logout = async () => {
    await signOut();
    window.location.href = '/auth';
  };

  return (
    <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
      <NavLink item={{ label: 'Ajustes', href: '/portal/settings', icon: SettingsIcon }} active={settingsActive} collapsed={collapsed} count={0} onNavigate={onNavigate} />
      <Link
        href="/"
        target="_blank"
        title={collapsed ? 'Ver web pública' : undefined}
        className={cn('flex items-center rounded-xl text-sm font-medium text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors', collapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 px-2.5 py-2')}
      >
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.05] shrink-0"><ExternalLink className="w-[17px] h-[17px]" /></span>
        {!collapsed && 'Ver web pública'}
      </Link>
      <div className={cn('mt-2 flex items-center rounded-xl border border-white/10 bg-white/[0.03]', collapsed ? 'flex-col gap-2 p-2' : 'gap-2.5 p-2.5')}>
        <span className="w-8 h-8 rounded-lg bg-[var(--signal)]/15 text-[var(--signal)] flex items-center justify-center text-xs font-bold uppercase shrink-0 border border-[var(--portal-line)]">
          {(user?.email || '?').charAt(0)}
        </span>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="text-xs text-white/85 truncate">{user?.email}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/35">{role === 'agency' ? 'Administrador' : role === 'client' ? 'Cliente' : 'Cuenta'}</div>
          </div>
        )}
        <button onClick={logout} className="text-white/40 hover:text-white transition-colors cursor-pointer" aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/** Desktop: barra lateral flotante y plegable. Móvil: cabecera fina; el menú completo se abre desde «Más» (barra inferior). */
export default function PortalSidebar({ role }: { role: PortalRole }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [businessName, setBusinessName] = useState('samgple');
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/public/branding')
      .then((r) => r.json())
      .then((data) => { if (data.business_name) setBusinessName(data.business_name); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch { /* sin almacenamiento: se queda desplegada */ }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* ignore */ }
      return !c;
    });
  };

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_MENU_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_MENU_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const brand = (compact?: boolean) => (
    <Link href="/portal" className="flex items-center gap-2.5 min-w-0" title={compact ? businessName : undefined}>
      {compact ? (
        <span className="w-9 h-9 rounded-xl bg-[var(--signal)] text-black flex items-center justify-center font-kinetic font-bold text-lg shadow-[0_0_18px_-2px_var(--signal)]">
          {businessName.charAt(0).toLowerCase()}
        </span>
      ) : (
        <>
          <KineticWordmark name={businessName} className="text-lg" />
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--signal)] border border-[var(--portal-line-strong)] rounded-md px-1.5 py-0.5">Panel</span>
        </>
      )}
    </Link>
  );

  return (
    <>
      {/* Desktop: panel flotante */}
      <aside
        className={cn(
          'hidden md:flex shrink-0 flex-col justify-between gap-6 m-3 mr-0 rounded-2xl border border-[var(--portal-line)] bg-black/35 backdrop-blur-2xl px-2.5 py-4 overflow-y-auto overflow-x-hidden shadow-[0_20px_60px_-30px_var(--portal-glow)] transition-[width] duration-200',
          collapsed ? 'w-[68px]' : 'w-60'
        )}
      >
        <div className="flex flex-col gap-7">
          <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between px-1.5')}>
            {brand(collapsed)}
            {!collapsed && (
              <button onClick={toggleCollapsed} className="text-white/35 hover:text-white cursor-pointer" aria-label="Plegar menú" title="Plegar menú">
                <ChevronsLeft className="w-4 h-4" />
              </button>
            )}
          </div>
          {collapsed && (
            <button onClick={toggleCollapsed} className="mx-auto -mt-3 text-white/35 hover:text-white cursor-pointer" aria-label="Desplegar menú" title="Desplegar menú">
              <ChevronsRight className="w-4 h-4" />
            </button>
          )}
          <NavList role={role} collapsed={collapsed} />
        </div>
        <SidebarFooter role={role} collapsed={collapsed} />
      </aside>

      {/* Móvil: cabecera fina */}
      <header className="md:hidden flex-shrink-0 h-14 px-4 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-xl">
        {brand()}
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:text-white flex items-center justify-center cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu className="w-[18px] h-[18px]" />
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
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.24 }}
              role="dialog"
              aria-modal="true"
              aria-label="Menú"
              className="absolute inset-x-0 bottom-0 max-h-[88dvh] flex flex-col gap-5 rounded-t-3xl border-t border-[var(--portal-line-strong)] bg-[#070b0f] px-4 pt-3 pb-6 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
              <div className="flex items-center justify-between">
                {brand()}
                <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white cursor-pointer" aria-label="Cerrar menú">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <NavList role={role} onNavigate={() => setOpen(false)} />
              <SidebarFooter role={role} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Móvil: barra inferior flotante con lo más usado y «Más» para abrir el menú completo. */
export function PortalBottomNav({ role }: { role: PortalRole }) {
  const pathname = usePathname();
  const badges = useBadges();
  if (role !== 'agency') return null;

  const items: { label: string; href: string; icon: LucideIcon; exact?: boolean; badge?: 'calls' | 'leads' }[] = [
    { label: 'Resumen', href: '/portal', icon: LayoutDashboard, exact: true },
    { label: 'Llamadas', href: '/portal/calls', icon: PhoneCall, badge: 'calls' },
    { label: 'Solicitudes', href: '/portal/leads', icon: Inbox, badge: 'leads' },
    { label: 'Clientes', href: '/portal/clients', icon: Users },
  ];

  return (
    <nav
      aria-label="Navegación rápida"
      className="md:hidden flex-shrink-0 px-3 pt-2"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 10px)' }}
    >
      <div className="grid grid-cols-5 rounded-2xl border border-[var(--portal-line-strong)] bg-black/55 backdrop-blur-2xl shadow-[0_10px_40px_-12px_var(--portal-glow)] p-1">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href) ?? false;
          const n = item.badge ? badges[item.badge] : 0;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-semibold transition-colors',
                active ? 'bg-[var(--signal)]/12 text-[var(--signal)]' : 'text-white/55'
              )}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {n > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-md bg-[var(--signal)] text-black text-[10px] font-bold font-mono flex items-center justify-center">
                    {n > 99 ? '99+' : n}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => window.dispatchEvent(new Event(OPEN_MENU_EVENT))}
          className="flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[10px] font-semibold text-white/55 cursor-pointer"
          aria-label="Abrir menú completo"
        >
          <Menu className="w-5 h-5" />
          Más
        </button>
      </div>
    </nav>
  );
}
