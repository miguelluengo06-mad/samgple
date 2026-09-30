import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { BookCallProvider } from '@/components/home/BookCall';

// The <title> reflects the business name from the database — keep it live, not frozen at build time.
export const dynamic = 'force-dynamic';

async function getBusinessName() {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('business_name')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.business_name || 'samgple';
}

export async function generateMetadata(): Promise<Metadata> {
  const businessName = await getBusinessName();
  const title = `Packages — ${businessName}`;
  const description = `Elige un package de contenido o estrategia de ${businessName} y paga de forma segura online.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', siteName: businessName, locale: 'es_ES' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const businessName = await getBusinessName();
  return <BookCallProvider businessName={businessName}>{children}</BookCallProvider>;
}
