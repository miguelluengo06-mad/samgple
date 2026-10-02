'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthContext';

/** 'agency' = tú y tu equipo; 'free' = cualquier cliente con acceso (solo ve su propia cuenta). */
export type PortalRole = 'agency' | 'free';

export interface PortalRoleInfo {
  role: PortalRole;
  /** Es del equipo, pero esta sesión no entró con passkey: tiene que volver a entrar con él */
  passkeyRequired: boolean;
  loading: boolean;
}

const CACHE_KEY = 'portal-role';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos

function getCache(): Omit<PortalRoleInfo, 'loading'> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return (data?.role === 'agency' || data?.role === 'free') ? { role: data.role, passkeyRequired: !!data.passkeyRequired } : null;
  } catch { return null; }
}

function setCache(data: Omit<PortalRoleInfo, 'loading'>) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

export function usePortalRole(): PortalRoleInfo {
  const { user, session, loading: authLoading } = useAuth();
  const cached = getCache();
  const [info, setInfo] = useState<Omit<PortalRoleInfo, 'loading'>>(() => cached || { role: 'free', passkeyRequired: false });
  const [loading, setLoading] = useState(!cached);

  const detect = useCallback(async () => {
    if (!user || !session?.access_token) return;
    try {
      // El servidor decide quién es la agencia (dueño o equipo): el navegador no puede inventárselo
      const res = await fetch('/api/portal/whoami', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = await res.json().catch(() => ({}));
      const result: Omit<PortalRoleInfo, 'loading'> = { role: data?.isAgency === true ? 'agency' : 'free', passkeyRequired: data?.passkeyRequired === true };
      setInfo(result);
      setCache(result);
    } catch (err) {
      console.error('Portal role detection failed:', err);
    } finally {
      setLoading(false);
    }
  }, [user, session?.access_token]);

  useEffect(() => {
    if (!authLoading && user) detect();
  }, [authLoading, user, detect]);

  return { ...info, loading };
}
