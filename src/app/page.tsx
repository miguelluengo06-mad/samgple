import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowUpRight } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Business name and featured products come from the database and can change
// any time via the dashboard — never prerender this page statically at build time.
export const dynamic = 'force-dynamic';
import KineticWordmark from '@/components/home/KineticWordmark';
import Hero from '@/components/home/Hero';
import Services from '@/components/home/Services';
import VideoExamples from '@/components/home/VideoExamples';
import Pricing from '@/components/home/Pricing';
import PaymentNotice from '@/components/home/PaymentNotice';
import WhatsAppButton from '@/components/home/WhatsAppButton';
import CaseStudies from '@/components/home/CaseStudies';
import Process from '@/components/home/Process';
import Testimonials from '@/components/home/Testimonials';
import BookCallForm from '@/components/home/BookCallForm';
import { BookCallProvider, BookCallButton } from '@/components/home/BookCall';

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
  const title = `${businessName} — Contenido y estrategia para marcas`;
  const description = `${businessName} es una agencia de creación de contenido y estrategia de marketing para empresas: vídeo, redes sociales, copy y fotografía con resultados medibles.`;
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

      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <KineticWordmark name={businessName} className="text-xl" />
          </Link>
          <nav className="flex items-center gap-1 md:gap-2">
            <a href="#servicios" className="hidden md:inline-block px-3 py-2 text-sm text-white/60 hover:text-white transition-colors">
              Servicios
            </a>
            <a href="#casos" className="hidden md:inline-block px-3 py-2 text-sm text-white/60 hover:text-white transition-colors">
              Casos
            </a>
            <a href="#ejemplos" className="hidden md:inline-block px-3 py-2 text-sm text-white/60 hover:text-white transition-colors">
              Ejemplos
            </a>
            <a href="#precios" className="hidden md:inline-block px-3 py-2 text-sm text-white/60 hover:text-white transition-colors">
              Precios
            </a>
            <Link href="/auth" className="px-3 py-2 text-sm text-white/60 hover:text-white transition-colors">
              Acceder
            </Link>
            <Link href="/auth?mode=signup" className="hidden sm:inline-block px-3 py-2 text-sm text-white/60 hover:text-white transition-colors">
              Registrarse
            </Link>
            <BookCallButton className="ml-1 px-4 py-2 rounded-full bg-[var(--signal)] text-black text-sm font-medium hover:bg-[var(--signal-dim)] transition-colors whitespace-nowrap">
              Agendar llamada
            </BookCallButton>
          </nav>
        </div>
      </header>

      <PaymentNotice />
      <WhatsAppButton />

      <main className="relative z-[2]">
        <Hero businessName={businessName} />
        <VideoExamples />
        <Services />
        <Pricing />
        <CaseStudies />
        <Process />
        <Testimonials />

        {/* Contact */}
        <section id="contacto" className="px-4 md:px-6 py-24 md:py-32 border-t border-white/10">
          <div className="max-w-4xl mx-auto">
            <span className="text-xs tracking-[0.25em] uppercase text-[var(--signal)]">Hablemos</span>
            <h2 className="font-kinetic font-black uppercase text-4xl md:text-6xl leading-none mt-4 mb-4">
              Agenda tu llamada
            </h2>
            <p className="text-white/50 max-w-lg mb-12">
              Elige un hueco y respóndenos unas preguntas rápidas: en 30 minutos vemos qué necesitas.
              ¿Prefieres ver precios cerrados primero? <a href="#precios" className="text-[var(--signal)] hover:underline">Consulta nuestros packs</a>.
            </p>
            <BookCallForm businessName={businessName} />
            <p className="text-sm text-white/40 mt-12 pt-8 border-t border-white/10">
              ¿Quieres seguir tus llamadas y proyectos?{' '}
              <Link href="/auth?mode=signup" className="text-[var(--signal)] hover:underline">Crea tu cuenta</Link>
              {' '}o{' '}
              <Link href="/auth" className="text-white/70 hover:text-white underline underline-offset-4">accede</Link>.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="home-slab relative z-[2] w-[calc(100%-clamp(20px,5vw,72px))] max-w-[1320px] mx-auto mt-3 mb-4">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <KineticWordmark name={businessName} className="text-lg" />
          <div className="flex items-center gap-6 text-sm text-white/40">
            <span>© {new Date().getFullYear()}</span>
            <a href="#precios" className="hover:text-white transition-colors">Precios</a>
            <Link href="/store" className="hover:text-white transition-colors">Tienda</Link>
            <Link href="/auth?mode=signup" className="hover:text-white transition-colors">Registrarse</Link>
            <Link href="/auth" className="hover:text-white transition-colors inline-flex items-center gap-1">
              Acceso clientes <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
    </BookCallProvider>
  );
}
