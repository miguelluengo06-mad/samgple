'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { estimateSeconds, type VideoStatus } from '@/lib/videos';
import type { ClientCall, ClientNotice, ClientPage, ClientPreviewData, ClientPurchase, StudioData, StudioRequest, VideoDraft } from './types';

/**
 * Datos y acciones del panel del cliente, compartidos por todas sus páginas (se cargan una vez y se conservan
 * al navegar). Con `preview` (la agencia viendo la cuenta de un cliente) no se llama a ninguna API y las acciones
 * se simulan en memoria.
 */
interface ClientData {
  preview: boolean;
  loading: boolean;
  name: string;
  email: string;
  confirmed: boolean;
  studio: StudioData;
  notices: ClientNotice[];
  purchases: ClientPurchase[];
  calls: ClientCall[];
  unread: number;
  waiting: number;
  inProgress: number;
  busyVideoId: string | null;
  wizard: { open: boolean; avatarId?: string };
  openWizard: (avatarId?: string) => void;
  closeWizard: () => void;
  submitVideo: (d: VideoDraft) => Promise<string | null>;
  videoAction: (id: string, action: 'approve' | 'changes' | 'cancel', feedback?: string) => Promise<string | null>;
  markNoticeRead: (n: ClientNotice) => void;
  sendSupport: (subject: string, message: string) => Promise<{ ok: boolean; text: string }>;
  toast: string | null;
  flash: (t: string) => void;
}

const EMPTY_STUDIO: StudioData = { balance: 0, granted: 0, requests: [], avatars: [] };
const Ctx = createContext<ClientData | null>(null);

export function useClient(): ClientData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useClient debe usarse dentro de ClientProvider');
  return v;
}

