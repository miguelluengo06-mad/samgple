'use client';

import { notFound, useParams } from 'next/navigation';
import { AvatarsPage, CallsPage, HelpPage, HomePage, NoticesPage, PurchasesPage, SettingsPage, VideosPage } from '@/components/client/pages';
import { isClientPage, type ClientPage } from '@/components/client/types';

const hrefFor = (p: ClientPage) => (p === 'inicio' ? '/cuenta' : `/cuenta/${p}`);

export default function ClientPageRoute() {
  const params = useParams<{ page?: string[] }>();
  const parts = params?.page ?? [];
  if (parts.length > 1) notFound();
  const slug = parts[0];
  if (slug && !isClientPage(slug)) notFound();

  switch (slug ?? 'inicio') {
    case 'videos': return <VideosPage />;
    case 'avatares': return <AvatarsPage />;
    case 'avisos': return <NoticesPage />;
    case 'compras': return <PurchasesPage />;
    case 'llamadas': return <CallsPage />;
    case 'ayuda': return <HelpPage />;
    case 'ajustes': return <SettingsPage />;
    default: return <HomePage hrefFor={hrefFor} />;
  }
}
