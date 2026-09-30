'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { LeadsContext, type Lead } from '@/app/portal/leads/context';

const POLL_MS = 45000;

// Module-level cache — survives route navigations within the SPA session
let _leadsCache: Lead[] | null = null;

/**
 * Loads the agency's leads (proposal requests + booked calls) once for the whole admin
 * and keeps them fresh. Every admin page reads from this context instead of fetching.
 */
export default function LeadsProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const { session } = useAuth();
  const [leads, setLeads] = useState<Lead[]>(_leadsCache ?? []);
  const [loading, setLoading] = useState(_leadsCache === null);
  const seenIds = useRef<Set<string> | null>(null);
  const token = session?.access_token;

  const fetchLeads = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/leads', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const next: Lead[] = data.leads || [];

      // Browser notification when a new lead/call shows up while the admin is open.
      // Notification API only — fires while a tab is open, not a push to a closed tab.
      if (seenIds.current && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const fresh = next.filter((l) => !seenIds.current!.has(l.id));
        if (fresh.length > 0) {
          const first = fresh[0];
          new Notification(first.kind === 'call' ? 'Nueva llamada agendada' : 'Nueva solicitud recibida', {
            body: fresh.length > 1 ? `${fresh.length} novedades en tu panel.` : first.name,
            icon: '/favicon-32x32.png',
          });
        }
      }
      seenIds.current = new Set(next.map((l) => l.id));

      _leadsCache = next;
      setLeads(next);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!enabled || !token) return;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    fetchLeads();
    const interval = setInterval(fetchLeads, POLL_MS);
    return () => clearInterval(interval);
  }, [enabled, token, fetchLeads]);

  return <LeadsContext.Provider value={{ leads, loading, refetch: fetchLeads }}>{children}</LeadsContext.Provider>;
}
