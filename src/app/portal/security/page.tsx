'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, Check, Copy, Laptop, Loader2, ShieldAlert, ShieldCheck, Trash2, Unlock } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { EmptyState, Page, Panel, Skeleton } from '@/components/portal/ui';
import { timeAgo } from '@/components/portal/leadMeta';
import { KIND_LABEL, SECURITY_SETUP_SQL, type SecurityKind } from '@/lib/security';
import { cn } from '@/lib/utils';

interface Blocked { ip: string; reason: string; blocked_at: string; expires_at: string | null; manual: boolean }
interface Trusted { ip: string; label: string; added_at: string; last_seen: string; auto: boolean }
interface EventRow { id: string; ip: string; kind: SecurityKind; path: string | null; user_agent: string | null; detail: string | null; created_at: string }

const until = (b: Blocked) =>
  !b.expires_at ? 'Para siempre' : `hasta el ${new Date(b.expires_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;

export default function SecurityPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState(false);
  const [myIp, setMyIp] = useState('');
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [trusted, setTrusted] = useState<Trusted[]>([]);
  const [trustLabel, setTrustLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newIp, setNewIp] = useState('');
  const [days, setDays] = useState('30');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/security', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMyIp(data.myIp || '');
      if (data.setup) setSetup(true);
      else if (!res.ok) setError(data.error || 'No se pudo cargar');
      else {
        setSetup(false);
        setBlocked(data.blocked || []);
        setEvents(data.events || []);
        setTrusted(data.trusted || []);
        setError(null);
      }
    } catch {
      setError('No se pudo cargar');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const call = async (method: 'POST' | 'DELETE', ip: string, d?: number | null) => {
    if (!token) return;
    setBusy(ip);
    setError(null);
    try {
      const res = await fetch(method === 'DELETE' ? `/api/security?ip=${encodeURIComponent(ip)}` : '/api/security', {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: method === 'POST' ? JSON.stringify({ ip, days: d ?? undefined }) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'No se pudo completar la acción');
      else {
        if (method === 'POST') setNewIp('');
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  const trust = async (ip?: string) => {
    if (!token) return;
    setBusy('trust');
    setError(null);
    try {
      const res = await fetch('/api/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ trust: true, ip, label: trustLabel.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'No se pudo registrar la IP');
      else {
        setTrustLabel('');
        await load();
      }
    } finally {
      setBusy(null);
    }
  };

  const untrust = async (ip: string) => {
    if (!token) return;
    setBusy(ip);
    try {
      await fetch(`/api/security?ip=${encodeURIComponent(ip)}&trusted=1`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const stats = useMemo(() => {
    const day = Date.now() - 24 * 3600_000;
    const recent = events.filter((e) => new Date(e.created_at).getTime() >= day);
    return {
      blocked: blocked.length,
      last24: recent.length,
      logins: recent.filter((e) => e.kind === 'login_failed').length,
      attacks: recent.filter((e) => e.kind === 'attack_path' || e.kind === 'attack_payload' || e.kind === 'forbidden').length,
    };
  }, [events, blocked]);

  // Eventos agrupados por IP: cuántos, de qué tipos y cuándo fue el último
  const byIp = useMemo(() => {
    const map = new Map<string, { ip: string; n: number; kinds: Set<SecurityKind>; last: string; paths: Set<string> }>();
    for (const e of events) {
      const g = map.get(e.ip) || { ip: e.ip, n: 0, kinds: new Set<SecurityKind>(), last: e.created_at, paths: new Set<string>() };
      g.n += 1;
      g.kinds.add(e.kind);
      if (e.path) g.paths.add(e.path);
      if (e.created_at > g.last) g.last = e.created_at;
      map.set(e.ip, g);
    }
    const blockedSet = new Set(blocked.map((b) => b.ip));
    return [...map.values()].filter((g) => !blockedSet.has(g.ip)).sort((a, b) => b.last.localeCompare(a.last)).slice(0, 15);
  }, [events, blocked]);

  if (loading) {
    return (
      <Page title="Seguridad" width="max-w-5xl">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-56" />
      </Page>
    );
  }

  if (setup) {
    return (
      <Page title="Seguridad" subtitle="Registro de intentos raros y bloqueo de IPs" width="max-w-3xl">
        <Panel title="Un último paso: crear las tablas de seguridad">
          <p className="text-sm text-white/65 mb-4">
            Copia este código, pégalo en <b>Supabase → SQL Editor → Run</b> y vuelve aquí. Además de crear el registro y la lista de bloqueos, cierra permisos de la base de datos que ya no se usan.
          </p>
          <pre className="whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-relaxed font-mono max-h-72 overflow-y-auto">{SECURITY_SETUP_SQL}</pre>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={async () => { try { await navigator.clipboard.writeText(SECURITY_SETUP_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ } }}
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
    <Page title="Seguridad" subtitle={myIp ? `Tu IP ahora: ${myIp}` : 'Registro de intentos raros y bloqueo de IPs'} width="max-w-5xl">
      {error && <p role="alert" className="text-sm text-red-400 card-liquid rounded-2xl p-3">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'IPs bloqueadas', value: stats.blocked, tone: stats.blocked > 0 ? 'text-red-400' : '' },
          { label: 'Eventos · 24 h', value: stats.last24, tone: '' },
          { label: 'Claves falladas · 24 h', value: stats.logins, tone: stats.logins > 0 ? 'text-yellow-400' : '' },
          { label: 'Ataques · 24 h', value: stats.attacks, tone: stats.attacks > 0 ? 'text-red-400' : '' },
        ].map((k, i) => (
          <div key={k.label} className="card-liquid rounded-3xl p-4 pn-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="pn-title mb-1.5">{k.label}</div>
            <div className={cn('text-3xl font-semibold tabular-nums', k.tone)}>{k.value}</div>
          </div>
        ))}
      </div>

      <Panel title="Tus IPs de confianza" delay={60}>
        <p className="text-xs text-white/50 mb-3">
          Estas IPs nunca se bloquean. Se añaden solas cuando entras al panel, y si entras desde una nueva te llega un aviso por Telegram. Quita las que ya no uses (por ejemplo, redes de cafeterías).
        </p>
        {trusted.length === 0 ? (
          <EmptyState icon={<Laptop className="w-6 h-6" />} title="Aún no hay IPs registradas" text="Se registrará la tuya la próxima vez que inicies sesión, o puedes añadirla ahora." />
        ) : (
          <ul className="divide-y divide-white/10 -my-2">
            {trusted.map((t) => (
              <li key={t.ip} className="flex items-center gap-3 py-3">
                <span className="w-9 h-9 rounded-xl bg-[var(--signal)]/10 text-[var(--signal)] border border-[var(--portal-line-strong)] flex items-center justify-center shrink-0"><Laptop className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-mono font-medium">{t.ip}{t.ip === myIp && <span className="ml-2 text-[10px] font-sans font-semibold text-[var(--signal)] border border-[var(--portal-line-strong)] rounded-full px-2 py-0.5">Tu IP ahora</span>}</div>
                  <div className="text-xs text-white/50 truncate">{t.label || (t.auto ? 'Registrada al entrar' : 'Añadida a mano')}</div>
                  <div className="text-[11px] text-white/35">Última vez {timeAgo(t.last_seen)}</div>
                </div>
                <button onClick={() => untrust(t.ip)} disabled={busy === t.ip} aria-label={`Quitar ${t.ip}`} className="w-9 h-9 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center cursor-pointer disabled:opacity-50">
                  {busy === t.ip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
        {myIp && !trusted.some((t) => t.ip === myIp) && (
          <form onSubmit={(e) => { e.preventDefault(); trust(); }} className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2">
            <input value={trustLabel} onChange={(e) => setTrustLabel(e.target.value)} placeholder="Nombre (ej. Casa, Oficina, Móvil)" aria-label="Nombre de la IP" className="flex-1 rounded-full border px-4 py-2.5 text-sm outline-none" />
            <button type="submit" disabled={busy === 'trust'} className="px-5 h-10 rounded-full portal-cta text-sm cursor-pointer disabled:opacity-40 inline-flex items-center justify-center gap-2">
              {busy === 'trust' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Añadir mi IP actual ({myIp})
            </button>
          </form>
        )}
      </Panel>

      <Panel title="IPs bloqueadas" delay={80}>
        {blocked.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="w-6 h-6" />} title="Ninguna IP bloqueada" text="Cuando alguien haga algo raro (adivinar claves, buscar rutas de ataque…) se bloqueará solo y aparecerá aquí." />
        ) : (
          <ul className="divide-y divide-white/10 -my-2">
            {blocked.map((b) => (
              <li key={b.ip} className="flex items-center gap-3 py-3">
                <span className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 border border-red-500/25 flex items-center justify-center shrink-0"><Ban className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-mono font-medium">{b.ip}</div>
                  <div className="text-xs text-white/50 truncate">{b.reason}</div>
                  <div className="text-[11px] text-white/35">{timeAgo(b.blocked_at)} · {until(b)}{b.manual ? ' · manual' : ''}</div>
                </div>
                <button onClick={() => call('DELETE', b.ip)} disabled={busy === b.ip} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full border border-white/15 text-xs hover:border-[var(--portal-line-strong)] disabled:opacity-50 cursor-pointer">
                  {busy === b.ip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />} Desbloquear
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={(e) => { e.preventDefault(); call('POST', newIp.trim(), days === 'forever' ? null : Number(days)); }} className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2">
          <input value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="Bloquear una IP a mano (ej. 203.0.113.7)" aria-label="IP a bloquear" className="flex-1 rounded-full border px-4 py-2.5 text-sm outline-none font-mono" />
          <select value={days} onChange={(e) => setDays(e.target.value)} aria-label="Duración" className="rounded-full border px-4 py-2.5 text-sm outline-none">
            <option value="1">1 día</option>
            <option value="7">7 días</option>
            <option value="30">30 días</option>
            <option value="forever">Para siempre</option>
          </select>
          <button type="submit" disabled={!newIp.trim() || busy === newIp.trim()} className="px-5 h-10 rounded-full portal-cta text-sm disabled:opacity-40 cursor-pointer inline-flex items-center justify-center gap-2"><Ban className="w-4 h-4" /> Bloquear</button>
        </form>
      </Panel>

      <Panel title="Actividad sospechosa · 7 días" delay={140}>
        {byIp.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="w-6 h-6" />} title="Todo tranquilo" text="No hay intentos raros sin bloquear." />
        ) : (
          <ul className="divide-y divide-white/10 -my-2">
            {byIp.map((g) => (
              <li key={g.ip} className="flex items-center gap-3 py-3">
                <span className="w-9 h-9 rounded-xl bg-yellow-400/10 text-yellow-400 border border-yellow-400/25 flex items-center justify-center shrink-0"><ShieldAlert className="w-4 h-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-mono font-medium">{g.ip} <span className="text-white/40 font-sans font-normal">· {g.n} {g.n === 1 ? 'evento' : 'eventos'}</span></div>
                  <div className="text-xs text-white/50 truncate">{[...g.kinds].map((k) => KIND_LABEL[k]).join(', ')}</div>
                  {g.paths.size > 0 && <div className="text-[11px] text-white/35 truncate font-mono">{[...g.paths].slice(0, 3).join('  ')}</div>}
                  <div className="text-[11px] text-white/35">{timeAgo(g.last)}</div>
                </div>
                {g.ip !== myIp && (
                  <button onClick={() => call('POST', g.ip, 30)} disabled={busy === g.ip} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full border border-red-400/30 text-red-400 text-xs hover:bg-red-500/10 disabled:opacity-50 cursor-pointer">
                    {busy === g.ip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Bloquear 30 d
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="text-xs text-white/35">
        Bloqueo automático: 6 claves mal en 15 min (24 h) · rutas de escáner o datos de ataque (30 días) · cuenta de cliente que toca zonas de admin 3 veces (7 días) · demasiadas peticiones (1 h). Las IPs de confianza (y las de <code className="font-mono">SECURITY_ALLOWLIST_IPS</code>) nunca se bloquean.
      </p>
    </Page>
  );
}
