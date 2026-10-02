'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
import { usePortalRole } from '@/components/portal/usePortalRole';
import { BrandedLoadingSpinner } from '@/components/ui/loading-logo';
import { ClientProvider } from '@/components/client/ClientProvider';
import { ClientShell } from '@/components/client/ClientShell';
import { AvatarsPage, CallsPage, HelpPage, HomePage, NoticesPage, PurchasesPage, SettingsPage, VideosPage } from '@/components/client/pages';
import { fromLead, sample } from '@/components/client/previewData';
import { isClientPage, type ClientPage, type ClientPreviewData, type StudioAvatar, type StudioRequest } from '@/components/client/types';
import type { Lead } from '@/app/portal/leads/context';

/**
 * Vista previa para la agencia: el mismo panel que ve un cliente (/cuenta), con datos de ejemplo o con los de un
 * cliente real (?lead=ID). Solo lectura: no se envía ni se cambia nada.
 */
export default function ClientPreviewPage() {
  const { user, session, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = usePortalRole();
  const router = useRouter();
  const params = useSearchParams();
  const leadId = params?.get('lead') || '';
  const pageParam = params?.get('page') || '';
  const active: ClientPage = isClientPage(pageParam) ? pageParam : 'inicio';
  const token = session?.access_token;

  const [data, setData] = useState<ClientPreviewData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth');
  }, [authLoading, user, router]);
  useEffect(() => {
    if (!authLoading && !roleLoading && user && role !== 'agency') router.replace('/cuenta');
  }, [authLoading, roleLoading, user, role, router]);

  // Datos: de ejemplo, o los reales del cliente (solicitudes, pedidos de vídeo y saldo)
  useEffect(() => {
    if (role !== 'agency' || !token) return;
    if (!leadId) {
      setData(sample());
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/leads', { headers }).then((r) => r.json()),
      fetch('/api/videos', { headers }).then((r) => r.json()),
      fetch('/api/avatars', { headers }).then((r) => r.json()),
    ])
      .then(([l, v, a]) => {
        const leads = (l.leads || []) as Lead[];
        const lead = leads.find((x) => x.id === leadId);
        if (!lead) return setData(sample());
        const base = fromLead(lead, leads);
        const email = base.email.toLowerCase();
        const mine = ((v.requests || []) as (StudioRequest & { customer_email: string })[]).filter((r) => r.customer_email === email);
        const balance = Number(v.balances?.[email] || 0);
        const avatars = ((a.avatars || []) as (StudioAvatar & { active: boolean })[]).filter((x) => x.active);
        setData({ ...base, studio: { balance, granted: balance + mine.filter((r) => r.status !== 'cancelled').length, requests: mine, avatars, unavailable: !!(v.setup || a.setup) } });
      })
      .catch(() => setData(sample()));
  }, [role, token, leadId]);

  const hrefFor = useMemo(() => (p: ClientPage) => `/vista-cliente?${leadId ? `lead=${leadId}&` : ''}page=${p}`, [leadId]);

  if (authLoading || roleLoading || !user || role !== 'agency' || !data) return <BrandedLoadingSpinner />;

  const banner = (
    <div className="flex-shrink-0 bg-[var(--signal)] text-black px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
      <span><b>Vista previa de cliente.</b> {data.sample ? 'Datos de ejemplo: así ve su cuenta un cliente.' : `Así ve su cuenta ${data.name}. Solo lectura: no se envía ni se cambia nada.`}</span>
      <Link href="/portal" className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"><ArrowLeft className="w-3.5 h-3.5" /> Volver al panel</Link>
    </div>
  );

  return (
    <ClientProvider key={`${leadId}-${data.email}`} preview={data}>
      <ClientShell active={active} hrefFor={hrefFor} banner={banner}>
        {(() => {
          switch (active) {
            case 'videos': return <VideosPage />;
            case 'avatares': return <AvatarsPage />;
            case 'avisos': return <NoticesPage />;
            case 'compras': return <PurchasesPage />;
            case 'llamadas': return <CallsPage />;
            case 'ayuda': return <HelpPage />;
            case 'ajustes': return <SettingsPage />;
            default: return <HomePage hrefFor={hrefFor} />;
          }
        })()}
      </ClientShell>
    </ClientProvider>
  );
}
