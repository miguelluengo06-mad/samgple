import Link from 'next/link';
import SiteFooter from '@/components/home/SiteFooter';
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Business name and featured products come from the database and can change
// any time via the dashboard — never prerender this page statically at build time.
export const dynamic = 'force-dynamic';
import SiteNav from '@/components/home/SiteNav';
import Hero from '@/components/home/Hero';
import Services from '@/components/home/Services';
import VideoExamples from '@/components/home/VideoExamples';
import Pricing from '@/components/home/Pricing';
import PaymentNotice from '@/components/home/PaymentNotice';
import Process from '@/components/home/Process';
import BookCallForm from '@/components/home/BookCallForm';
import { BookCallProvider } from '@/components/home/BookCall';

async function getBranding() {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('business_name, agency_logo_url')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return {
    businessName: data?.business_name || 'samgple',
    logoUrl: data?.agency_logo_url || null,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { businessName } = await getBranding();
  const title = `${businessName} — Vídeos, influencers y anuncios con IA`;
  const description = `${businessName} crea vídeos, influencers y anuncios con IA para negocios y ecommerce: guiones que tú apruebas, listos para TikTok, Reels y tus campañas.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', siteName: businessName, locale: 'es_ES' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function HomePage() {
  const { businessName } = await getBranding();

  return (
    <BookCallProvider businessName={businessName}>
    <div className="home-root min-h-screen relative">

      <SiteNav businessName={businessName} book />

      <PaymentNotice />

      <main id="contenido" className="relative z-[2]">
        <Hero businessName={businessName} />
        <VideoExamples />
        <Services />
        <Pricing />
        <Process />

        {/* Contact */}
        <section id="contacto" className="px-5 md:px-10 py-24 md:py-36">
          <div className="max-w-[1320px] mx-auto grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-12 lg:gap-20">
            <div className="lg:sticky lg:top-28 self-start">
              <span className="kicker">/ 05 · Última escena</span>
              <h2 className="display-md mt-5 mb-6">
                Hablemos de <em>tu vídeo</em>
              </h2>
              <p className="text-white/60 max-w-md leading-relaxed">
                Si te viene bien, reserva una llamada de 30 minutos. Si no, déjanos tus datos y te escribimos:
                la llamada es opcional. ¿Prefieres ver precios cerrados primero? <a href="#precios" className="underline underline-offset-4 decoration-[var(--signal)] hover:text-[var(--signal)]">Consulta nuestros packs</a>.
              </p>
              <p className="text-sm text-white/50 mt-10">
                ¿Ya eres cliente?{' '}
                <Link href="/auth" className="underline underline-offset-4 decoration-[var(--signal)] hover:text-[var(--signal)]">Accede a tu cuenta</Link>
                {' '}para ver tus compras y escribirnos.
              </p>
            </div>
            <div className="home-slab min-w-0 p-5 sm:p-6 md:p-10">
              <BookCallForm businessName={businessName} />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter businessName={businessName} />
    </div>
    </BookCallProvider>
  );
}
