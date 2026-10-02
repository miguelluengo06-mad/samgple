'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { usePortalRoleContext } from '@/app/portal/context';
import { useLeadsContext } from '@/app/portal/leads/context';
import type { Lead } from '@/app/portal/leads/context';
import AccountHome from '@/components/portal/dashboard/AccountHome';
import type { AccountPreview } from '@/components/portal/dashboard/AccountHome';
import { contactKeys } from '@/components/portal/leadMeta';

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
  const { role, loading } = usePortalRoleContext();
  const { leads, loading: leadsLoading } = useLeadsContext();
  const router = useRouter();
  const params = useSearchParams();
  const leadId = params?.get('lead');

  useEffect(() => {
    if (!loading && role !== 'agency') router.replace('/portal');
  }, [role, loading, router]);

  const preview = useMemo(() => {
    const lead = leadId ? leads.find((l) => l.id === leadId) : undefined;
    return lead ? fromLead(lead, leads) : sample();
  }, [leadId, leads]);

  if (role !== 'agency' || leadsLoading) return <div className="flex-1" />;
  return <AccountHome key={preview.email} preview={preview} />;
}
