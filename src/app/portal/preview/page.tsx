'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { usePortalRoleContext } from '@/app/portal/context';
import { useLeadsContext } from '@/app/portal/leads/context';
import type { Lead } from '@/app/portal/leads/context';
import AccountHome from '@/components/portal/dashboard/AccountHome';
import type { AccountPreview } from '@/components/portal/dashboard/AccountHome';
import { contactKeys } from '@/components/portal/leadMeta';
import type { StudioAvatar, StudioData, StudioRequest } from '@/components/portal/dashboard/VideoStudio';

/** Retrato de ejemplo: degradado con iniciales (no depende de ningún archivo externo). */
const face = (a: string, b: string, letter: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='300' height='400' fill='url(#g)'/><circle cx='150' cy='160' r='62' fill='rgba(255,255,255,.22)'/><path d='M40 400c0-78 50-120 110-120s110 42 110 120z' fill='rgba(255,255,255,.22)'/><text x='150' y='185' text-anchor='middle' font-family='Arial' font-weight='700' font-size='72' fill='white'>${letter}</text></svg>`)}`;

const SAMPLE_AVATARS: StudioAvatar[] = [
  { id: '3f2b8c1e-6a4d-4e0b-9a41-2c8f0b7d5e11', name: 'Lucía', style: 'UGC', gender: 'Mujer', tags: ['belleza', 'cercana'], image_url: face('#ff7a59', '#c13584', 'L'), preview_url: null },
  { id: '3f2b8c1e-6a4d-4e0b-9a41-2c8f0b7d5e12', name: 'Marcos', style: 'Profesional', gender: 'Hombre', tags: ['tecnología', 'serio'], image_url: face('#38e8ff', '#2b5cff', 'M'), preview_url: null },
  { id: '3f2b8c1e-6a4d-4e0b-9a41-2c8f0b7d5e13', name: 'Sofía', style: 'Elegante', gender: 'Mujer', tags: ['moda', 'lujo'], image_url: face('#c8ff3e', '#1f9d55', 'S'), preview_url: null },
  { id: '3f2b8c1e-6a4d-4e0b-9a41-2c8f0b7d5e14', name: 'Dani', style: 'UGC', gender: 'Hombre', tags: ['fitness', 'enérgico'], image_url: face('#ffd34d', '#ff6b00', 'D'), preview_url: null },
  { id: '3f2b8c1e-6a4d-4e0b-9a41-2c8f0b7d5e15', name: 'Carla', style: 'Divertida', gender: 'Mujer', tags: ['gastronomía', 'joven'], image_url: face('#b388ff', '#6a1b9a', 'C'), preview_url: null },
  { id: '3f2b8c1e-6a4d-4e0b-9a41-2c8f0b7d5e16', name: 'Álvaro', style: 'Cercano', gender: 'Hombre', tags: ['inmobiliaria', 'confianza'], image_url: face('#6ee7b7', '#0f766e', 'Á'), preview_url: null },
];

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Datos inventados para ver el diseño aunque todavía no tengas clientes. */
function sample(): AccountPreview {
  const call = new Date(Date.now() + DAY);
  call.setUTCHours(16, 0, 0, 0);
  return {
    name: 'Laura Martín',
    email: 'laura@ejemplo.com',
    sample: true,
    calls: [
      { id: 's-call-1', kind: 'call', call_at: call.toISOString(), status: 'new', created_at: iso(-2 * DAY) },
      { id: 's-call-0', kind: 'call', call_at: iso(-9 * DAY), status: 'contacted', created_at: iso(-12 * DAY) },
    ],
    notices: [
      { lead_id: 's1', id: 's-n1', title: 'Tu guion está listo para revisar', body: 'Ya tienes los guiones preparados. Revísalos y dinos si los apruebas o quieres cambios. No producimos nada hasta tu visto bueno.', created_at: iso(-3 * HOUR), read_at: null },
      { lead_id: 's1', id: 's-n2', title: 'Hemos recibido tu pedido', body: 'Gracias por tu compra. En breve te escribimos para el brief.', created_at: iso(-3 * DAY), read_at: iso(-3 * DAY + HOUR) },
    ],
    purchases: [
      { id: 's-p1', pack_name: 'Anuncios UGC con IA · Escala', items: [], amount_eur: 320, monthly: false, paid_at: iso(-3 * DAY), invoice_url: null },
    ],
    studio: {
      balance: 7,
      granted: 10,
      avatars: SAMPLE_AVATARS,
      requests: [
        { id: 's-v1', avatar_id: SAMPLE_AVATARS[0].id, avatar_name: 'Lucía', avatar_image_url: SAMPLE_AVATARS[0].image_url, script_notes: 'Presentar mi crema hidratante vegana: absorbe en 10 segundos, dura todo el día y tiene envío gratis.', est_seconds: 18, product: 'Crema Aloe · www.ejemplo.com', tone: 'Cercano', cta: 'Compra hoy con envío gratis', drive_url: null, status: 'script_review', script_text: 'Hola, ¿tu piel también se queda tirante a media tarde? Te presento Crema Aloe: vegana, absorbe en diez segundos y te dura todo el día. Y hoy, envío gratis. Pruébala y cuéntame qué tal.', client_feedback: null, delivery_url: null, created_at: iso(-5 * HOUR), updated_at: iso(-1 * HOUR) },
        { id: 's-v2', avatar_id: SAMPLE_AVATARS[3].id, avatar_name: 'Dani', avatar_image_url: SAMPLE_AVATARS[3].image_url, script_notes: 'Anunciar el reto de 30 días de mi gimnasio con primera semana gratis.', est_seconds: 14, product: null, tone: 'Enérgico', cta: null, drive_url: null, status: 'production', script_text: 'Treinta días. Una nueva versión de ti. Primera semana gratis en nuestro gimnasio: ¡apúntate hoy!', client_feedback: null, delivery_url: null, created_at: iso(-2 * DAY), updated_at: iso(-1 * DAY) },
        { id: 's-v3', avatar_id: SAMPLE_AVATARS[2].id, avatar_name: 'Sofía', avatar_image_url: SAMPLE_AVATARS[2].image_url, script_notes: 'Presentar la nueva colección de otoño.', est_seconds: 12, product: null, tone: 'Elegante', cta: null, drive_url: null, status: 'delivered', script_text: 'Otoño llega con tonos tierra y tejidos suaves. Descubre la nueva colección.', client_feedback: null, delivery_url: 'https://example.com/video.mp4', created_at: iso(-6 * DAY), updated_at: iso(-4 * DAY) },
      ],
    },
  };
}

/** Datos reales de un cliente, sacados de las solicitudes que ya tienes cargadas. */
function fromLead(lead: Lead, all: Lead[]): AccountPreview {
  const mine = new Set(contactKeys(lead));
  const related = [lead, ...all.filter((l) => l.id !== lead.id && contactKeys(l).some((k) => mine.has(k)))];
  return {
    name: lead.name,
    email: lead.email || lead.name,
    sample: false,
    calls: related
      .filter((l) => l.kind === 'call' || l.kind === 'proposal')
      .map((l) => ({ id: l.id, kind: l.kind, call_at: l.call_at, status: l.status, created_at: l.created_at })),
    notices: related
      .flatMap((l) => (l.answers?.notices || []).map((n) => ({ lead_id: l.id, id: n.id, title: n.title, body: n.body, created_at: n.created_at, read_at: n.read_at ?? null })))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    purchases: related
      .filter((l) => l.answers?.order && l.answers.order.livemode !== false)
      .map((l) => {
        const o = l.answers!.order!;
        return {
          id: l.id,
          pack_name: o.pack_name,
          items: (o.items || []).map((it) => ({ name: it.name, qty: it.qty, total_eur: it.total_eur })),
          amount_eur: o.amount_eur,
          monthly: o.mode === 'subscription',
          paid_at: o.paid_at,
          invoice_url: null,
        };
      }),
  };
}

export default function PreviewPage() {
  const { session } = useAuth();
  const { role, loading } = usePortalRoleContext();
  const { leads, loading: leadsLoading } = useLeadsContext();
  const router = useRouter();
  const params = useSearchParams();
  const leadId = params?.get('lead');

  useEffect(() => {
    if (!loading && role !== 'agency') router.replace('/portal');
  }, [role, loading, router]);

  const base = useMemo(() => {
    const lead = leadId ? leads.find((l) => l.id === leadId) : undefined;
    return lead ? fromLead(lead, leads) : sample();
  }, [leadId, leads]);

  // Con un cliente real, el estudio de vídeos se rellena con sus pedidos y su saldo de verdad
  const [studio, setStudio] = useState<StudioData | null>(base.sample ? base.studio ?? null : null);
  const token = session?.access_token;
  useEffect(() => {
    if (base.sample) {
      setStudio(base.studio ?? null);
      return;
    }
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([fetch('/api/videos', { headers }).then((r) => r.json()), fetch('/api/avatars', { headers }).then((r) => r.json())])
      .then(([v, a]) => {
        const email = base.email.toLowerCase();
        const mine = ((v.requests || []) as (StudioRequest & { customer_email: string })[]).filter((r) => r.customer_email === email);
        const balance = Number(v.balances?.[email] || 0);
        const avatars = ((a.avatars || []) as (StudioAvatar & { active: boolean })[]).filter((x) => x.active);
        setStudio({ balance, granted: Math.max(balance, balance + mine.filter((r) => r.status !== 'cancelled').length), requests: mine, avatars, unavailable: !!(v.setup || a.setup) });
      })
      .catch(() => setStudio({ balance: 0, granted: 0, requests: [], avatars: [], unavailable: true }));
  }, [base, token]);

  if (role !== 'agency' || leadsLoading || !studio) return <div className="flex-1" />;
  return <AccountHome key={base.email} preview={{ ...base, studio }} />;
}