export function ClientProvider({ preview, children }: { preview?: ClientPreviewData; children: React.ReactNode }) {
  const { user, session } = useAuth();
  const token = preview ? undefined : session?.access_token;

  const [loading, setLoading] = useState(!preview);
  const [studio, setStudio] = useState<StudioData>(preview?.studio ?? EMPTY_STUDIO);
  const [notices, setNotices] = useState<ClientNotice[]>(preview?.notices ?? []);
  const [purchases, setPurchases] = useState<ClientPurchase[]>(preview?.purchases ?? []);
  const [calls, setCalls] = useState<ClientCall[]>(preview?.calls ?? []);
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null);
  const [wizard, setWizard] = useState<{ open: boolean; avatarId?: string }>({ open: false });
  const [toast, setToast] = useState<string | null>(null);

  const flash = useCallback((t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 4500);
  }, []);

  const loadVideos = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/account/videos', { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      setStudio({ balance: d.balance || 0, granted: d.granted || 0, requests: d.requests || [], avatars: d.avatars || [], unavailable: d.unavailable });
    } catch {
      setStudio({ ...EMPTY_STUDIO, unavailable: true });
    }
  }, [token]);

  useEffect(() => {
    if (preview || !token) return;
    const headers = { Authorization: `Bearer ${token}` };
    let alive = true;
    Promise.all([
      loadVideos(),
      fetch('/api/account/notices', { headers }).then((r) => (r.ok ? r.json() : { notices: [] })).then((d) => alive && setNotices(d.notices || [])).catch(() => {}),
      fetch('/api/account/purchases', { headers }).then((r) => (r.ok ? r.json() : { purchases: [] })).then((d) => alive && setPurchases(d.purchases || [])).catch(() => {}),
      fetch('/api/account/calls', { headers }).then((r) => (r.ok ? r.json() : { calls: [] })).then((d) => alive && setCalls(d.calls || [])).catch(() => {}),
    ]).finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [preview, token, loadVideos]);

  const submitVideo = useCallback(
    async (draft: VideoDraft): Promise<string | null> => {
      if (preview) {
        const av = studio.avatars.find((a) => a.id === draft.avatarId);
        const req: StudioRequest = {
          id: `preview-${Date.now()}`, avatar_id: draft.avatarId, avatar_name: av?.name || 'Avatar', avatar_image_url: av?.image_url || null, script_notes: draft.scriptNotes,
          est_seconds: estimateSeconds(draft.scriptNotes), product: draft.product || null, tone: draft.tone || null, cta: draft.cta || null, drive_url: draft.driveUrl || null,
          status: 'requested', script_text: null, client_feedback: null, delivery_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        };
        setStudio((s) => ({ ...s, balance: Math.max(0, s.balance - 1), requests: [req, ...s.requests] }));
        setWizard({ open: false });
        flash('Vista previa: así se vería tu pedido enviado.');
        return null;
      }
      const res = await fetch('/api/account/videos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(draft) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return d.error || 'No se pudo enviar el pedido.';
      setWizard({ open: false });
      flash('¡Pedido enviado! Te avisamos en cuanto el guion esté listo.');
      await loadVideos();
      return null;
    },
    [preview, studio.avatars, token, flash, loadVideos]
  );

  const videoAction = useCallback(
    async (id: string, action: 'approve' | 'changes' | 'cancel', feedback?: string): Promise<string | null> => {
      setBusyVideoId(id);
      try {
        if (preview) {
          const next: VideoStatus = action === 'approve' ? 'production' : action === 'changes' ? 'scripting' : 'cancelled';
          setStudio((s) => ({ ...s, balance: action === 'cancel' ? s.balance + 1 : s.balance, requests: s.requests.map((r) => (r.id === id ? { ...r, status: next, client_feedback: action === 'changes' ? feedback || null : r.client_feedback } : r)) }));
          return null;
        }
        const res = await fetch(`/api/account/videos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, feedback }) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) return d.error || 'No se pudo completar.';
        flash(action === 'approve' ? 'Guion aprobado. Nos ponemos con tu vídeo.' : action === 'changes' ? 'Cambios enviados. Te avisamos con el guion nuevo.' : 'Pedido cancelado: el vídeo vuelve a tu saldo.');
        await loadVideos();
        return null;
      } finally {
        setBusyVideoId(null);
      }
    },
    [preview, token, flash, loadVideos]
  );

  const markNoticeRead = useCallback(
    (n: ClientNotice) => {
      if (n.read_at) return;
      setNotices((all) => all.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      if (preview || !token) return; // en la vista previa no se toca nada del cliente
      fetch('/api/account/notices', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ leadId: n.lead_id, noticeId: n.id }) }).catch(() => {});
    },
    [preview, token]
  );

  const sendSupport = useCallback(
    async (subject: string, message: string) => {
      if (preview) return { ok: true, text: 'En la vista previa no se envía nada. El cliente lo mandaría por email.' };
      if (!token) return { ok: false, text: 'Inicia sesión de nuevo.' };
      try {
        const res = await fetch('/api/account/support', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ subject, message }) });
        const data = await res.json().catch(() => ({}));
        return res.ok ? { ok: true, text: 'Mensaje enviado. Te responderemos por email.' } : { ok: false, text: data.error || 'No se pudo enviar el mensaje.' };
      } catch {
        return { ok: false, text: 'No se pudo enviar el mensaje.' };
      }
    },
    [preview, token]
  );

  const value = useMemo<ClientData>(() => {
    const email = preview ? preview.email : (user?.email || '').toLowerCase();
    const name = preview ? preview.name : String(user?.user_metadata?.full_name || '') || email.split('@')[0].split(/[._-]/)[0];
    return {
      preview: !!preview,
      loading,
      name,
      email,
      confirmed: preview ? true : !!user?.email_confirmed_at,
      studio,
      notices,
      purchases,
      calls,
      unread: notices.filter((n) => !n.read_at).length,
      waiting: studio.requests.filter((r) => r.status === 'script_review').length,
      inProgress: studio.requests.filter((r) => r.status !== 'delivered' && r.status !== 'cancelled').length,
      busyVideoId,
      wizard,
      openWizard: (avatarId?: string) => setWizard({ open: true, avatarId }),
      closeWizard: () => setWizard({ open: false }),
      submitVideo,
      videoAction,
      markNoticeRead,
      sendSupport,
      toast,
      flash,
    };
  }, [preview, user, loading, studio, notices, purchases, calls, busyVideoId, wizard, submitVideo, videoAction, markNoticeRead, sendSupport, toast, flash]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Cuántas cosas esperan al cliente en cada página (para los contadores del menú). */
export function useClientBadges(): Partial<Record<ClientPage, number>> {
  const c = useClient();
  return { videos: c.waiting, avisos: c.unread };
}
